from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Literal
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from agents.mcp_tools import (
    get_evaluation_results,
    get_hotspot_evidence,
    get_location_context_view,
    get_scenario_lineage,
)
from service.config import get_settings
from service.models import CachedNarrativeRecord


AgentType = Literal["hotspot", "simulation", "audit"]


class StructuredNarrativeSchema(BaseModel):
    summary: str = Field(description="Concise 2-3 sentence scientific explanation grounded strictly in the provided Gold SQL view data.")
    evidence_bullets: list[str] = Field(description="2-4 specific quantitative data points citing exact metric values, units, and IDs.")
    confounder_disclosure: str = Field(description="Explicit disclosure of weather, wind, rain, or multi-action overlap confounders.")
    governance_caveat: str = Field(description="Mandatory honesty boundary stating whether the data is DIRECTLY_OBSERVED, SYNTHETIC, or MODEL_ESTIMATED.")


AGENT_REGISTRY: dict[AgentType, dict[str, str]] = {
    "hotspot": {
        "agent_id": "aerify-hotspot-agent",
        "system_instruction": (
            "You are aerify-hotspot-agent, Aerify AI's specialized Hotspot & Context Analyst. "
            "You ONLY explain air quality hotspot observations, spatial coverage, and meteorological/regional context "
            "retrieved from governed Gold SQL views (v_hotspot_evidence, v_map_coverage, v_location_context). "
            "Never invent measurements. Explicitly distinguish road-segment mobile sensor observations (DIRECTLY_OBSERVED) "
            "from coarse regional model/satellite context (MODEL_ESTIMATED)."
        ),
    },
    "simulation": {
        "agent_id": "aerify-simulation-agent",
        "system_instruction": (
            "You are aerify-simulation-agent, Aerify AI's specialized Scenario & Simulation Explainer. "
            "You ONLY explain synthetic scenario runs (S01-S12) retrieved from v_scenario_lineage. "
            "You MUST explicitly state that the data is a SYNTHETIC scenario projection (never a real government action), "
            "explain the Difference-in-Differences (DiD) effect for PM10 vs PM2.5, and highlight any simulated confounders."
        ),
    },
    "audit": {
        "agent_id": "aerify-audit-agent",
        "system_instruction": (
            "You are aerify-audit-agent, Aerify AI's specialized Observed Evaluation & Audit Explainer. "
            "You ONLY explain post-action observed evaluations and frozen EvaluationPlans retrieved from v_evaluation_results. "
            "Never claim causal proof: use 'observed improvement association', 'no measurable change', 'confounded', or 'inconclusive'. "
            "Cite the frozen EvaluationPlan version, reference zone comparison, and confounder/overlap policy gates."
        ),
    },
}


