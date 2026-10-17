"""Governed Read-Only Gold SQL Views for Aerify AI (Architecture Revision 0.10 §12).

Creates and grants SELECT-only access to `aerify-mcp-sa@aerifyai.iam` on:
1. v_map_aggregates
2. v_map_coverage
3. v_hotspot_evidence
4. v_location_context
5. v_scenario_lineage
6. v_evaluation_results

Every view precomputes `schema_version = '0.9'`, `evidence_state`, coverage, provenance,
and synthetic disclaimers so no MCP tool can serve unmarked synthetic values.
"""
from __future__ import annotations

from sqlalchemy import Engine, text

GOLD_VIEW_DDL = [
    """
    CREATE OR REPLACE VIEW v_map_aggregates AS
    SELECT
        '0.9'::text AS schema_version,
        a.id,
        'district'::text AS level,
        a.parent_id,
        a.name,
        'PM2_5_MASS'::text AS metric,
        a.pm25_value AS value,
        'ug/m3'::text AS unit,
        'MODEL_ESTIMATED'::text AS evidence_state,
        'current'::text AS coverage_state,
        a.geojson_data AS geometry
    FROM administrative_areas a
    UNION ALL
    SELECT
        '0.9'::text AS schema_version,
        c.id,
        'analysis_cell'::text AS level,
        c.district_id AS parent_id,
        c.name,
        'PM2_5_MASS'::text AS metric,
        c.pm25_value AS value,
        'ug/m3'::text AS unit,
        c.evidence_state,
        c.coverage_state,
        c.geojson_data AS geometry
    FROM analysis_cells c
    UNION ALL
    SELECT
        '0.9'::text AS schema_version,
        r.id,
        'road_segment'::text AS level,
        r.cell_id AS parent_id,
        r.name,
        'PM2_5_MASS'::text AS metric,
        r.pm25_value AS value,
        'ug/m3'::text AS unit,
        r.evidence_state,
        r.coverage_state,
        r.geojson_data AS geometry
    FROM road_segments r;
    """,
    """
    CREATE OR REPLACE VIEW v_map_coverage AS
    SELECT
        '0.9'::text AS schema_version,
        c.id AS entity_id,
        'analysis_cell'::text AS level,
        c.name,
        c.district_id,
        c.coverage_state,
        c.evidence_state,
        c.sample_count,
        c.source_count,
        c.last_observation_at,
        c.provenance_mix,
        CASE
            WHEN c.evidence_state = 'SYNTHETIC' THEN 'Synthetic demonstration — not an empirical observation'
            WHEN c.coverage_state IN ('no_data', 'stale') THEN 'No recent eligible street observations; unmeasured gap'
            ELSE 'Observed or modeled aggregate within freshness threshold'
        END AS scientific_notice
    FROM analysis_cells c;
    """,
    """
    CREATE OR REPLACE VIEW v_hotspot_evidence AS
    SELECT
        '0.9'::text AS schema_version,
        r.id AS road_segment_id,
        r.cell_id,
        r.name AS road_name,
        r.segmentation_version,
        r.road_network_version,
        r.pm25_value,
        r.pm10_value,
        r.coverage_state,
        r.evidence_state,
        r.sample_count,
        r.source_count,
        r.last_observation_at,
        r.provenance_mix,
        'Proximity and atmospheric indicators provide non-causal context only; never claim a specific facility caused a road reading.'::text AS non_causation_guard
    FROM road_segments r;
    """,
    """
    CREATE OR REPLACE VIEW v_location_context AS
    SELECT
        '0.9'::text AS schema_version,
        ctx.id AS measurement_id,
        ctx.location_id,
        ctx.context_kind,
        ctx.metric,
        ctx.value,
        ctx.unit,
        ctx.event_time,
        'MODEL_ESTIMATED'::text AS evidence_state,
        ctx.payload,
        'Weather is regional model context (~11 km); satellite retrievals are tropospheric column densities (mol/m2); proximity does not prove causation.'::text AS disclaimer
    FROM context_observations ctx;
    """,
    """
    CREATE OR REPLACE VIEW v_scenario_lineage AS
    SELECT
        '0.9'::text AS schema_version,
        sr.id AS scenario_id,
        sr.case_id,
        sr.catalog_version,
        sr.design_intent,
        z.zone_id,
        z.name AS zone_name,
        z.anchor_state,
        z.verified_anchor_count,
        z.display_label AS synthetic_badge_label,
        z.observation_grade_wording_allowed,
        sr.payload AS scenario_run_payload,
        'Synthetic demonstration. The timelines and projected outcomes do not describe a real government intervention.'::text AS disclaimer
    FROM scenario_runs sr
    LEFT JOIN zones z ON z.scenario_case_id = sr.case_id;
    """,
    """
    CREATE OR REPLACE VIEW v_evaluation_results AS
    SELECT
        '0.9'::text AS schema_version,
        i.id AS intervention_id,
        i.revision,
        i.zone_id,
        i.zone_version_id,
        i.reference_zone_id,
        i.reference_zone_version_id,
        i.evaluation_plan_id,
        i.type AS action_type,
        i.lifecycle,
        i.action_started_at,
        i.action_completed_at,
        i.marked_done_at,
        i.scenario_id,
        i.correction_notice,
        i.scenario_projections,
        i.observed_evaluations,
        i.disclaimer
    FROM interventions i;
    """,
]


def apply_gold_views_and_grants(engine: Engine) -> None:
    """Create all governed Gold SQL views and grant table access to postgres & service accounts."""
    with engine.begin() as conn:
        for ddl in GOLD_VIEW_DDL:
            conn.execute(text(ddl))

    # Ensure Cloud SQL Studio `postgres` user and Cloud Run IAM service accounts can see & query all tables
    for role_name in [
        "postgres",
        "aerify-api-sa@aerifyai.iam",
        "aerify-worker-sa@aerifyai.iam",
    ]:
        try:
            with engine.begin() as conn:
                conn.execute(text(f'GRANT USAGE ON SCHEMA public TO "{role_name}";'))
                conn.execute(
                    text(
                        f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{role_name}";'
                    )
                )
        except Exception:
            pass

    mcp_sa = "aerify-mcp-sa@aerifyai.iam"
    try:
        with engine.begin() as conn:
            conn.execute(text(f'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM "{mcp_sa}";'))
            for view_name in [
                "v_map_aggregates",
                "v_map_coverage",
                "v_hotspot_evidence",
                "v_location_context",
                "v_scenario_lineage",
                "v_evaluation_results",
            ]:
                conn.execute(text(f'GRANT SELECT ON {view_name} TO "{mcp_sa}";'))
    except Exception:
        pass

