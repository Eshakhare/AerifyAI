from __future__ import annotations

import json
import sys
from pathlib import Path

_BACKEND_DIR = str(Path(__file__).resolve().parents[1])
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, RefResolver

from service.main import app


client = TestClient(app)

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "architecture" / "contracts" / "domain.schema.json"
DOMAIN_SCHEMA = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _validate_def(def_name: str, instance: dict) -> None:
    subschema = {"$schema": DOMAIN_SCHEMA["$schema"], "$defs": DOMAIN_SCHEMA["$defs"], "$ref": f"#/$defs/{def_name}"}
    validator = Draft202012Validator(subschema)
    validator.validate(instance)


def test_healthz_postgis():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "3." in body["postgis_version"]


def test_session_me_contract():
    resp = client.get("/v1/me")
    assert resp.status_code == 200
    body = resp.json()
    _validate_def("SessionInfo", body)
    assert body["role"] == "PUBLIC"

    resp_off = client.get("/v1/me", headers={"X-Aerify-Role": "OFFICER"})
    assert resp_off.status_code == 200
    body_off = resp_off.json()
    _validate_def("SessionInfo", body_off)
    assert body_off["role"] == "OFFICER"


def test_legends_canonical_schema():
    resp = client.get("/v1/public/legends")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["legends"]) == 3
    for leg in body["legends"]:
        _validate_def("Legend", leg)
        for band in leg["bands"]:
            assert "id" in band
            assert "lower_bound" in band
            assert "upper_bound" in band
            assert "band_id" not in band
            assert "min_value" not in band


def test_nearby_summary_contract():
    resp = client.get("/v1/public/nearby?lat=28.6469&lng=77.3160")
    assert resp.status_code == 200
    body = resp.json()
    _validate_def("NearbySummary", body)


def test_location_context_contract():
    resp = client.get("/v1/public/locations/anand_vihar_demo_node/context")
    assert resp.status_code == 200
    body = resp.json()
    _validate_def("LocationContext", body)


def test_public_intervention_and_scenarios_contract():
    resp = client.get("/v1/public/interventions/int_water_001")
    assert resp.status_code == 200
    body = resp.json()
    _validate_def("PublicInterventionResponse", body)

    # Also test scenario S01-S12 lookup
    for sc in ("S01", "S07", "S11"):
        r_sc = client.get(f"/v1/public/scenarios/{sc}")
        assert r_sc.status_code == 200
        _validate_def("PublicInterventionResponse", r_sc.json())


def test_officer_lifecycle_and_did_evaluator():
    headers = {"X-Aerify-Role": "OFFICER"}
    r_create = client.post(
        "/v1/officer/interventions",
        json={
            "zone_id": "action_zone_anand_vihar_demo",
            "reference_zone_id": "reference_zone_demo_01",
            "type": "water_suppression",
        },
        headers=headers,
    )
    assert r_create.status_code == 200
    created = r_create.json()
    _validate_def("PublicInterventionResponse", created)
    int_id = created["intervention"]["id"]

    r_start = client.post(f"/v1/officer/interventions/{int_id}/start", headers=headers)
    assert r_start.status_code == 200
    assert r_start.json()["intervention"]["lifecycle"] == "action_started"

    r_complete = client.post(
        f"/v1/officer/interventions/{int_id}/complete",
        json={"rain_mm_h": 0.0, "wind_speed_delta_m_s": 0.5, "wind_dir_shift_deg": 10.0},
        headers=headers,
    )
    assert r_complete.status_code == 200
    completed = r_complete.json()
    _validate_def("PublicInterventionResponse", completed)
    assert len(completed["observed_evaluations"]) == 10


def test_vertex_ai_narrative_agents():
    for agent_type, target_id in [
        ("hotspot", "anand_vihar_demo_node"),
        ("simulation", "S01"),
        ("audit", "int_water_001"),
    ]:
        r = client.get(f"/v1/public/narratives/{agent_type}/{target_id}")
        assert r.status_code == 200
        body = r.json()
        assert body["agent_type"] == agent_type
        assert body["model_id"] == "gemini-2.5-flash-lite"
        assert len(body["summary"]) > 15
        assert len(body["evidence_bullets"]) >= 2


def test_cloudsql_auth_login_and_users():
    r_users = client.get("/v1/auth/users")
    assert r_users.status_code == 200
    users = r_users.json()["users"]
    assert len(users) >= 4
    emails = [u["email"] for u in users if u.get("email")]
    assert "esha.khare@mcd.delhi.gov.in" in emails

    r_login = client.post(
        "/v1/auth/login",
        json={"email": "esha.khare@mcd.delhi.gov.in", "requested_role": "OFFICER"},
    )
    assert r_login.status_code == 200
    body = r_login.json()
    assert body["role"] == "OFFICER"
    assert body["auth_mode"] == "FIREBASE"
    assert body["user"]["email"] == "esha.khare@mcd.delhi.gov.in"
    assert "CREATE_DRAFT" in body["capabilities"]


def test_contiguous_city_overview_and_district_rolling_summary():
    r_overview = client.get("/v1/public/city-overview?metric=PM2_5_MASS")
    assert r_overview.status_code == 200
    districts = r_overview.json()
    assert len(districts) == 11
    for d in districts:
        _validate_def("MapAggregate", d)
        assert d["geometry"] is not None
        assert d["geometry"]["type"] in ("Polygon", "MultiPolygon")
        assert d["aqi"] > 0
        assert d["pm25_4h_avg"] > 0
        assert d["pm25_24h_avg"] > 0
        assert d["sample_count_24h"] > 0

    r_summary = client.get("/v1/public/districts/dist_east/summary")
    assert r_summary.status_code == 200
    summary = r_summary.json()
    assert summary["district_id"] == "dist_east"
    assert summary["aqi"] > 0
    assert summary["rolling_4h"]["sample_count"] > 0
    assert summary["rolling_24h"]["sample_count"] > summary["rolling_4h"]["sample_count"]
    assert len(summary["hourly_trend"]) >= 12
    assert len(summary["cpcb_stations"]) >= 2


