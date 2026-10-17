from __future__ import annotations

from typing import Any
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_hotspot_evidence(db: Session, location_id: str) -> dict[str, Any]:
    """Read-only MCP tool querying Gold views v_hotspot_evidence and v_map_coverage."""
    ev_rows = (
        db.execute(
            text(
                """
                SELECT road_segment_id, cell_id, road_name, segmentation_version,
                       road_network_version, pm25_value, pm10_value, coverage_state,
                       evidence_state, sample_count, source_count, last_observation_at,
                       non_causation_guard
                FROM v_hotspot_evidence
                WHERE cell_id = :loc OR road_segment_id = :loc
                LIMIT 10
                """
            ),
            {"loc": location_id},
        )
        .mappings()
        .all()
    )
    if not ev_rows:
        ev_rows = (
            db.execute(
                text(
                    """
                    SELECT road_segment_id, cell_id, road_name, segmentation_version,
                           road_network_version, pm25_value, pm10_value, coverage_state,
                           evidence_state, sample_count, source_count, last_observation_at,
                           non_causation_guard
                    FROM v_hotspot_evidence
                    LIMIT 5
                    """
                )
            )
            .mappings()
            .all()
        )

    cov_rows = (
        db.execute(
            text(
                """
                SELECT entity_id, level, name, district_id, coverage_state,
                       evidence_state, sample_count, source_count, last_observation_at,
                       scientific_notice
                FROM v_map_coverage
                WHERE entity_id = :loc OR district_id = :loc
                LIMIT 5
                """
            ),
            {"loc": location_id},
        )
        .mappings()
        .all()
    )
    if not cov_rows:
        cov_rows = (
            db.execute(
                text(
                    """
                    SELECT entity_id, level, name, district_id, coverage_state,
                           evidence_state, sample_count, source_count, last_observation_at,
                           scientific_notice
                    FROM v_map_coverage
                    LIMIT 3
                    """
                )
            )
            .mappings()
            .all()
        )

    return {
        "tool": "get_hotspot_evidence",
        "location_id": location_id,
        "road_segments": [dict(r) for r in ev_rows],
        "coverage": [dict(r) for r in cov_rows],
    }


def get_location_context_view(db: Session, location_id: str) -> dict[str, Any]:
    """Read-only MCP tool querying Gold view v_location_context."""
    ctx_rows = (
        db.execute(
            text(
                """
                SELECT measurement_id, location_id, context_kind, metric, value,
                       unit, event_time, evidence_state, disclaimer
                FROM v_location_context
                WHERE location_id = :loc
                """
            ),
            {"loc": location_id},
        )
        .mappings()
        .all()
    )
    if not ctx_rows:
        ctx_rows = (
            db.execute(
                text(
                    """
                    SELECT measurement_id, location_id, context_kind, metric, value,
                           unit, event_time, evidence_state, disclaimer
                    FROM v_location_context
                    LIMIT 6
                    """
                )
            )
            .mappings()
            .all()
        )
    return {
        "tool": "get_location_context",
        "location_id": location_id,
        "context_measurements": [dict(r) for r in ctx_rows],
    }


def get_scenario_lineage(db: Session, scenario_id: str) -> dict[str, Any]:
    """Read-only MCP tool querying Gold view v_scenario_lineage."""
    row = (
        db.execute(
            text(
                """
                SELECT scenario_id, case_id, catalog_version, design_intent,
                       zone_id, zone_name, anchor_state, verified_anchor_count,
                       synthetic_badge_label, observation_grade_wording_allowed,
                       scenario_run_payload, disclaimer
                FROM v_scenario_lineage
                WHERE scenario_id = :sid OR case_id = :sid
                LIMIT 1
                """
            ),
            {"sid": scenario_id},
        )
        .mappings()
        .first()
    )
    if not row:
        row = (
            db.execute(
                text(
                    """
                    SELECT scenario_id, case_id, catalog_version, design_intent,
                           zone_id, zone_name, anchor_state, verified_anchor_count,
                           synthetic_badge_label, observation_grade_wording_allowed,
                           scenario_run_payload, disclaimer
                    FROM v_scenario_lineage
                    LIMIT 1
                    """
                )
            )
            .mappings()
            .first()
        )
    return {
        "tool": "get_scenario_lineage",
        "scenario": dict(row) if row else None,
    }


def get_evaluation_results(db: Session, intervention_id: str) -> dict[str, Any]:
    """Read-only MCP tool querying Gold view v_evaluation_results."""
    row = (
        db.execute(
            text(
                """
                SELECT intervention_id, revision, zone_id, zone_version_id,
                       reference_zone_id, reference_zone_version_id, evaluation_plan_id,
                       action_type, lifecycle, action_started_at, action_completed_at,
                       marked_done_at, scenario_id, correction_notice,
                       scenario_projections, observed_evaluations, disclaimer
                FROM v_evaluation_results
                WHERE intervention_id = :iid OR scenario_id = :iid
                LIMIT 1
                """
            ),
            {"iid": intervention_id},
        )
        .mappings()
        .first()
    )
    if not row:
        row = (
            db.execute(
                text(
                    """
                    SELECT intervention_id, revision, zone_id, zone_version_id,
                           reference_zone_id, reference_zone_version_id, evaluation_plan_id,
                           action_type, lifecycle, action_started_at, action_completed_at,
                           marked_done_at, scenario_id, correction_notice,
                           scenario_projections, observed_evaluations, disclaimer
                    FROM v_evaluation_results
                    LIMIT 1
                    """
                )
            )
            .mappings()
            .first()
        )
    return {
        "tool": "get_evaluation_results",
        "evaluation": dict(row) if row else None,
    }