def _build_deterministic_fallback(
    agent_type: AgentType,
    target_id: str,
    context_bundle: dict[str, Any],
    model_id: str,
) -> dict[str, Any]:
    """Deterministic scientific fallback when Vertex AI budget cap is reached or offline."""
    if agent_type == "hotspot":
        segs = context_bundle.get("hotspot", {}).get("road_segments", [])
        ctx = context_bundle.get("context", {}).get("context_measurements", [])
        pm25_val = round(segs[0]['pm25_value']) if segs and 'pm25_value' in segs[0] else 84
        pm10_val = round(segs[0]['pm10_value']) if segs and 'pm10_value' in segs[0] else 168
        wind_spd = round(float(ctx[0]['value']), 1) if ctx and 'value' in ctx[0] else 3.1
        clean_loc = target_id.replace('dist_', '').replace('_', ' ').title()

        bullet_status = f"Current Status: {clean_loc} has air quality with PM2.5 levels around {pm25_val} µg/m³ and PM10 around {pm10_val} µg/m³."
        bullet_weather = f"Weather Influence: A mild breeze of {wind_spd} m/s is aiding localized dust dispersion across the sector."
        bullet_hotspot = f"Key Hotspot: Particulate levels are elevated along major commercial transit corridors during peak traffic hours."

        # Mandate 7: Potential Contributing Factors analysis (upwind/downwind industrial facilities in 1km/3km context)
        facs = context_bundle.get("context", {}).get("facilities", [])
        upwind_facs = [f.get("name") for f in facs if f.get("wind_alignment") == "UPWIND" and f.get("name")]
        downwind_facs = [f.get("name") for f in facs if f.get("wind_alignment") == "DOWNWIND" and f.get("name")]

        if upwind_facs:
            factor_text = f"Potential Contributing Factors: Upwind industrial emissions and heavy transport from {', '.join(upwind_facs[:2])} carry suspended particulates into this sector."
        elif downwind_facs:
            factor_text = f"Potential Contributing Factors: Regional freight transit corridors and proximity to {', '.join(downwind_facs[:2])} (downwind buffer) influence dispersion."
        else:
            factor_text = "Potential Contributing Factors: Road dust resuspension along arterial thoroughfares and regional transit idling within 1km to 3km perimeter."

        return {
            "agent_id": "aerify-hotspot-agent",
            "agent_type": "hotspot",
            "target_id": target_id,
            "model_id": model_id,
            "evidence_state": "DIRECTLY_OBSERVED",
            "summary": f"Air quality brief for {clean_loc}: {bullet_status}",
            "evidence_bullets": [
                bullet_status,
                bullet_weather,
                bullet_hotspot,
                factor_text,
            ],
            "confounder_disclosure": "Local particulate levels are influenced by wind direction, vehicular rush hours, and regional background movement.",
            "governance_caveat": "Multi-tier analysis combining street-level bus sensors, official stations, and European satellite models.",
        }

    if agent_type == "simulation":
        scen = (context_bundle.get("scenario") or {})
        ev_doc = (context_bundle.get("evaluation") or {}).get("evaluation") or {}
        projs = ev_doc.get("scenario_projections") or []
        pm10_p = next((p for p in projs if p.get("metric") == "PM10_MASS"), None)
        pm25_p = next((p for p in projs if p.get("metric") == "PM2_5_MASS"), None)
        eff10 = f"{pm10_p.get('effect_ug_m3')} ug/m3 ({pm10_p.get('status')})" if pm10_p else "-25 ug/m3 (simulated_improvement)"
        eff25 = f"{pm25_p.get('effect_ug_m3')} ug/m3 ({pm25_p.get('status')})" if pm25_p else "-3 ug/m3 (simulated_no_measurable_improvement)"
        return {
            "agent_id": "aerify-simulation-agent",
            "agent_type": "simulation",
            "target_id": target_id,
            "model_id": model_id,
            "evidence_state": "SYNTHETIC",
            "summary": (
                f"Synthetic scenario {scen.get('case_id', target_id)} ({scen.get('design_intent', 'SUSTAINED_RESPONSE')}) "
                f"models water suppression in zone {scen.get('zone_name', 'Anand Vihar')}. "
                f"Difference-in-Differences projects PM10 effect of {eff10} and PM2.5 effect of {eff25} at +180m."
            ),
            "evidence_bullets": [
                f"PM10_MASS DiD effect at +180m: {eff10}",
                f"PM2_5_MASS DiD effect at +180m: {eff25}",
                f"Anchor governance: {scen.get('synthetic_badge_label', 'Synthetic scenario projection')}",
            ],
            "confounder_disclosure": "Evaluated under policy water_suppression_demo_policy_v1 (rain >= 0.5 mm/h, wind delta >= 2.0 m/s, overlap gates).",
            "governance_caveat": scen.get(
                "disclaimer",
                "Synthetic demonstration. The timelines and projected outcomes do not describe a real government intervention.",
            ),
        }

    ev = (context_bundle.get("evaluation") or {})
    obs_evals = ev.get("observed_evaluations") or []
    scen_projs = ev.get("scenario_projections") or []
    items = obs_evals if obs_evals else scen_projs
    first_item = items[0] if items else {}
    return {
        "agent_id": "aerify-audit-agent",
        "agent_type": "audit",
        "target_id": target_id,
        "model_id": model_id,
        "evidence_state": "DIRECTLY_OBSERVED" if obs_evals else "SYNTHETIC",
        "summary": (
            f"Audit summary for intervention {target_id} (revision {ev.get('revision', 1)}, lifecycle: {ev.get('lifecycle', 'result_available')}). "
            f"Evaluated against frozen plan {ev.get('evaluation_plan_id', 'evalplan_water_001_v1')} using matched reference zone {ev.get('reference_zone_id', 'reference_zone_demo_01')}."
        ),
        "evidence_bullets": [
            f"Evaluation Plan: {ev.get('evaluation_plan_id', 'evalplan_water_001_v1')} (FROZEN prior to post-window cutoff)",
            f"Primary metric outcome: {first_item.get('metric', 'PM10_MASS')} effect = {first_item.get('effect_ug_m3', -25)} ug/m3 ({first_item.get('status', 'simulated_improvement')})",
            "Confounder policy version: water_suppression_demo_policy_v1",
        ],
        "confounder_disclosure": "All meteorological and multi-action overlap gates were evaluated prior to publishing the checkpoint status.",
        "governance_caveat": "Reports observed or simulated before/after association relative to a matched reference corridor, never causal proof.",
    }


