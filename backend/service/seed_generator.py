"""Deterministic Seed & Scenario Generator Engine for Aerify AI (Phase 2 & Service 5).

Strictly follows Architecture Revision 0.10 & Schema 0.9:
- Seeds all official fixtures from `architecture/contracts/fixtures/` and `architecture/data/`
- Populates the 11 official Delhi revenue districts, 2-3 km analysis cells, and 250m road segments (`delhi_osm_250m_v1`)
- Generates all 12 catalog cases (S01-S12) from `scenario-catalog.v1.json` with paired `WITHOUT_ACTION` and `WITH_ACTION` branches
- Computes canonical `sha256:` geometry hashes matching `validate_contracts.py`
- Seeds `app_users` for `OFFICER` and `SUPERVISOR` roles
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from service.database import Base, get_engine, get_session_factory
from service.generator_30day_bus import ensure_30day_bus_telemetry, seed_cpcb_stations
from service.gold_views import apply_gold_views_and_grants
from service.models import (
    ActionOverlapRecord,
    AdministrativeArea,
    AnalysisCell,
    AppUser,
    CameraMediaRecord,
    ContextObservationRecord,
    EvaluationPlanRecord,
    FacilityRecord,
    InterventionRecord,
    ObservationRecord,
    RoadSegment,
    RouteVersionRecord,
    ScenarioRunRecord,
    Zone,
    ZoneVersionRecord,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
ARCH_DIR = REPO_ROOT / "architecture"
FIXTURES_DIR = ARCH_DIR / "contracts" / "fixtures"
DELHI_GEOJSON_FILE = Path(__file__).resolve().parent / "data" / "delhi_districts.geojson"


def compute_geometry_hash(geometry_transport: dict[str, Any]) -> str:
    data = geometry_transport["data"]
    ordered = {"type": data["type"], "coordinates": data["coordinates"]}
    compact = json.dumps(ordered, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return "sha256:" + hashlib.sha256(compact).hexdigest()


DISTRICT_BASELINES: dict[str, dict[str, Any]] = {
    "dist_central": {"pm25": 88.0, "pm10": 176.0, "aqi": 192.0, "primary_pollutant": "PM2.5"},
    "dist_east": {"pm25": 135.0, "pm10": 268.0, "aqi": 312.0, "primary_pollutant": "PM2.5"},
    "dist_new_delhi": {"pm25": 58.0, "pm10": 118.0, "aqi": 96.0, "primary_pollutant": "PM10"},
    "dist_north": {"pm25": 104.0, "pm10": 215.0, "aqi": 248.0, "primary_pollutant": "PM2.5"},
    "dist_north_east": {"pm25": 122.0, "pm10": 252.0, "aqi": 302.0, "primary_pollutant": "PM2.5"},
    "dist_north_west": {"pm25": 148.0, "pm10": 295.0, "aqi": 324.0, "primary_pollutant": "PM2.5"},
    "dist_shahdara": {"pm25": 165.0, "pm10": 340.0, "aqi": 355.0, "primary_pollutant": "PM2.5"},
    "dist_south": {"pm25": 75.0, "pm10": 152.0, "aqi": 150.0, "primary_pollutant": "PM2.5"},
    "dist_south_east": {"pm25": 112.0, "pm10": 238.0, "aqi": 274.0, "primary_pollutant": "PM2.5"},
    "dist_south_west": {"pm25": 94.0, "pm10": 195.0, "aqi": 214.0, "primary_pollutant": "PM2.5"},
    "dist_west": {"pm25": 118.0, "pm10": 244.0, "aqi": 292.0, "primary_pollutant": "PM2.5"},
}


def load_contiguous_delhi_districts() -> list[dict[str, Any]]:
    """Load the 11 contiguous Delhi revenue district multi-vertex polygons from delhi_districts.geojson."""
    fc = json.loads(DELHI_GEOJSON_FILE.read_text(encoding="utf-8"))
    districts = []
    for feat in fc["features"]:
        props = feat["properties"]
        did = props["id"]
        base = DISTRICT_BASELINES.get(did, {"pm25": 95.0, "pm10": 195.0, "aqi": 215.0, "primary_pollutant": "PM2.5"})
        districts.append({
            "id": did,
            "name": props["name"],
            "headquarters": props.get("headquarters", props["name"]),
            "pm25": float(props.get("baseline_pm25", base["pm25"])),
            "pm10": float(props.get("baseline_pm10", base["pm10"])),
            "aqi": float(props.get("baseline_aqi", base["aqi"])),
            "primary_pollutant": props.get("primary_pollutant", base["primary_pollutant"]),
            "centroid_lat": float(props["centroid_lat"]),
            "centroid_lng": float(props["centroid_lng"]),
            "coords": feat["geometry"]["coordinates"],
        })
    return districts


DELHI_11_DISTRICTS: list[dict[str, Any]] = load_contiguous_delhi_districts()


def seed_database(db: Session) -> dict[str, int]:
    """Deterministically populate Cloud SQL PostGIS with Schema 0.9 compliant records."""
    # 1. Seed AppUsers (Officer, Supervisor, Demo & Firebase accounts)
    seeded_users = [
        AppUser(
            firebase_uid="demo_officer_uid",
            email="officer@mcd.delhi.gov.in",
            role="OFFICER",
            active=True,
            actor_ref="actor_mcd_officer_01",
            display_name="Delhi Municipal Officer (OFFICER)",
            department="Municipal Corporation of Delhi (MCD)",
        ),
        AppUser(
            firebase_uid="demo_supervisor_uid",
            email="supervisor@dpcc.delhi.gov.in",
            role="SUPERVISOR",
            active=True,
            actor_ref="actor_dpcc_supervisor_01",
            display_name="DPCC Environmental Supervisor (SUPERVISOR)",
            department="Delhi Pollution Control Committee (DPCC)",
        ),
        AppUser(
            firebase_uid="uid_esha_khare_mcd",
            email="esha.khare@mcd.delhi.gov.in",
            role="OFFICER",
            active=True,
            actor_ref="actor_mcd_officer_esha",
            display_name="Esha Khare — MCD Field Officer",
            department="Municipal Corporation of Delhi (MCD)",
        ),
        AppUser(
            firebase_uid="officer@delhi.gov.in",
            email="officer@delhi.gov.in",
            role="OFFICER",
            active=True,
            actor_ref="actor_mcd_officer_02",
            display_name="MCD Field Officer — East Zone",
            department="Municipal Corporation of Delhi (MCD)",
        ),
        AppUser(
            firebase_uid="supervisor@dpcc.delhi.gov.in",
            email="supervisor@dpcc.delhi.gov.in",
            role="SUPERVISOR",
            active=True,
            actor_ref="actor_dpcc_supervisor_02",
            display_name="DPCC Senior Oversight Supervisor",
            department="Delhi Pollution Control Committee (DPCC)",
        ),
        AppUser(
            firebase_uid="demo_public_uid",
            email="citizen@delhi.in",
            role="PUBLIC",
            active=True,
            actor_ref="actor_public_citizen",
            display_name="Public Citizen Viewer",
            department="Citizen Portal",
        ),
    ]
    for u in seeded_users:
        db.merge(u)

    # 2. Seed 11 Contiguous Delhi Revenue Districts, Analysis Cells, and Road Segments
    for d in DELHI_11_DISTRICTS:
        geojson_poly = {"type": "Polygon", "coordinates": d["coords"]}
        db.merge(
            AdministrativeArea(
                id=d["id"],
                name=d["name"],
                parent_id="city_delhi_nct",
                geojson_data=geojson_poly,
                pm25_value=d["pm25"],
                pm10_value=d["pm10"],
                aqi_value=d["aqi"],
                primary_pollutant=d.get("primary_pollutant", "PM2.5"),
            )
        )

        # Create 3 cells per district anchored around the district's centroid
        c0 = [round(d["centroid_lng"] - 0.02, 4), round(d["centroid_lat"] - 0.02, 4)]
        cell_specs = [
            (
                f"cell_{d['id']}_core_01",
                f"{d['name']} Core Analysis Cell",
                d["pm25"],
                d["pm10"],
                "current",
                "DIRECTLY_OBSERVED",
                65,
                2,
                "2026-10-08T09:50:00Z",
                ["observed"],
                [[[c0[0], c0[1]], [c0[0] + 0.03, c0[1]], [c0[0] + 0.03, c0[1] + 0.03], [c0[0], c0[1] + 0.03], [c0[0], c0[1]]]],
            ),
            (
                f"cell_{d['id']}_buffer_02",
                f"{d['name']} Buffer Corridor Cell",
                round(d["pm25"] * 0.88, 1),
                round(d["pm10"] * 0.88, 1),
                "sparse",
                "OBSERVED_NEARBY",
                28,
                1,
                "2026-10-08T09:45:00Z",
                ["observed"],
                [[[c0[0] + 0.03, c0[1]], [c0[0] + 0.06, c0[1]], [c0[0] + 0.06, c0[1] + 0.03], [c0[0] + 0.03, c0[1] + 0.03], [c0[0] + 0.03, c0[1]]]],
            ),
            (
                f"cell_{d['id']}_nodata_03",
                f"{d['name']} Peripheral Rim (No Recent Data)",
                None,
                None,
                "no_data",
                "INSUFFICIENT_EVIDENCE",
                0,
                0,
                None,
                [],
                [[[c0[0], c0[1] + 0.03], [c0[0] + 0.03, c0[1] + 0.03], [c0[0] + 0.03, c0[1] + 0.06], [c0[0], c0[1] + 0.06], [c0[0], c0[1] + 0.03]]],
            ),
        ]
        for cid, cname, cpm25, cpm10, cov_state, ev_state, scount, src_count, last_obs, pmix, ccoords in cell_specs:
            db.merge(
                AnalysisCell(
                    id=cid,
                    district_id=d["id"],
                    name=cname,
                    geojson_data={"type": "Polygon", "coordinates": ccoords},
                    pm25_value=cpm25,
                    pm10_value=cpm10,
                    coverage_state=cov_state,
                    evidence_state=ev_state,
                    sample_count=scount,
                    source_count=src_count,
                    last_observation_at=last_obs,
                    provenance_mix=pmix,
                )
            )

            # Seed 250m road segments for active cells
            if cpm25 is not None:
                db.merge(
                    RoadSegment(
                        id=f"seg_{cid}_arterial_01",
                        cell_id=cid,
                        name=f"{d['name']} Main Arterial (250m)",
                        segmentation_version="delhi_osm_250m_v1",
                        road_network_version="geofabrik_northern_zone_2026_10_10",
                        geojson_data={
                            "type": "LineString",
                            "coordinates": [[ccoords[0][0][0] + 0.005, ccoords[0][0][1] + 0.005], [ccoords[0][0][0] + 0.02, ccoords[0][0][1] + 0.015]],
                        },
                        pm25_value=round(cpm25 * 1.08, 1),
                        pm10_value=round((cpm10 or 180.0) * 1.08, 1),
                        coverage_state="current",
                        evidence_state="DIRECTLY_OBSERVED",
                        sample_count=42,
                        source_count=1,
                        last_observation_at="2026-10-08T09:55:00Z",
                        provenance_mix=["observed"],
                    )
                )

    # 5. Seed Zones & Zone Versions from fixtures
    zone_cat = json.loads((FIXTURES_DIR / "zone-catalog.synthetic.json").read_text(encoding="utf-8"))
    for z in zone_cat:
        db.merge(
            Zone(
                zone_id=z["zone_id"],
                name=z["name"],
                district_id=z["district_id"],
                purposes=z["purposes"],
                latest_zone_version_id=z["latest_zone_version_id"],
                anchor_state=z["anchor_state"],
                verified_anchor_count=z["verified_anchor_count"],
                display_label=z["display_label"],
                observation_grade_wording_allowed=z["observation_grade_wording_allowed"],
                geometry_status=z["geometry_status"],
                flagship_status=z["flagship_status"],
                scenario_case_id=z["scenario_case_id"],
                route_version_ids=z["route_version_ids"],
            )
        )

    # Seed reference zone entity
    db.merge(
        Zone(
            zone_id="reference_zone_demo_01",
            name="Anand Vihar demo reference zone",
            district_id="dist_east",
            purposes=["REFERENCE"],
            latest_zone_version_id="zonev_reference_demo_01_1",
            anchor_state="UNVERIFIED",
            verified_anchor_count=None,
            display_label="Fully synthetic demonstration — no verified observed anchors in this zone",
            observation_grade_wording_allowed=False,
            geometry_status="PLACEHOLDER",
            flagship_status="NOT_FLAGSHIP",
            scenario_case_id=None,
            route_version_ids=[],
        )
    )

    pub_int = json.loads((FIXTURES_DIR / "public-intervention.synthetic.json").read_text(encoding="utf-8"))
    palam_zv = json.loads((FIXTURES_DIR / "zone-version.palam-dwarka.placeholder.json").read_text(encoding="utf-8"))

    for zv in pub_int["zone_versions"] + [palam_zv]:
        db.merge(
            ZoneVersionRecord(
                id=zv["id"],
                zone_id=zv["zone_id"],
                version=zv["version"],
                purpose=zv["purpose"],
                name=zv.get("name", zv["zone_id"]),
                geometry=zv["geometry"],
                geometry_ref=zv.get("geometry_ref"),
                geometry_hash=zv["geometry_hash"],
                source_dataset_id=zv["source_dataset_id"],
                effective_at=zv["effective_at"],
                created_at=zv["created_at"],
            )
        )

    # Ensure every zone in zone_cat has a valid ZoneVersionRecord
    for idx, z in enumerate(zone_cat):
        zvid = z["latest_zone_version_id"]
        if zvid in ("zonev_action_anand_vihar_demo_1", "zonev_action_palam_dwarka_demo_1"):
            continue
        base_lng = 77.10 + (idx * 0.018)
        base_lat = 28.55 + (idx * 0.015)
        geom_transport = {
            "encoding": "geojson",
            "data": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [round(base_lng, 4), round(base_lat, 4)],
                        [round(base_lng + 0.012, 4), round(base_lat, 4)],
                        [round(base_lng + 0.012, 4), round(base_lat + 0.01, 4)],
                        [round(base_lng, 4), round(base_lat + 0.01, 4)],
                        [round(base_lng, 4), round(base_lat, 4)],
                    ]
                ],
            },
        }
        db.merge(
            ZoneVersionRecord(
                id=zvid,
                zone_id=z["zone_id"],
                version=1,
                purpose="ACTION",
                name=z["name"],
                geometry=geom_transport,
                geometry_ref=f"postgis://zone_versions/{zvid}",
                geometry_hash=compute_geometry_hash(geom_transport),
                source_dataset_id="aerify_demo_geography_v1",
                effective_at="2026-10-08T09:30:00Z",
                created_at="2026-10-08T09:30:00Z",
            )
        )

    # 6. Seed RouteVersion
    route_geom = {
        "encoding": "geojson",
        "data": {
            "type": "LineString",
            "coordinates": [[77.309, 28.644], [77.3125, 28.647], [77.316, 28.65]],
        },
    }
    db.merge(
        RouteVersionRecord(
            id="routev_synthetic_corridor_01_1",
            route_id="route_synthetic_corridor_01",
            version=1,
            purpose="SYNTHETIC_CORRIDOR",
            name="Anand Vihar — Patparganj Synthetic Corridor #01",
            geometry=route_geom,
            geometry_ref="postgis://route_versions/routev_synthetic_corridor_01_1",
            geometry_hash=compute_geometry_hash(route_geom),
            source_dataset_id="aerify_demo_geography_v1",
            road_network_version="geofabrik_northern_zone_2026_10_10",
            segmentation_version="delhi_osm_250m_v1",
            matching_method_version="osrm_match_v1",
            device_ids=["iitd_bus_virtual_01", "iitd_bus_virtual_02"],
            effective_at="2026-10-01T00:00:00Z",
            created_at="2026-10-01T00:00:00Z",
        )
    )

    # 7. Seed Observations & LocationContext
    obs_doc = json.loads((FIXTURES_DIR / "observation.synthetic.json").read_text(encoding="utf-8"))
    db.merge(
        ObservationRecord(
            id=obs_doc["id"],
            metric=obs_doc["metric"],
            value=obs_doc["value"],
            unit=obs_doc["unit"],
            event_time=obs_doc["event_time"],
            processed_at=obs_doc["processed_at"],
            evidence_state=obs_doc["evidence_state"],
            payload=obs_doc,
        )
    )

    loc_ctx = json.loads((FIXTURES_DIR / "location-context.synthetic.json").read_text(encoding="utf-8"))
    for arr_key in ("weather", "satellite", "air_quality_model"):
        for m in loc_ctx[arr_key]:
            db.merge(
                ContextObservationRecord(
                    id=m["id"],
                    location_id=loc_ctx["location_id"],
                    context_kind=m["context"]["context_kind"],
                    metric=m["metric"],
                    value=m["value"],
                    unit=m["unit"],
                    event_time=m["event_time"],
                    payload=m,
                )
            )

    for src in loc_ctx["nearby_sources"]:
        db.merge(
            FacilityRecord(
                id=src["id"],
                name=src["name"],
                source_type=src["source_type"],
                lat=28.641,
                lng=77.310,
                distance_m=src["distance_m"],
                bearing_deg=src["bearing_deg"],
                wind_alignment=src["wind_alignment"],
                registry_source_id=src["registry_source_id"],
                satellite_measurement_ids=src["satellite_measurement_ids"],
            )
        )

    # 8. Seed 12 Scenario Runs from scenario-catalog.v1.json & scenario-run.synthetic.json
    s02_run = json.loads((FIXTURES_DIR / "scenario-run.synthetic.json").read_text(encoding="utf-8"))
    scen_catalog = json.loads((ARCH_DIR / "data" / "scenarios" / "scenario-catalog.v1.json").read_text(encoding="utf-8"))

    for c in scen_catalog["cases"]:
        cid = c["case_id"]
        if cid == "S02":
            run_doc = s02_run
        else:
            zone_match = next((z for z in zone_cat if z["scenario_case_id"] == cid), zone_cat[0])
            is_s01 = cid == "S01"
            run_doc = {
                "id": c["scenario_id"],
                "catalog_version": "scenario_catalog_v1",
                "case_id": cid,
                "design_intent": c["design_intent"],
                "scenario_time": f"2026-10-{c['scenario_day']:02d}T10:00:00Z",
                "generated_at": "2026-10-08T09:40:00Z",
                "generator_version": "0.5.0",
                "config_hash": "sha256:" + hashlib.sha256(cid.encode("utf-8")).hexdigest(),
                "seed": 20261000 + int(cid[1:]),
                "anchor_record_ids": [f"iitd_anchor_pm10_{cid.lower()}_001"],
                "context_record_ids": ["ctx_weather_action_0955", "ctx_traffic_action_0945"],
                "route_version_ids": ["routev_synthetic_corridor_01_1"],
                "action_zone_version_id": zone_match["latest_zone_version_id"],
                "reference_zone_version_ids": ["zonev_reference_demo_01_1"],
                "evaluation_plan_id": "evalplan_water_001_v1",
                "generated_metrics": ["PM1_MASS", "PM2_5_MASS", "PM10_MASS"],
                "assumptions": [
                    f"Assumed water-suppression response: peak reduction {c['response']['peak_reduction_fraction']}, onset {c['response']['onset_minutes']} min, half-life {c['response']['half_life_minutes']} min (scenario_catalog_v1, {cid}); an assumption, not an empirical claim.",
                    "Weather and traffic are shared by the WITHOUT_ACTION and WITH_ACTION branches.",
                ],
                "time_alignment": "historical_matched",
                "branches": ["WITHOUT_ACTION", "WITH_ACTION"],
                "clock_mode": "SCENARIO",
                "display_label": (
                    "Fully synthetic demonstration — no verified observed anchors in this zone"
                    if is_s01
                    else "Synthetic demo — based on historical PM observations and contextual models"
                ),
            }
        db.merge(
            ScenarioRunRecord(
                id=run_doc["id"],
                case_id=cid,
                catalog_version=run_doc["catalog_version"],
                design_intent=run_doc["design_intent"],
                payload=run_doc,
            )
        )

    # 9. Seed EvaluationPlan, Interventions, OverlapAssessment, and CameraEvent
    ev_plan = pub_int["evaluation_plan"]
    db.merge(
        EvaluationPlanRecord(
            id=ev_plan["id"],
            version=ev_plan["version"],
            status=ev_plan["status"],
            action_zone_version_id=ev_plan["action_zone_version_id"],
            payload=ev_plan,
        )
    )

    int_doc = pub_int["intervention"]
    db.merge(
        InterventionRecord(
            id=int_doc["id"],
            revision=int_doc["revision"],
            zone_id=int_doc["zone_id"],
            zone_version_id=int_doc["zone_version_id"],
            reference_zone_id=int_doc["reference_zone_id"],
            reference_zone_version_id=int_doc["reference_zone_version_id"],
            evaluation_plan_id=int_doc["evaluation_plan_id"],
            type=int_doc["type"],
            lifecycle=int_doc["lifecycle"],
            proposed_at=int_doc["proposed_at"],
            action_started_at=int_doc["action_started_at"],
            action_completed_at=int_doc["action_completed_at"],
            marked_done_at=int_doc["marked_done_at"],
            timezone=int_doc["timezone"],
            checkpoint_offsets_minutes=int_doc["checkpoint_offsets_minutes"],
            action_confirmation_basis=int_doc["action_confirmation_basis"],
            scenario_id=int_doc["scenario_id"],
            correction_notice=pub_int["correction_notice"],
            disclaimer=pub_int["disclaimer"],
            scenario_projections=pub_int["scenario_projections"],
            observed_evaluations=pub_int["observed_evaluations"],
            context_measurement_ids=pub_int["context_measurement_ids"],
        )
    )

    overlap_doc = json.loads((FIXTURES_DIR / "action-overlap.synthetic.json").read_text(encoding="utf-8"))
    db.merge(
        ActionOverlapRecord(
            id=overlap_doc["id"],
            primary_intervention_id=overlap_doc["primary_intervention_id"],
            payload=overlap_doc,
        )
    )

    cam_doc = json.loads((FIXTURES_DIR / "camera-event.synthetic.json").read_text(encoding="utf-8"))
    db.merge(
        CameraMediaRecord(
            id=cam_doc["id"],
            intervention_id="int_water_001",
            hotspot_id=cam_doc["hotspot_id"],
            payload=cam_doc,
        )
    )

    db.commit()
    return {
        "districts": len(DELHI_11_DISTRICTS),
        "zones": len(zone_cat) + 1,
        "scenarios": len(scen_catalog["cases"]),
    }


def init_and_seed_db() -> dict[str, int]:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"))
        conn.execute(text("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department VARCHAR(128)"))
        conn.execute(text("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE administrative_areas ADD COLUMN IF NOT EXISTS primary_pollutant VARCHAR(32) DEFAULT 'PM2.5'"))
        # Phase 1.4: Drop redundant single-row mock tables
        conn.execute(text("DROP TABLE IF EXISTS runtime_clocks CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS legend_band_sets CASCADE"))
    st_count = seed_cpcb_stations(engine)
    bus_count = ensure_30day_bus_telemetry(engine)
    apply_gold_views_and_grants(engine)
    session_factory = get_session_factory()
    with session_factory() as db:
        counts = seed_database(db)
        counts["cpcb_stations"] = st_count
        counts["mobile_sensor_telemetry"] = bus_count
        return counts


if __name__ == "__main__":
    counts = init_and_seed_db()
    print("Seeded Cloud SQL PostGIS database (aerify_db):", counts)

