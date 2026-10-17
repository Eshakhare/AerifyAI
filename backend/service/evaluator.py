from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from sqlalchemy.orm import Session

from service.models import (
    ActionOverlapRecord,
    EvaluationPlanRecord,
    InterventionRecord,
)


POLICY_VERSION = "water_suppression_demo_policy_v1"
OVERLAP_POLICY_VERSION = "action_overlap_v1"
METHOD_VERSION_OBSERVED = "observed_diff_in_diff_v2"
METHOD_VERSION_SCENARIO = "scenario_diff_in_diff_v2"


def compute_did_effect(
    action_pre: float,
    action_post: float,
    reference_pre: float,
    reference_post: float,
) -> float:
    """Difference-in-Differences estimator: (A_post - A_pre) - (R_post - R_pre)."""
    return round((action_post - action_pre) - (reference_post - reference_pre), 2)


def compute_bootstrap_interval(effect_ug_m3: float, half_width: float = 8.0) -> dict[str, Any]:
    return {
        "low": round(effect_ug_m3 - half_width, 2),
        "high": round(effect_ug_m3 + half_width, 2),
        "level": 0.95,
        "method": "demo_block_bootstrap_v2",
    }


def evaluate_confounder_gates(
    rain_mm_h: float = 0.0,
    wind_speed_delta_m_s: float = 0.6,
    wind_dir_shift_deg: float = 12.0,
    coverage_ratio: float = 0.92,
    independent_bins: int = 5,
    has_action_overlap: bool = False,
    input_measurement_ids: list[str] | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Evaluates water_suppression_demo_policy_v1 and action_overlap_v1 gates.
    Returns (confounders_list, override_outcome) where override_outcome is
    'confounded', 'inconclusive', or None.
    """
    meas_ids = input_measurement_ids or ["ctx_weather_action_0955"]
    confounders: list[dict[str, Any]] = []
    has_confounded = False
    has_inconclusive = False

    if coverage_ratio < 0.75:
        has_inconclusive = True
        confounders.append(
            {
                "code": "LOW_COVERAGE",
                "state": "TRIGGERED",
                "outcome": "inconclusive",
                "applies_to": "COMPARISON",
                "observed_value": round(coverage_ratio, 2),
                "threshold": 0.75,
                "unit": "ratio",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Observation coverage ratio ({coverage_ratio:.2f}) fell below the 0.75 minimum threshold.",
            }
        )

    if independent_bins < 3:
        has_inconclusive = True
        confounders.append(
            {
                "code": "INSUFFICIENT_BINS",
                "state": "TRIGGERED",
                "outcome": "inconclusive",
                "applies_to": "COMPARISON",
                "observed_value": independent_bins,
                "threshold": 3,
                "unit": "bins",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Only {independent_bins} independent 15-minute bins available (minimum 3 required).",
            }
        )

    if has_action_overlap:
        has_inconclusive = True
        confounders.append(
            {
                "code": "ACTION_OVERLAP",
                "state": "TRIGGERED",
                "outcome": "inconclusive",
                "applies_to": "ACTION_AREA",
                "observed_value": 3,
                "threshold": 0,
                "unit": "bins",
                "policy_version": OVERLAP_POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": "Overlapping active intervention in the same zone contaminated post-action bins; single-action attribution withheld.",
            }
        )

    if rain_mm_h >= 0.5:
        has_confounded = True
        confounders.append(
            {
                "code": "RAIN",
                "state": "TRIGGERED",
                "outcome": "confounded",
                "applies_to": "COMPARISON",
                "observed_value": round(rain_mm_h, 2),
                "threshold": 0.5,
                "unit": "mm/h",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Precipitation ({rain_mm_h:.1f} mm/h) exceeded the 0.5 mm/h washout threshold during the evaluation window.",
            }
        )

    if wind_speed_delta_m_s >= 2.0:
        has_confounded = True
        confounders.append(
            {
                "code": "WIND_SPEED_CHANGE",
                "state": "TRIGGERED",
                "outcome": "confounded",
                "applies_to": "COMPARISON",
                "observed_value": round(wind_speed_delta_m_s, 2),
                "threshold": 2.0,
                "unit": "m/s",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Wind speed shift ({wind_speed_delta_m_s:.1f} m/s) exceeded the 2.0 m/s threshold.",
            }
        )
    elif wind_speed_delta_m_s > 0.3:
        confounders.append(
            {
                "code": "WIND_SPEED_CHANGE",
                "state": "DISCLOSED",
                "outcome": None,
                "applies_to": "COMPARISON",
                "observed_value": round(wind_speed_delta_m_s, 2),
                "threshold": 2.0,
                "unit": "m/s",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Median wind speed changed by {wind_speed_delta_m_s:.1f} m/s between pre and post windows, below the 2 m/s exclusion threshold; disclosed, not adjusted.",
            }
        )

    if wind_dir_shift_deg >= 45.0:
        has_confounded = True
        confounders.append(
            {
                "code": "WIND_DIRECTION_SHIFT",
                "state": "TRIGGERED",
                "outcome": "confounded",
                "applies_to": "COMPARISON",
                "observed_value": round(wind_dir_shift_deg, 1),
                "threshold": 45.0,
                "unit": "degrees",
                "policy_version": POLICY_VERSION,
                "input_measurement_ids": meas_ids,
                "display_text": f"Wind direction shifted by {wind_dir_shift_deg:.0f} deg (>= 45 deg threshold), altering upwind transport.",
            }
        )

    if has_inconclusive:
        return confounders, "inconclusive"
    if has_confounded:
        return confounders, "confounded"
    return confounders, None


def run_checkpoint_evaluations_for_intervention(
    db: Session,
    intervention: InterventionRecord,
    checkpoint_offsets: list[int] | None = None,
    rain_mm_h: float = 0.0,
    wind_speed_delta_m_s: float = 0.6,
    wind_dir_shift_deg: float = 12.0,
) -> list[dict[str, Any]]:
    """
    Computes ObservedEvaluation records across requested checkpoints (+0h, +1h, +3h, +6h, +12h)
    and persists them onto the InterventionRecord.
    """
    offsets = checkpoint_offsets or intervention.checkpoint_offsets_minutes or [0, 60, 180, 360, 720]
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Check if there is an active overlapping intervention in the same action zone
    overlapping = (
        db.query(InterventionRecord)
        .filter(
            InterventionRecord.zone_id == intervention.zone_id,
            InterventionRecord.id != intervention.id,
            InterventionRecord.lifecycle.in_(["action_in_progress", "action_completed", "evaluating", "result_available"]),
        )
        .first()
    )
    has_overlap = overlapping is not None
    if has_overlap:
        overlap_id = f"overlap_{intervention.id}_{overlapping.id}"
        overlap_payload = {
            "id": overlap_id,
            "primary_intervention_id": intervention.id,
            "interfering_intervention_id": overlapping.id,
            "zone_id": intervention.zone_id,
            "overlap_window_start": intervention.action_started_at or now_iso,
            "overlap_window_end": now_iso,
            "spatial_overlap_ratio": 1.0,
            "temporal_overlap_minutes": 45,
            "attribution_contaminated": True,
            "excluded_bin_count": 3,
            "remaining_eligible_bin_count": 2,
            "outcome": "inconclusive",
            "reason_code": "MULTI_ACTION_CONTAMINATION",
        }
        db.merge(
            ActionOverlapRecord(
                id=overlap_id,
                primary_intervention_id=intervention.id,
                payload=overlap_payload,
            )
        )

    confounders, override_outcome = evaluate_confounder_gates(
        rain_mm_h=rain_mm_h,
        wind_speed_delta_m_s=wind_speed_delta_m_s,
        wind_dir_shift_deg=wind_dir_shift_deg,
        coverage_ratio=0.92,
        independent_bins=5,
        has_action_overlap=has_overlap,
        input_measurement_ids=intervention.context_measurement_ids or ["ctx_weather_action_0955"],
    )

    coverage_obj = {
        "state": "current",
        "sample_count": 68,
        "source_count": 2,
        "last_observation_at": now_iso,
        "freshness_seconds": 120,
        "coverage_ratio": 0.92,
    }

    observed_list: list[dict[str, Any]] = []
    for offset in offsets:
        # Realistic physical response curve: water suppression reduces coarse dust (PM10) strongly at 60-180m,
        # while fine particulate (PM2.5) shows little or no measurable change.
        decay = 1.0 if offset in (60, 180) else (0.65 if offset == 360 else (0.35 if offset == 720 else 0.25))

        # 1. PM10_MASS
        a_pre_10, a_post_10 = 182.0, round(182.0 - 28.0 * decay, 1)
        r_pre_10, r_post_10 = 175.0, 171.0
        eff_10 = compute_did_effect(a_pre_10, a_post_10, r_pre_10, r_post_10)
        ci_10 = compute_bootstrap_interval(eff_10, half_width=9.0)
        if override_outcome == "inconclusive":
            status_10 = "inconclusive"
        elif override_outcome == "confounded":
            status_10 = "confounded"
        elif ci_10["high"] < 0:
            status_10 = "observed_improvement_association"
        else:
            status_10 = "no_measurable_change"

        observed_list.append(
            {
                "id": f"obseval_{intervention.id}_pm10_{offset}m",
                "intervention_id": intervention.id,
                "intervention_revision": intervention.revision,
                "evaluation_plan_id": intervention.evaluation_plan_id,
                "metric": "PM10_MASS",
                "checkpoint_offset_minutes": offset,
                "evidence_state": "DIRECTLY_OBSERVED",
                "status": status_10,
                "action_pre_ug_m3": a_pre_10,
                "action_post_ug_m3": a_post_10,
                "reference_pre_ug_m3": r_pre_10,
                "reference_post_ug_m3": r_post_10,
                "effect_ug_m3": eff_10,
                "effect_interval": ci_10,
                "coverage": coverage_obj,
                "method_version": METHOD_VERSION_OBSERVED,
                "input_cutoff_at": now_iso,
                "computed_at": now_iso,
                "confounders": confounders,
                "limitations": [
                    "Before/after comparison against matched reference roads; reports observed association, not guaranteed causal proof."
                ],
            }
        )

        # 2. PM2_5_MASS
        a_pre_25, a_post_25 = 91.0, round(91.0 - 5.0 * decay, 1)
        r_pre_25, r_post_25 = 88.0, 85.0
        eff_25 = compute_did_effect(a_pre_25, a_post_25, r_pre_25, r_post_25)
        ci_25 = compute_bootstrap_interval(eff_25, half_width=7.0)
        if override_outcome == "inconclusive":
            status_25 = "inconclusive"
        elif override_outcome == "confounded":
            status_25 = "confounded"
        elif ci_25["high"] < 0:
            status_25 = "observed_improvement_association"
        else:
            status_25 = "no_measurable_change"

        observed_list.append(
            {
                "id": f"obseval_{intervention.id}_pm25_{offset}m",
                "intervention_id": intervention.id,
                "intervention_revision": intervention.revision,
                "evaluation_plan_id": intervention.evaluation_plan_id,
                "metric": "PM2_5_MASS",
                "checkpoint_offset_minutes": offset,
                "evidence_state": "DIRECTLY_OBSERVED",
                "status": status_25,
                "action_pre_ug_m3": a_pre_25,
                "action_post_ug_m3": a_post_25,
                "reference_pre_ug_m3": r_pre_25,
                "reference_post_ug_m3": r_post_25,
                "effect_ug_m3": eff_25,
                "effect_interval": ci_25,
                "coverage": coverage_obj,
                "method_version": METHOD_VERSION_OBSERVED,
                "input_cutoff_at": now_iso,
                "computed_at": now_iso,
                "confounders": confounders,
                "limitations": [
                    "Fine particulate (PM2.5) has strong regional background transport; water suppression primarily targets coarse resuspended road dust (PM10)."
                ],
            }
        )

    intervention.observed_evaluations = observed_list
    intervention.lifecycle = "result_available"

    db.add(intervention)
    db.commit()
    db.refresh(intervention)
    return observed_list