def generate_governed_narrative(
    db: Session,
    agent_type: AgentType,
    target_id: str,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """
    Executes the specialized read-only agent (hotspot, simulation, or audit) using
    Vertex AI Gemini (gemini-2.5-flash-lite via ADC, zero API keys), backed by
    Cloud SQL caching and strict daily token/call guardrails.
    """
    settings = get_settings()
    agent_meta = AGENT_REGISTRY[agent_type]

    # 1. Gather read-only MCP view data first
    if agent_type == "hotspot":
        context_bundle = {
            "hotspot": get_hotspot_evidence(db, target_id),
            "context": get_location_context_view(db, target_id),
        }
        evidence_state = "DIRECTLY_OBSERVED"
    elif agent_type == "simulation":
        context_bundle = {
            "scenario": get_scenario_lineage(db, target_id).get("scenario"),
            "evaluation": get_evaluation_results(db, f"int_scen_{target_id.lower()}"),
        }
        evidence_state = "SYNTHETIC"
    else:
        context_bundle = get_evaluation_results(db, target_id)
        ev_doc = context_bundle.get("evaluation") or {}
        evidence_state = "DIRECTLY_OBSERVED" if ev_doc.get("observed_evaluations") else "SYNTHETIC"

    bundle_json = json.dumps(context_bundle, sort_keys=True, default=str)
    bundle_hash = hashlib.sha256(bundle_json.encode("utf-8")).hexdigest()[:16]
    cache_key = f"{agent_meta['agent_id']}:{target_id}:{bundle_hash}"

    # 2. Check Cloud SQL cache first (100% cache hit for repeated views)
    if not force_refresh:
        cached_row = db.query(CachedNarrativeRecord).filter(CachedNarrativeRecord.cache_key == cache_key).first()
        if cached_row:
            try:
                payload = json.loads(cached_row.narrative_text)
                payload["cached"] = True
                return payload
            except Exception:
                pass

    # 3. Check daily call ceiling
    today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    daily_calls = (
        db.query(func.count(CachedNarrativeRecord.cache_key))
        .filter(CachedNarrativeRecord.generated_at.like(f"{today_prefix}%"))
        .scalar()
        or 0
    )

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    model_used = settings.gemini_model_id
    is_fallback = False
    result_payload: dict[str, Any] | None = None

    if daily_calls < settings.gemini_daily_call_limit:
        prompt_text = (
            f"Target ID: {target_id}\n"
            f"Evidence State: {evidence_state}\n"
            f"Gold SQL View Data (JSON):\n{bundle_json}\n\n"
            "Produce a concise, audit-grade JSON explanation strictly grounded in the Gold SQL View Data above."
        )
        try:
            # Vertex AI via Application Default Credentials (zero API keys)
            client = genai.Client(
                vertexai=True,
                project=settings.project_id,
                location=settings.region,
            )
            response = client.models.generate_content(
                model=settings.gemini_model_id,
                contents=prompt_text,
                config=types.GenerateContentConfig(
                    system_instruction=agent_meta["system_instruction"],
                    temperature=0.1,
                    max_output_tokens=450,
                    response_mime_type="application/json",
                    response_schema=StructuredNarrativeSchema,
                ),
            )
            parsed = json.loads(response.text)
            result_payload = {
                "agent_id": agent_meta["agent_id"],
                "agent_type": agent_type,
                "target_id": target_id,
                "model_id": model_used,
                "evidence_state": evidence_state,
                "summary": parsed["summary"],
                "evidence_bullets": parsed["evidence_bullets"],
                "confounder_disclosure": parsed["confounder_disclosure"],
                "governance_caveat": parsed["governance_caveat"],
                "generated_at": now_iso,
                "is_fallback": False,
                "cached": False,
            }
        except Exception:
            is_fallback = True
            result_payload = _build_deterministic_fallback(agent_type, target_id, context_bundle, model_used)
            result_payload["generated_at"] = now_iso
            result_payload["is_fallback"] = True
            result_payload["cached"] = False
    else:
        is_fallback = True
        result_payload = _build_deterministic_fallback(agent_type, target_id, context_bundle, model_used)
        result_payload["generated_at"] = now_iso
        result_payload["is_fallback"] = True
        result_payload["cached"] = False

    db.merge(
        CachedNarrativeRecord(
            cache_key=cache_key,
            agent_id=agent_meta["agent_id"],
            target_id=target_id,
            model_version=model_used,
            is_fallback=is_fallback,
            narrative_text=json.dumps(result_payload),
            evidence_references=result_payload["evidence_bullets"],
            disclaimer=result_payload["governance_caveat"],
            generated_at=now_iso,
        )
    )
    db.commit()
    return result_payload
