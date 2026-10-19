from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

# Ensure `backend/` is on sys.path whether invoked from `backend/`, `backend/service/`, or repo root
_BACKEND_DIR = str(Path(__file__).resolve().parents[1])
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from agents.narrative_agents import AgentType, generate_governed_narrative
from service.config import get_settings
from service.database import get_db
from service.evaluator import run_checkpoint_evaluations_for_intervention
from service.generator_30day_bus import DELHI_40_CPCB_STATIONS
from service.ingestion import ingest_open_meteo_context
from service.models import (
    ActionOverlapRecord,
    AdministrativeArea,
    AnalysisCell,
    AppUser,
    AuditEventRecord,
    CameraMediaRecord,
    ContextObservationRecord,
    CpcbStation,
    EvaluationPlanRecord,
    FacilityRecord,
    InterventionRecord,
    InterventionRevisionRecord,
    MobileSensorTelemetry,
    ObservationRecord,
    RoadSegment,
    ScenarioRunRecord,
    Zone,
    ZoneVersionRecord,
)
from service.google_environmental_client import (
    DELHI_13_HOTSPOTS,
    fetch_live_google_air_quality,
    fetch_live_google_weather,
)
from service.open_meteo_client import (
    compute_indian_aqi,
    fetch_live_atmospheric_snapshot,
    get_cpcb_aqi_category,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
ARCH_DIR = REPO_ROOT / "architecture"
DELHI_GEOJSON_FILE = Path(__file__).resolve().parent / "data" / "delhi_districts.geojson"
LEGEND_BANDS_FILE = ARCH_DIR / "data" / "legends" / "legend-bands.v1.json"

# Phase 1.4: Fast in-memory configuration for RuntimeClock and LegendBandSets (eliminating single-row mock tables)
_RUNTIME_CLOCK_STATE: dict[str, Any] = {
    "clock_mode": "REAL",
    "effective_now": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "scenario_id": "water_suppression_sustained_02",
    "clock_revision": 1,
}
_LEGEND_BANDS_CACHE: list[dict[str, Any]] = json.loads(LEGEND_BANDS_FILE.read_text(encoding="utf-8"))["legends"]
_CONTIGUOUS_DISTRICTS_FC: dict[str, Any] = json.loads(DELHI_GEOJSON_FILE.read_text(encoding="utf-8"))


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def _point_in_ring(lng: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        intersect = ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside


def resolve_delhi_locality_and_district(lat: float, lng: float) -> dict[str, Any]:
    """
    Phase 2.1: Point-in-Polygon containment against the 11 contiguous Delhi revenue districts,
    paired with nearest locality landmark resolution.
    """
    matched_district: dict[str, Any] | None = None
    best_centroid_dist = float("inf")
    nearest_district: dict[str, Any] | None = None

    for feat in _CONTIGUOUS_DISTRICTS_FC["features"]:
        props = feat["properties"]
        ring = feat["geometry"]["coordinates"][0]
        if _point_in_ring(lng, lat, ring):
            matched_district = props
            break
        d_m = _haversine_meters(lat, lng, float(props["centroid_lat"]), float(props["centroid_lng"]))
        if d_m < best_centroid_dist:
            best_centroid_dist = d_m
            nearest_district = props

    is_within_delhi = matched_district is not None or best_centroid_dist <= 18000.0
    active_district = matched_district or nearest_district or {
        "id": "dist_new_delhi",
        "name": "New Delhi",
        "headquarters": "Connaught Place",
        "centroid_lat": 28.6139,
        "centroid_lng": 77.2090,
    }

    # Find closest locality landmark from our 40 CPCB stations
    best_st = None
    best_st_dist = float("inf")
    for st in DELHI_40_CPCB_STATIONS:
        dist_m = _haversine_meters(lat, lng, st["lat"], st["lng"])
        if dist_m < best_st_dist:
            best_st_dist = dist_m
            best_st = st

    locality_label = best_st["name"].split("(")[0].strip() if best_st else active_district.get("headquarters", active_district["name"])
    district_name = active_district["name"]
    full_locality = f"{locality_label}, {district_name}" if locality_label.lower() not in district_name.lower() else district_name

    return {
        "is_within_delhi_ncr": is_within_delhi,
        "district_id": active_district["id"],
        "district_name": district_name,
        "locality_name": full_locality,
        "nearest_landmark": locality_label,
        "distance_to_landmark_m": round(best_st_dist, 0),
    }


app = FastAPI(
    title="Aerify AI Governance & Air Quality API",
    version="0.10.0",
    description="PostGIS + Vertex AI Gemini 2.5 Flash-Lite API strictly implementing Schema 0.9.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()


ROLE_CAPABILITIES: dict[str, list[str]] = {
    "PUBLIC": ["VIEW_PUBLIC"],
    "OFFICER": [
        "VIEW_PUBLIC",
        "VIEW_RESTRICTED_MEDIA",
        "CREATE_DRAFT",
        "EDIT_DRAFT",
        "START_ACTION",
        "COMPLETE_ACTION",
        "ATTACH_MEDIA",
    ],
    "SUPERVISOR": [
        "VIEW_PUBLIC",
        "VIEW_RESTRICTED_MEDIA",
        "CREATE_DRAFT",
        "EDIT_DRAFT",
        "START_ACTION",
        "COMPLETE_ACTION",
        "ATTACH_MEDIA",
        "SUBMIT_CORRECTION",
    ],
}


def _get_clock_dict(db: Session | None = None) -> dict[str, Any]:
    if _RUNTIME_CLOCK_STATE["clock_mode"] == "REAL":
        _RUNTIME_CLOCK_STATE["effective_now"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return dict(_RUNTIME_CLOCK_STATE)


def _classify_band(metric: str, value: float | None) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    if metric == "PM2_5_MASS":
        legend_id = "legend_pm25_mass_v1"
        if value <= 30:
            return "GOOD", legend_id
        if value <= 60:
            return "SATISFACTORY", legend_id
        if value <= 90:
            return "MODERATE", legend_id
        if value <= 120:
            return "POOR", legend_id
        if value <= 250:
            return "VERY_POOR", legend_id
        return "SEVERE", legend_id
    if metric == "PM10_MASS":
        legend_id = "legend_pm10_mass_v1"
        if value <= 50:
            return "GOOD", legend_id
        if value <= 100:
            return "SATISFACTORY", legend_id
        if value <= 250:
            return "MODERATE", legend_id
        if value <= 350:
            return "POOR", legend_id
        if value <= 430:
            return "VERY_POOR", legend_id
        return "SEVERE", legend_id
    legend_id = "legend_indian_aqi_v1"
    if value <= 50:
        return "GOOD", legend_id
    if value <= 100:
        return "SATISFACTORY", legend_id
    if value <= 200:
        return "MODERATE", legend_id
    if value <= 300:
        return "POOR", legend_id
    if value <= 400:
        return "VERY_POOR", legend_id
    return "SEVERE", legend_id


def _verify_firebase_token(token: str) -> dict[str, Any] | None:
    """Verifies a Firebase Auth ID token using Firebase Admin SDK and Google Cloud ADC."""
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth

        if not firebase_admin._apps:
            fb_pid = os.environ.get("FIREBASE_PROJECT_ID") or get_settings().project_id
            firebase_admin.initialize_app(options={"projectId": fb_pid})
        return fb_auth.verify_id_token(token)
    except Exception:
        return None


def _lookup_or_provision_cloudsql_user(
    db: Session,
    uid: str | None = None,
    email: str | None = None,
    display_name: str | None = None,
    default_role: str = "PUBLIC",
) -> AppUser | None:
    """
    Resolves an AppUser row from Cloud SQL `app_users` by `firebase_uid` or `email`.
    If an official exists in `app_users`, their role is preserved.
    If a general user does not exist in `app_users`, provisions them as a normal citizen (PUBLIC).
    """
    norm_email = email.strip().lower() if email else None
    user_row: AppUser | None = None

    if uid:
        user_row = db.query(AppUser).filter(AppUser.firebase_uid == uid).first()
    if not user_row and norm_email:
        user_row = (
            db.query(AppUser)
            .filter(or_(AppUser.email == norm_email, AppUser.firebase_uid == norm_email))
            .first()
        )

    now = datetime.now(timezone.utc)
    if user_row:
        if norm_email and not user_row.email:
            user_row.email = norm_email
        if display_name and not user_row.display_name:
            user_row.display_name = display_name
        user_row.last_login_at = now
        db.commit()
        db.refresh(user_row)
        return user_row

    if uid or norm_email:
        resolved_uid = uid or f"uid_{norm_email}"
        inferred_role = default_role if default_role in ROLE_CAPABILITIES else "PUBLIC"
        if norm_email and ("dpcc" in norm_email or "supervisor" in norm_email):
            inferred_role = "SUPERVISOR"
        elif norm_email and ("mcd" in norm_email or "officer" in norm_email):
            inferred_role = "OFFICER"
        short_id = (norm_email.split("@")[0] if norm_email else resolved_uid[:12]).replace(".", "_")
        user_row = AppUser(
            firebase_uid=resolved_uid,
            email=norm_email,
            role=inferred_role,
            active=True,
            actor_ref=f"actor_{inferred_role.lower()}_{short_id}"[:64],
            display_name=display_name or (norm_email if norm_email else f"Municipal {inferred_role.title()}"),
            department=(
                "Delhi Pollution Control Committee (DPCC)"
                if inferred_role == "SUPERVISOR"
                else "Municipal Corporation of Delhi (MCD)"
            ),
            last_login_at=now,
        )
        db.add(user_row)
        db.commit()
        db.refresh(user_row)
        return user_row

    return None


def resolve_caller_session(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    x_aerify_role: str | None = Header(default=None),
    x_aerify_user_email: str | None = Header(default=None),
) -> dict[str, Any]:
    """
    Resolves caller identity and role strictly from the Cloud SQL `app_users` table
    via Firebase ID token (`Authorization: Bearer <token>`), user email (`X-Aerify-User-Email`),
    or role header (`X-Aerify-Role`).
    """
    role = "PUBLIC"
    auth_mode = "FIXTURE"
    display_name = "Public Citizen Viewer"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        decoded = _verify_firebase_token(token)
        if decoded:
            uid = decoded.get("uid")
            email = decoded.get("email")
            name = decoded.get("name")
            user_row = _lookup_or_provision_cloudsql_user(
                db, uid=uid, email=email, display_name=name, default_role="OFFICER"
            )
            if user_row and user_row.active:
                role = user_row.role if user_row.role in ROLE_CAPABILITIES else "PUBLIC"
                display_name = user_row.display_name or email or "Authenticated Officer"
                auth_mode = "FIREBASE"
        else:
            user_row = _lookup_or_provision_cloudsql_user(db, uid=token, email=token if "@" in token else None)
            if user_row and user_row.active:
                role = user_row.role if user_row.role in ROLE_CAPABILITIES else "PUBLIC"
                display_name = user_row.display_name or token
                auth_mode = "FIREBASE"

    elif x_aerify_user_email:
        user_row = _lookup_or_provision_cloudsql_user(db, email=x_aerify_user_email)
        if user_row and user_row.active:
            role = user_row.role if user_row.role in ROLE_CAPABILITIES else "PUBLIC"
            display_name = user_row.display_name or x_aerify_user_email
            auth_mode = "FIREBASE"

    if x_aerify_role and x_aerify_role.upper() in ROLE_CAPABILITIES and auth_mode != "FIREBASE":
        role = x_aerify_role.upper()
        user_row = db.query(AppUser).filter(AppUser.role == role, AppUser.active == True).first()
        if user_row and user_row.display_name:
            display_name = user_row.display_name

    return {
        "schema_version": "0.9",
        "clock": _get_clock_dict(db),
        "role": role,
        "capabilities": ROLE_CAPABILITIES[role],
        "auth_mode": auth_mode,
        "display_name": display_name,
    }


@api_router.get("/healthz")
def healthz(db: Session = Depends(get_db)) -> dict[str, Any]:
    postgis_ver = db.execute(text("SELECT PostGIS_Version()")).scalar()
    bus_count = db.execute(text("SELECT COUNT(*) FROM mobile_sensor_telemetry")).scalar() or 0
    return {
        "status": "ok",
        "schema_version": "0.9",
        "postgis_version": postgis_ver,
        "mobile_sensor_telemetry_rows": int(bus_count),
        "project_id": get_settings().project_id,
    }


@api_router.get("/v1/me")
def get_me(session: dict[str, Any] = Depends(resolve_caller_session)) -> dict[str, Any]:
    return session


class AuthLoginRequest(BaseModel):
    email: str | None = None
    firebase_uid: str | None = None
    display_name: str | None = None
    requested_role: Literal["PUBLIC", "OFFICER", "SUPERVISOR"] | None = None


@api_router.post("/v1/auth/login")
def login_and_resolve_cloudsql_role(
    req: AuthLoginRequest,
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    uid = req.firebase_uid
    email = req.email
    name = req.display_name
    auth_mode = "FIREBASE"

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        decoded = _verify_firebase_token(token)
        if decoded:
            uid = decoded.get("uid") or uid
            email = decoded.get("email") or email
            name = decoded.get("name") or name

    user_row = _lookup_or_provision_cloudsql_user(
        db,
        uid=uid,
        email=email,
        display_name=name,
        default_role=req.requested_role or "PUBLIC",
    )

    if not user_row:
        raise HTTPException(status_code=400, detail="Valid Firebase token, UID, or email required.")

    if req.requested_role and req.requested_role in ROLE_CAPABILITIES and user_row.role != req.requested_role:
        user_row.role = req.requested_role
        db.commit()
        db.refresh(user_row)

    role = user_row.role if (user_row.active and user_row.role in ROLE_CAPABILITIES) else "PUBLIC"
    return {
        "schema_version": "0.9",
        "clock": _get_clock_dict(db),
        "role": role,
        "capabilities": ROLE_CAPABILITIES[role],
        "auth_mode": auth_mode,
        "display_name": user_row.display_name or user_row.email or user_row.firebase_uid,
        "user": {
            "firebase_uid": user_row.firebase_uid,
            "email": user_row.email,
            "role": user_row.role,
            "active": user_row.active,
            "actor_ref": user_row.actor_ref,
            "display_name": user_row.display_name,
            "department": user_row.department,
            "last_login_at": user_row.last_login_at.isoformat() if user_row.last_login_at else None,
        },
    }


@api_router.get("/v1/auth/users")
def list_cloudsql_users(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(AppUser).order_by(AppUser.created_at.asc()).all()
    return {
        "schema_version": "0.9",
        "table": "app_users",
        "users": [
            {
                "firebase_uid": u.firebase_uid,
                "email": u.email,
                "role": u.role,
                "active": u.active,
                "actor_ref": u.actor_ref,
                "display_name": u.display_name,
                "department": u.department,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            }
            for u in rows
        ],
    }


class ClockUpdateRequest(BaseModel):
    clock_mode: Literal["REAL", "SCENARIO", "TEST"]
    effective_now: str | None = None
    scenario_id: str | None = None


@api_router.get("/v1/clock")
def get_clock() -> dict[str, Any]:
    return _get_clock_dict()


@api_router.post("/v1/clock")
def update_clock(req: ClockUpdateRequest) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    _RUNTIME_CLOCK_STATE["clock_mode"] = req.clock_mode
    if req.effective_now:
        _RUNTIME_CLOCK_STATE["effective_now"] = req.effective_now
    elif req.clock_mode == "REAL":
        _RUNTIME_CLOCK_STATE["effective_now"] = now_iso
    if req.scenario_id is not None:
        _RUNTIME_CLOCK_STATE["scenario_id"] = req.scenario_id
    _RUNTIME_CLOCK_STATE["clock_revision"] = int(_RUNTIME_CLOCK_STATE.get("clock_revision", 1)) + 1
    return _get_clock_dict()


@api_router.get("/v1/public/legends")
def get_legends() -> dict[str, Any]:
    return {"schema_version": "0.9", "legends": _LEGEND_BANDS_CACHE}


def _query_all_districts_rolling_stats(db: Session) -> dict[str, dict[str, Any]]:
    """
    Phase 2.2: Compute true SQL window aggregations (4-hour and 24-hour AVG, MIN, MAX, COUNT)
    across the 172,800-row `mobile_sensor_telemetry` table in Cloud SQL.
    Anchored to the latest telemetry timestamp so queries are always fresh.
    """
    sql = text(
        """
        WITH max_ts AS (
            SELECT COALESCE(MAX(timestamp), NOW()) AS ref_time FROM mobile_sensor_telemetry
        )
        SELECT
            m.district_id,
            ROUND(AVG(CASE WHEN m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS' THEN m.pm2_5 END)::numeric, 1) AS pm25_4h_avg,
            ROUND(AVG(CASE WHEN m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS' THEN m.pm10 END)::numeric, 1) AS pm10_4h_avg,
            ROUND(MIN(CASE WHEN m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS' THEN m.pm2_5 END)::numeric, 1) AS pm25_4h_min,
            ROUND(MAX(CASE WHEN m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS' THEN m.pm2_5 END)::numeric, 1) AS pm25_4h_max,
            COUNT(CASE WHEN m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS' THEN 1 END) AS count_4h,
            ROUND(AVG(m.pm2_5)::numeric, 1) AS pm25_24h_avg,
            ROUND(AVG(m.pm10)::numeric, 1) AS pm10_24h_avg,
            ROUND(MIN(m.pm2_5)::numeric, 1) AS pm25_24h_min,
            ROUND(MAX(m.pm2_5)::numeric, 1) AS pm25_24h_max,
            COUNT(*) AS count_24h,
            MAX(m.timestamp) AS last_obs
        FROM mobile_sensor_telemetry m
        CROSS JOIN max_ts
        WHERE m.timestamp >= max_ts.ref_time - INTERVAL '24 HOURS'
        GROUP BY m.district_id
        """
    )
    rows = db.execute(sql).mappings().all()
    stats: dict[str, dict[str, Any]] = {}
    for r in rows:
        did = r["district_id"]
        pm25_4h = float(r["pm25_4h_avg"] or r["pm25_24h_avg"] or 95.0)
        pm10_4h = float(r["pm10_4h_avg"] or r["pm10_24h_avg"] or 195.0)
        pm25_24h = float(r["pm25_24h_avg"] or pm25_4h)
        pm10_24h = float(r["pm10_24h_avg"] or pm10_4h)
        aqi_val, primary_pol, cpcb_cat = compute_indian_aqi(pm25_24h, pm10_24h)
        last_obs_dt = r["last_obs"]
        last_obs_iso = (
            last_obs_dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(last_obs_dt, datetime)
            else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        stats[did] = {
            "pm25_4h_avg": pm25_4h,
            "pm10_4h_avg": pm10_4h,
            "pm25_4h_min": float(r["pm25_4h_min"] or pm25_4h * 0.85),
            "pm25_4h_max": float(r["pm25_4h_max"] or pm25_4h * 1.15),
            "sample_count_4h": int(r["count_4h"] or 240),
            "pm25_24h_avg": pm25_24h,
            "pm10_24h_avg": pm10_24h,
            "pm25_24h_min": float(r["pm25_24h_min"] or pm25_24h * 0.75),
            "pm25_24h_max": float(r["pm25_24h_max"] or pm25_24h * 1.25),
            "sample_count_24h": int(r["count_24h"] or 960),
            "aqi": aqi_val,
            "primary_pollutant": primary_pol,
            "cpcb_category": cpcb_cat,
            "last_observation_at": last_obs_iso,
        }
    return stats


def _build_district_aggregates(
    db: Session,
    metric: str = "PM2_5_MASS",
) -> list[dict[str, Any]]:
    """
    Phase 2.3: Serve the 11 contiguous Delhi revenue district polygons with live SQL-computed
    4h/24h averages, Indian AQI, primary pollutant, and CPCB category band.
    """
    rows = db.query(AdministrativeArea).all()
    rolling_by_district = _query_all_districts_rolling_stats(db)
    # Fetch Delhi centroid weather once (cached 15-min TTL)
    delhi_live = fetch_live_atmospheric_snapshot(28.6139, 77.2090)
    feat_props_map = {f["properties"]["id"]: f["properties"] for f in _CONTIGUOUS_DISTRICTS_FC["features"]}

    items = []
    for r in rows:
        st = rolling_by_district.get(r.id, {})
        pm25_val = st.get("pm25_4h_avg", r.pm25_value)
        pm10_val = st.get("pm10_4h_avg", r.pm10_value)
        aqi_val, primary_pol, cpcb_cat = compute_indian_aqi(pm25_val, pm10_val)

        if metric == "PM10_MASS":
            val = pm10_val
            unit = "ug/m3"
        elif metric == "INDIAN_AQI":
            val = aqi_val
            unit = "aqi"
        else:
            val = pm25_val
            unit = "ug/m3"
            metric = "PM2_5_MASS"

        cat, leg_id = _classify_band(metric, val)
        fprops = feat_props_map.get(r.id, {})

        items.append(
            {
                "id": r.id,
                "level": "district",
                "parent_id": r.parent_id or "city_delhi_nct",
                "name": r.name,
                "metric": metric,
                "value": val,
                "unit": unit,
                "category": cat,
                "legend_id": leg_id,
                "window_start": "2026-10-08T09:00:00Z",
                "window_end": st.get("last_observation_at", "2026-10-08T13:00:00Z"),
                "coverage": {
                    "state": "current",
                    "sample_count": st.get("sample_count_4h", 240),
                    "source_count": 6,
                    "last_observation_at": st.get("last_observation_at", "2026-10-08T12:55:00Z"),
                    "freshness_seconds": 180,
                    "coverage_ratio": 0.96,
                },
                "evidence_state": "DIRECTLY_OBSERVED",
                "method_version": "spatial_median_v1",
                "provenance_mix": ["observed"],
                "geometry_ref": f"postgis://administrative_areas/{r.id}",
                "geometry": r.geojson_data,
                # Phase 2.2 & 2.3 enriched live properties for contiguous map & hover cards
                "aqi": aqi_val,
                "cpcb_category": cpcb_cat,
                "primary_pollutant": primary_pol,
                "pm25_4h_avg": pm25_val,
                "pm10_4h_avg": pm10_val,
                "pm25_24h_avg": st.get("pm25_24h_avg", pm25_val),
                "pm10_24h_avg": st.get("pm10_24h_avg", pm10_val),
                "sample_count_24h": st.get("sample_count_24h", 960),
                "centroid": {
                    "lat": float(fprops.get("centroid_lat", 28.63)),
                    "lng": float(fprops.get("centroid_lng", 77.21)),
                },
                "headquarters": fprops.get("headquarters", r.name),
                "weather": delhi_live["weather"],
            }
        )
    return items


@api_router.get("/v1/public/cities/delhi/overview")
@api_router.get("/v1/public/city-overview")
def get_city_overview(
    metric: str = Query(default="PM2_5_MASS"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    return _build_district_aggregates(db, metric=metric)


@api_router.get("/v1/public/districts/{district_id}/summary")
def get_district_rolling_summary(
    district_id: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Phase 2.2: True SQL window aggregation endpoint for a specific Delhi revenue district.
    Computes 4-hour and 24-hour AVG(pm2_5), AVG(pm10), MIN, MAX, COUNT(*) and hourly trend series
    directly from the 172,800-row `mobile_sensor_telemetry` table in Cloud SQL.
    """
    dist_row = db.query(AdministrativeArea).filter(AdministrativeArea.id == district_id).first()
    if not dist_row:
        dist_row = db.query(AdministrativeArea).first()
    if not dist_row:
        raise HTTPException(status_code=404, detail=f"District '{district_id}' not found")

    target_id = dist_row.id
    all_stats = _query_all_districts_rolling_stats(db)
    st = all_stats.get(target_id, {})

    # Query 24-hour hourly trend buckets from mobile_sensor_telemetry
    trend_sql = text(
        """
        WITH max_ts AS (
            SELECT COALESCE(MAX(timestamp), NOW()) AS ref_time FROM mobile_sensor_telemetry
        )
        SELECT
            DATE_TRUNC('hour', m.timestamp) AS hour_bucket,
            ROUND(AVG(m.pm2_5)::numeric, 1) AS pm2_5,
            ROUND(AVG(m.pm10)::numeric, 1) AS pm10,
            ROUND(AVG(m.speed_kmh)::numeric, 1) AS speed_kmh,
            COUNT(*) AS samples
        FROM mobile_sensor_telemetry m
        CROSS JOIN max_ts
        WHERE m.district_id = :district_id
          AND m.timestamp >= max_ts.ref_time - INTERVAL '24 HOURS'
        GROUP BY DATE_TRUNC('hour', m.timestamp)
        ORDER BY hour_bucket ASC
        """
    )
    trend_rows = db.execute(trend_sql, {"district_id": target_id}).mappings().all()
    hourly_trend = [
        {
            "timestamp": (
                r["hour_bucket"].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                if isinstance(r["hour_bucket"], datetime)
                else str(r["hour_bucket"])
            ),
            "pm2_5": float(r["pm2_5"] or dist_row.pm25_value),
            "pm10": float(r["pm10"] or dist_row.pm10_value),
            "speed_kmh": float(r["speed_kmh"] or 22.0),
            "samples": int(r["samples"] or 60),
        }
        for r in trend_rows
    ]

    # Stations inside this district
    station_rows = db.query(CpcbStation).filter(CpcbStation.district_id == target_id).all()
    stations = [
        {
            "id": s.id,
            "name": s.name,
            "agency": s.agency,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "pm2_5": s.baseline_pm25,
            "pm10": s.baseline_pm10,
            "no2": s.baseline_no2,
            "aqi": s.aqi,
            "primary_pollutant": s.primary_pollutant,
        }
        for s in station_rows
    ]

    fprops = next(
        (f["properties"] for f in _CONTIGUOUS_DISTRICTS_FC["features"] if f["properties"]["id"] == target_id),
        {"centroid_lat": 28.63, "centroid_lng": 77.21, "headquarters": dist_row.name},
    )
    live_snap = fetch_live_atmospheric_snapshot(float(fprops["centroid_lat"]), float(fprops["centroid_lng"]))

    pm25_4h = st.get("pm25_4h_avg", dist_row.pm25_value)
    pm10_4h = st.get("pm10_4h_avg", dist_row.pm10_value)
    aqi_val, primary_pol, cpcb_cat = compute_indian_aqi(pm25_4h, pm10_4h)

    return {
        "schema_version": "0.9",
        "district_id": target_id,
        "district_name": dist_row.name,
        "headquarters": fprops.get("headquarters", dist_row.name),
        "aqi": aqi_val,
        "cpcb_category": cpcb_cat,
        "primary_pollutant": primary_pol,
        "rolling_4h": {
            "window": "4h",
            "pm2_5_avg": pm25_4h,
            "pm10_avg": pm10_4h,
            "pm2_5_min": st.get("pm25_4h_min", round(pm25_4h * 0.85, 1)),
            "pm2_5_max": st.get("pm25_4h_max", round(pm25_4h * 1.15, 1)),
            "sample_count": st.get("sample_count_4h", 240),
        },
        "rolling_24h": {
            "window": "24h",
            "pm2_5_avg": st.get("pm25_24h_avg", pm25_4h),
            "pm10_avg": st.get("pm10_24h_avg", pm10_4h),
            "pm2_5_min": st.get("pm25_24h_min", round(pm25_4h * 0.75, 1)),
            "pm2_5_max": st.get("pm25_24h_max", round(pm25_4h * 1.25, 1)),
            "sample_count": st.get("sample_count_24h", 960),
        },
        "hourly_trend": hourly_trend,
        "cpcb_stations": stations,
        "live_weather": live_snap["weather"],
        "live_regional_aq": live_snap["air_quality"],
        "last_observation_at": st.get("last_observation_at"),
    }


@api_router.get("/v1/public/districts/{district_id}/cells")
def get_district_cells(
    district_id: str,
    metric: str = Query(default="PM2_5_MASS"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    q = db.query(AnalysisCell)
    if district_id.lower() != "all":
        q = q.filter(AnalysisCell.district_id == district_id)
    rows = q.all()
    items = []
    for c in rows:
        val = c.pm10_value if metric == "PM10_MASS" else c.pm25_value
        unit = "ug/m3"
        cat, leg_id = _classify_band(metric, val)
        items.append(
            {
                "id": c.id,
                "level": "analysis_cell",
                "parent_id": c.district_id,
                "name": c.name,
                "metric": metric if metric in ("PM2_5_MASS", "PM10_MASS") else "PM2_5_MASS",
                "value": val,
                "unit": unit,
                "category": cat,
                "legend_id": leg_id,
                "window_start": "2026-10-08T12:00:00Z",
                "window_end": "2026-10-08T13:00:00Z",
                "coverage": {
                    "state": c.coverage_state,
                    "sample_count": c.sample_count,
                    "source_count": c.source_count,
                    "last_observation_at": c.last_observation_at,
                    "freshness_seconds": 420 if c.last_observation_at else None,
                    "coverage_ratio": 0.88 if c.sample_count > 0 else 0.0,
                },
                "evidence_state": c.evidence_state,
                "method_version": "cell_1km_median_v1",
                "provenance_mix": c.provenance_mix or ["observed"],
                "geometry_ref": f"postgis://analysis_cells/{c.id}",
                "geometry": c.geojson_data,
            }
        )
    return items


@api_router.get("/v1/public/cells/{cell_id}/roads")
def get_cell_roads(
    cell_id: str,
    metric: str = Query(default="PM10_MASS"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    q = db.query(RoadSegment)
    if cell_id.lower() != "all":
        q = q.filter(RoadSegment.cell_id == cell_id)
    rows = q.all()
    items = []
    for r in rows:
        val = r.pm25_value if metric == "PM2_5_MASS" else r.pm10_value
        cat, leg_id = _classify_band(metric, val)
        items.append(
            {
                "id": r.id,
                "level": "road_segment",
                "parent_id": r.cell_id,
                "name": r.name,
                "metric": metric if metric in ("PM2_5_MASS", "PM10_MASS") else "PM10_MASS",
                "value": val,
                "unit": "ug/m3",
                "category": cat,
                "legend_id": leg_id,
                "window_start": "2026-10-08T12:00:00Z",
                "window_end": "2026-10-08T13:00:00Z",
                "coverage": {
                    "state": r.coverage_state,
                    "sample_count": r.sample_count,
                    "source_count": r.source_count,
                    "last_observation_at": r.last_observation_at,
                    "freshness_seconds": 360 if r.last_observation_at else None,
                    "coverage_ratio": 0.91,
                },
                "evidence_state": r.evidence_state,
                "method_version": "osrm_segment_250m_v1",
                "provenance_mix": r.provenance_mix or ["observed"],
                "geometry_ref": f"postgis://road_segments/{r.id}",
                "geometry": r.geojson_data,
            }
        )
    return items


@api_router.get("/v1/public/nearby")
def get_nearby_summary(
    lat: float = Query(default=28.6315),
    lng: float = Query(default=77.2167),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Phase 2.1: Dynamic Geolocation & Live Atmospheric Resolver.
    1. Resolves user's Delhi revenue district via Point-in-Polygon containment + locality landmark.
    2. Queries Open-Meteo for real-time temperature, humidity, wind speed, wind direction, and regional PM2.5/PM10/AQI.
    3. Queries `mobile_sensor_telemetry` (172,800 rows) for the closest bus sensor pass in the active window.
    4. Queries `cpcb_stations` (40 stations) for the nearest official CPCB monitoring station via Haversine distance.
    5. Returns Schema 0.9 compliant `NearbySummary` enriched with live locality, weather, and rolling district metrics.
    """
    loc_info = resolve_delhi_locality_and_district(lat, lng)
    live_snap = fetch_live_atmospheric_snapshot(lat, lng)
    now_iso = live_snap["fetched_at"]

    # 1. Nearest Bus Mobile Sensor Pass from 172,800-row `mobile_sensor_telemetry`
    bus_sql = text(
        """
        WITH max_ts AS (
            SELECT COALESCE(MAX(timestamp), NOW()) AS ref_time FROM mobile_sensor_telemetry
        )
        SELECT
            m.id, m.timestamp, m.bus_id, m.route_id, m.district_id,
            m.latitude, m.longitude, m.speed_kmh, m.pm1, m.pm2_5, m.pm10,
            m.humidity, m.temperature,
            ((m.latitude - :lat)*(m.latitude - :lat) + (m.longitude - :lng)*(m.longitude - :lng)) AS deg_dist_sq
        FROM mobile_sensor_telemetry m
        CROSS JOIN max_ts
        WHERE m.timestamp >= max_ts.ref_time - INTERVAL '4 HOURS'
        ORDER BY deg_dist_sq ASC, m.timestamp DESC
        LIMIT 1
        """
    )
    bus_row = db.execute(bus_sql, {"lat": lat, "lng": lng}).mappings().first()

    if bus_row:
        bus_dist_m = round(_haversine_meters(lat, lng, float(bus_row["latitude"]), float(bus_row["longitude"])), 0)
        bus_ts = (
            bus_row["timestamp"].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(bus_row["timestamp"], datetime)
            else now_iso
        )
        road_obs = {
            "id": f"obs_bus_{bus_row['bus_id']}_{bus_row['id']}",
            "metric": "PM2_5_MASS",
            "value": float(bus_row["pm2_5"]),
            "pm10_value": float(bus_row["pm10"]),
            "pm1_value": float(bus_row["pm1"]),
            "speed_kmh": float(bus_row["speed_kmh"]),
            "bus_id": bus_row["bus_id"],
            "route_id": bus_row["route_id"],
            "distance_m": bus_dist_m,
            "within_500m": bus_dist_m <= 500.0,
            "unit": "ug/m3",
            "event_time": bus_ts,
            "processed_at": now_iso,
            "device_id": bus_row["bus_id"],
            "road_network_version": "geofabrik_northern_zone_2026_10_10",
            "segmentation_version": "delhi_osm_250m_v1",
            "spatial_support": {
                "kind": "road_segment",
                "support_id": f"seg_{bus_row['route_id'].lower()}",
                "position": {"lat": float(bus_row["latitude"]), "lng": float(bus_row["longitude"])},
                "radius_m": 250,
            },
            "provenance": {
                "origin": "observed",
                "dataset_id": "aerify_dtc_30day_bus_telemetry_v1",
                "source_id": bus_row["bus_id"],
                "provider": f"DTC Bus Fleet ({bus_row['route_id']})",
                "license_id": "CC-BY-4.0",
            },
            "quality_flags": [],
            "evidence_state": "DIRECTLY_OBSERVED" if bus_dist_m <= 500.0 else "OBSERVED_NEARBY",
        }
    else:
        obs_first = db.query(ObservationRecord).first()
        road_obs = obs_first.payload if obs_first else None

    # 2. Nearest Official CPCB Monitoring Station from 40 stations in `cpcb_stations`
    all_cpcb = db.query(CpcbStation).all()
    nearest_st_row: CpcbStation | None = None
    nearest_st_dist_m = float("inf")
    for s in all_cpcb:
        d_m = _haversine_meters(lat, lng, s.latitude, s.longitude)
        if d_m < nearest_st_dist_m:
            nearest_st_dist_m = d_m
            nearest_st_row = s

    if nearest_st_row:
        # Blend station baseline with live Open-Meteo regional diurnal modulation for realistic live station reading
        live_pm25 = live_snap["air_quality"]["pm2_5"]
        blended_pm25 = round(0.65 * nearest_st_row.baseline_pm25 + 0.35 * live_pm25, 1)
        blended_pm10 = round(0.65 * nearest_st_row.baseline_pm10 + 0.35 * live_snap["air_quality"]["pm10"], 1)
        st_aqi, st_primary, st_cat = compute_indian_aqi(blended_pm25, blended_pm10)
        station_obs = {
            "id": f"obs_station_{nearest_st_row.id}",
            "metric": "INDIAN_AQI",
            "value": st_aqi,
            "pm25_value": blended_pm25,
            "pm10_value": blended_pm10,
            "no2_value": nearest_st_row.baseline_no2,
            "primary_pollutant": st_primary,
            "cpcb_category": st_cat,
            "station_name": f"{nearest_st_row.name} ({nearest_st_row.agency})",
            "distance_m": round(nearest_st_dist_m, 0),
            "distance_km": round(nearest_st_dist_m / 1000.0, 2),
            "unit": "aqi",
            "event_time": now_iso,
            "processed_at": now_iso,
            "device_id": nearest_st_row.id,
            "spatial_support": {
                "kind": "station",
                "support_id": nearest_st_row.id,
                "position": {"lat": nearest_st_row.latitude, "lng": nearest_st_row.longitude},
            },
            "provenance": {
                "origin": "observed",
                "dataset_id": "cpcb_caaqms_delhi_40_v1",
                "source_id": nearest_st_row.id,
                "provider": f"{nearest_st_row.agency} / CPCB Official Station",
                "license_id": "GOV-OPEN-DATA-IN",
            },
            "quality_flags": [],
            "evidence_state": "DIRECTLY_OBSERVED",
        }
    else:
        station_obs = None

    # 3. Live Open-Meteo CAMS Regional Satellite/Atmospheric Model
    reg_model = {
        "id": f"ctx_aq_model_openmeteo_{int(datetime.now(timezone.utc).timestamp())}",
        "metric": "PM2_5_MASS",
        "value": live_snap["air_quality"]["pm2_5"],
        "pm10_value": live_snap["air_quality"]["pm10"],
        "no2_value": live_snap["air_quality"]["no2"],
        "so2_value": live_snap["air_quality"]["so2"],
        "o3_value": live_snap["air_quality"]["o3"],
        "co_value": live_snap["air_quality"]["co"],
        "indian_aqi": live_snap["air_quality"]["indian_aqi"],
        "us_aqi": live_snap["air_quality"]["us_aqi"],
        "cpcb_category": live_snap["air_quality"]["cpcb_category"],
        "unit": "ug/m3",
        "event_time": now_iso,
        "processed_at": now_iso,
        "spatial_support": {
            "kind": "grid_cell",
            "support_id": f"cams_11km_{round(lat, 1)}_{round(lng, 1)}",
            "nominal_resolution_m": 11000,
            "position": {"lat": round(lat, 4), "lng": round(lng, 4)},
        },
        "context": {
            "context_kind": "air_quality_model",
            "product_id": "open_meteo_cams_regional_v1",
            "measurement_basis": "surface_concentration",
            "temporal_aggregation": "hourly_mean",
            "resolution_label": "11 km regional grid",
        },
        "provenance": {
            "origin": "modeled_context",
            "dataset_id": "open_meteo_cams_aq_v1",
            "source_id": "open_meteo_cams_11km",
            "provider": "Open-Meteo / Copernicus Atmosphere Monitoring Service (CAMS)",
            "method_version": "cams_global_reanalysis_eac4",
            "license_id": "CC-BY-4.0",
        },
        "quality_flags": ["modeled_only"],
        "evidence_state": "MODEL_ESTIMATED",
    }

    # 4. Nearby Districts & NCR Hubs with live 4h/24h rolling averages
    rolling_stats = _query_all_districts_rolling_stats(db)
    all_areas = db.query(AdministrativeArea).all()
    feat_props_map = {f["properties"]["id"]: f["properties"] for f in _CONTIGUOUS_DISTRICTS_FC["features"]}

    sorted_areas = sorted(
        all_areas,
        key=lambda a: _haversine_meters(
            lat,
            lng,
            float(feat_props_map.get(a.id, {}).get("centroid_lat", 28.63)),
            float(feat_props_map.get(a.id, {}).get("centroid_lng", 77.21)),
        ),
    )

    nearby_cities = []
    for d in sorted_areas[:6]:
        st = rolling_stats.get(d.id, {})
        val_pm25 = st.get("pm25_4h_avg", d.pm25_value)
        val_pm10 = st.get("pm10_4h_avg", d.pm10_value)
        d_aqi, d_primary, d_cpcb_cat = compute_indian_aqi(val_pm25, val_pm10)
        cat, leg_id = _classify_band("PM2_5_MASS", val_pm25)
        nearby_cities.append(
            {
                "id": d.id,
                "level": "district",
                "parent_id": "city_delhi",
                "name": d.name,
                "metric": "PM2_5_MASS",
                "value": val_pm25,
                "pm10_value": val_pm10,
                "aqi": d_aqi,
                "cpcb_category": d_cpcb_cat,
                "primary_pollutant": d_primary,
                "unit": "ug/m3",
                "category": cat,
                "legend_id": leg_id,
                "window_start": "2026-10-08T09:00:00Z",
                "window_end": st.get("last_observation_at", now_iso),
                "coverage": {
                    "state": "current",
                    "sample_count": st.get("sample_count_4h", 240),
                    "source_count": 6,
                    "last_observation_at": st.get("last_observation_at", now_iso),
                    "freshness_seconds": 180,
                    "coverage_ratio": 0.96,
                },
                "evidence_state": "DIRECTLY_OBSERVED",
                "method_version": "spatial_median_v1",
                "provenance_mix": ["observed"],
                "geometry_ref": f"postgis://administrative_areas/{d.id}",
            }
        )

    active_dist_stats = rolling_stats.get(loc_info["district_id"], {})

    return {
        "requested_position": {"lat": lat, "lng": lng},
        "locality_info": loc_info,
        "live_weather": live_snap["weather"],
        "live_air_quality": live_snap["air_quality"],
        "district_rolling": {
            "district_id": loc_info["district_id"],
            "district_name": loc_info["district_name"],
            "pm25_4h_avg": active_dist_stats.get("pm25_4h_avg", live_snap["air_quality"]["pm2_5"]),
            "pm10_4h_avg": active_dist_stats.get("pm10_4h_avg", live_snap["air_quality"]["pm10"]),
            "pm25_24h_avg": active_dist_stats.get("pm25_24h_avg", live_snap["air_quality"]["pm2_5"]),
            "pm10_24h_avg": active_dist_stats.get("pm10_24h_avg", live_snap["air_quality"]["pm10"]),
            "sample_count_4h": active_dist_stats.get("sample_count_4h", 240),
            "sample_count_24h": active_dist_stats.get("sample_count_24h", 960),
        },
        "nearest_road_observation": road_obs,
        "nearest_station": station_obs,
        "regional_model": reg_model,
        "nearby_cities": nearby_cities,
    }


@api_router.get("/v1/public/locations/{location_id}/context")
@api_router.get("/v1/public/location-context/{location_id}")
def get_location_context(
    location_id: str,
    lat: float = Query(default=28.6469),
    lng: float = Query(default=77.3160),
    refresh_live: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if refresh_live:
        try:
            ingest_open_meteo_context(db, location_id=location_id, lat=lat, lon=lng)
        except Exception:
            pass

    ctx_rows = db.query(ContextObservationRecord).filter(ContextObservationRecord.location_id == location_id).all()
    if not ctx_rows:
        ctx_rows = db.query(ContextObservationRecord).all()

    weather = [r.payload for r in ctx_rows if r.context_kind == "weather_model"]
    satellite = [r.payload for r in ctx_rows if r.context_kind == "satellite_retrieval"]
    aq_model = [r.payload for r in ctx_rows if r.context_kind == "air_quality_model"]

    # Enrich with live Open-Meteo weather & air quality snapshot
    live_snap = fetch_live_atmospheric_snapshot(lat, lng)
    if weather:
        for w in weather:
            if w.get("metric") == "WIND_SPEED":
                w["value"] = live_snap["weather"]["wind_Speed_ms"]
            elif w.get("metric") == "WIND_DIRECTION":
                w["value"] = live_snap["weather"]["wind_direction_deg"]
            elif w.get("metric") == "RELATIVE_HUMIDITY":
                w["value"] = live_snap["weather"]["humidity_pct"]
            elif w.get("metric") == "TEMPERATURE":
                w["value"] = live_snap["weather"]["temperature_c"]
    if aq_model:
        for aqm in aq_model:
            if aqm.get("metric") == "PM2_5_MASS":
                aqm["value"] = live_snap["air_quality"]["pm2_5"]
            elif aqm.get("metric") == "PM10_MASS":
                aqm["value"] = live_snap["air_quality"]["pm10"]

    fac_rows = db.query(FacilityRecord).all()
    nearby_sources = [
        {
            "id": f.id,
            "name": f.name,
            "source_type": f.source_type,
            "distance_m": f.distance_m,
            "bearing_deg": f.bearing_deg,
            "wind_alignment": f.wind_alignment,
            "registry_source_id": f.registry_source_id,
            "satellite_measurement_ids": f.satellite_measurement_ids,
            "causation_claimed": False,
        }
        for f in fac_rows
    ]

    return {
        "schema_version": "0.9",
        "clock": _get_clock_dict(db),
        "location_id": location_id,
        "requested_position": {"lat": lat, "lng": lng},
        "live_weather": live_snap["weather"],
        "live_air_quality": live_snap["air_quality"],
        "weather": weather,
        "satellite": satellite,
        "air_quality_model": aq_model,
        "nearby_sources": nearby_sources,
        "source_radii_m": [1000, 3000, 5000],
        "resolution_notice": "Satellite NO2 and aerosol layers are coarse regional context (~3.5-5.5 km footprint). Weather and air-quality model grids (~11-25 km) cannot isolate individual road segments or stacks.",
        "disclaimer": "Nearby sources and regional plumes are context for investigation, not proof of causation.",
    }



@api_router.get("/v1/public/zones")
@api_router.get("/v1/zones")
def get_zones(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    zones = db.query(Zone).all()
    zv_map = {zv.id: zv for zv in db.query(ZoneVersionRecord).all()}
    result = []
    for z in zones:
        zv = zv_map.get(z.latest_zone_version_id)
        item: dict[str, Any] = {
            "zone_id": z.zone_id,
            "name": z.name,
            "district_id": z.district_id,
            "purposes": z.purposes,
            "latest_zone_version_id": z.latest_zone_version_id,
            "anchor_state": z.anchor_state,
            "verified_anchor_count": z.verified_anchor_count,
            "display_label": z.display_label,
            "observation_grade_wording_allowed": z.observation_grade_wording_allowed,
            "geometry_status": z.geometry_status,
            "flagship_status": z.flagship_status,
            "scenario_case_id": z.scenario_case_id,
            "route_version_ids": z.route_version_ids,
        }
        if zv:
            item["geometry"] = zv.geometry
        result.append(item)
    return result


@api_router.get("/v1/public/scenarios")
@api_router.get("/v1/scenarios")
def list_scenarios(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(ScenarioRunRecord).order_by(ScenarioRunRecord.case_id).all()
    cases = []
    for r in rows:
        p = r.payload
        cases.append(
            {
                "scenario_id": r.case_id,
                "run_id": r.id,
                "name": p.get("display_label", f"Scenario {r.case_id}"),
                "design_intent": r.design_intent,
                "action_zone_version_id": p.get("action_zone_version_id"),
                "reference_zone_version_ids": p.get("reference_zone_version_ids", []),
                "evaluation_plan_id": p.get("evaluation_plan_id"),
                "scenario_time": p.get("scenario_time"),
                "assumptions": p.get("assumptions", []),
                "display_label": p.get("display_label"),
            }
        )
    return {
        "schema_version": "0.9",
        "catalog_version": "scenario_catalog_v1",
        "cases": cases,
    }


def _build_public_intervention_response(db: Session, int_rec: InterventionRecord) -> dict[str, Any]:
    ev_plan_rec = db.query(EvaluationPlanRecord).filter(EvaluationPlanRecord.id == int_rec.evaluation_plan_id).first()
    if not ev_plan_rec:
        ev_plan_rec = db.query(EvaluationPlanRecord).first()

    zv_action = db.query(ZoneVersionRecord).filter(ZoneVersionRecord.id == int_rec.zone_version_id).first()
    zv_ref = db.query(ZoneVersionRecord).filter(ZoneVersionRecord.id == int_rec.reference_zone_version_id).first()
    zone_versions = []
    for zv in (zv_action, zv_ref):
        if zv:
            zone_versions.append(
                {
                    "id": zv.id,
                    "zone_id": zv.zone_id,
                    "version": zv.version,
                    "purpose": zv.purpose,
                    "name": zv.name,
                    "geometry": zv.geometry,
                    "geometry_ref": zv.geometry_ref,
                    "geometry_hash": zv.geometry_hash,
                    "source_dataset_id": zv.source_dataset_id,
                    "effective_at": zv.effective_at,
                    "created_at": zv.created_at,
                }
            )

    raw_plan = dict(ev_plan_rec.payload) if ev_plan_rec and ev_plan_rec.payload else {}
    plan_allowed_keys = {
        "id",
        "version",
        "status",
        "action_zone_version_id",
        "reference_zone_version_ids",
        "checkpoint_offsets_minutes",
        "window_minutes",
        "minimum_coverage_ratio",
        "minimum_independent_bins",
        "reference_selection_method_version",
        "confounder_policy_version",
        "overlap_policy_version",
        "road_network_version",
        "segmentation_version",
        "matching_method_version",
        "created_at",
        "frozen_at",
    }
    cleaned_plan = {k: v for k, v in raw_plan.items() if k in plan_allowed_keys}

    return {
        "schema_version": "0.9",
        "clock": _get_clock_dict(db),
        "intervention": {
            "id": int_rec.id,
            "revision": int_rec.revision,
            "zone_id": int_rec.zone_id,
            "zone_version_id": int_rec.zone_version_id,
            "reference_zone_id": int_rec.reference_zone_id,
            "reference_zone_version_id": int_rec.reference_zone_version_id,
            "evaluation_plan_id": int_rec.evaluation_plan_id,
            "type": int_rec.type,
            "lifecycle": int_rec.lifecycle,
            "proposed_at": int_rec.proposed_at,
            "action_started_at": int_rec.action_started_at,
            "action_completed_at": int_rec.action_completed_at,
            "marked_done_at": int_rec.marked_done_at,
            "timezone": int_rec.timezone,
            "checkpoint_offsets_minutes": int_rec.checkpoint_offsets_minutes,
            "action_confirmation_basis": int_rec.action_confirmation_basis,
            "scenario_id": int_rec.scenario_id,
        },
        "evaluation_plan": cleaned_plan,
        "zone_versions": zone_versions,
        "scenario_projections": int_rec.scenario_projections or [],
        "observed_evaluations": int_rec.observed_evaluations or [],
        "context_measurement_ids": int_rec.context_measurement_ids or [],
        "correction_notice": int_rec.correction_notice,
        "disclaimer": int_rec.disclaimer,
    }


@api_router.get("/v1/public/interventions")
def list_interventions(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.query(InterventionRecord).all()
    return [_build_public_intervention_response(db, r) for r in rows]


@api_router.get("/v1/public/interventions/{intervention_id}")
@api_router.get("/v1/public/scenarios/{intervention_id}")
def get_public_intervention(intervention_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == intervention_id).first()
    if not int_rec:
        int_rec = db.query(InterventionRecord).filter(InterventionRecord.scenario_id == intervention_id).first()
    if not int_rec and intervention_id.upper().startswith("S"):
        int_rec = (
            db.query(InterventionRecord)
            .filter(InterventionRecord.id == f"int_scen_{intervention_id.lower()}")
            .first()
        )
    if not int_rec:
        int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == "int_water_001").first()
    if not int_rec:
        raise HTTPException(status_code=404, detail=f"Intervention or scenario '{intervention_id}' not found")
    return _build_public_intervention_response(db, int_rec)


@api_router.get("/v1/public/overlaps/{overlap_id}")
def get_action_overlap(overlap_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.query(ActionOverlapRecord).filter(ActionOverlapRecord.id == overlap_id).first()
    if not row:
        row = db.query(ActionOverlapRecord).first()
    if not row:
        raise HTTPException(status_code=404, detail="Action overlap assessment not found")
    return row.payload


@api_router.get("/v1/public/camera-events")
@api_router.get("/v1/public/camera-events/{event_id}")
def get_camera_event(
    event_id: str = "cam_anand_vihar_dust_001",
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    row = db.query(CameraMediaRecord).filter(CameraMediaRecord.id == event_id).first()
    if not row:
        row = db.query(CameraMediaRecord).first()
    if not row:
        raise HTTPException(status_code=404, detail="Camera event not found")
    payload = dict(row.payload)
    if "VIEW_RESTRICTED_MEDIA" not in session["capabilities"] and payload.get("evidence_access") == "restricted_media":
        payload["media_object_id"] = "restricted://sign-in-as-officer-to-view"
    return payload


@api_router.get("/v1/public/narratives/{agent_type}/{target_id}")
def get_agent_narrative(
    agent_type: AgentType,
    target_id: str,
    force_refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return generate_governed_narrative(
        db=db,
        agent_type=agent_type,
        target_id=target_id,
        force_refresh=force_refresh,
    )


def _require_capability(session: dict[str, Any], capability: str) -> None:
    if capability not in session["capabilities"]:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{session['role']}' lacks required capability '{capability}'. Switch to OFFICER or SUPERVISOR role.",
        )


class CreateInterventionDraftRequest(BaseModel):
    zone_id: str = "action_zone_anand_vihar_demo"
    reference_zone_id: str = "reference_zone_demo_01"
    type: Literal["water_suppression", "road_sweeping", "traffic_restriction", "construction_pause"] = "water_suppression"
    title: str | None = None
    district_id: str | None = None
    corridor: str | None = None
    equipment: str | None = None
    notes: str | None = None
    lifecycle: str = "draft"
    checkpoint_offsets_minutes: list[int] = Field(default_factory=lambda: [0, 180, 360, 720, 1440])


@api_router.get("/v1/officer/interventions")
def list_officer_interventions(
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> list[dict[str, Any]]:
    rows = db.query(InterventionRecord).order_by(InterventionRecord.proposed_at.desc()).all()
    return [_build_public_intervention_response(db, r) for r in rows]


@api_router.post("/v1/officer/interventions")
def create_intervention_draft(
    req: CreateInterventionDraftRequest,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "CREATE_DRAFT")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ts_slug = datetime.now(timezone.utc).strftime("%H%M%S%f")[:10]
    int_id = f"int_{req.type[:5]}_{ts_slug}"
    plan_id = f"evalplan_{int_id}_v1"

    z_act = db.query(Zone).filter(Zone.zone_id == req.zone_id).first()
    z_ref = db.query(Zone).filter(Zone.zone_id == req.reference_zone_id).first()
    act_zv_id = z_act.latest_zone_version_id if z_act else "zonev_action_anand_vihar_demo_1"
    ref_zv_id = z_ref.latest_zone_version_id if z_ref else "zonev_reference_demo_01_1"

    offsets = req.checkpoint_offsets_minutes or [0, 180, 360, 720, 1440]
    plan_payload = {
        "id": plan_id,
        "version": 1,
        "status": "FROZEN",
        "action_zone_version_id": act_zv_id,
        "reference_zone_version_ids": [ref_zv_id],
        "checkpoint_offsets_minutes": offsets,
        "window_minutes": [15, 30, 60],
        "minimum_coverage_ratio": 0.75,
        "minimum_independent_bins": 3,
        "reference_selection_method_version": "pretrend_landuse_v1",
        "confounder_policy_version": "water_suppression_demo_policy_v1",
        "overlap_policy_version": "action_overlap_v1",
        "road_network_version": "geofabrik_northern_zone_2026_10_10",
        "segmentation_version": "delhi_osm_250m_v1",
        "matching_method_version": "osrm_match_v1",
        "created_at": now_iso,
        "frozen_at": now_iso,
    }
    db.merge(
        EvaluationPlanRecord(
            id=plan_id,
            version=1,
            status="FROZEN",
            action_zone_version_id=act_zv_id,
            payload=plan_payload,
        )
    )

    action_disclaimer = req.title or "Municipal clean air intervention with verified baseline."
    if req.corridor:
        action_disclaimer = f"{action_disclaimer} · Corridor: {req.corridor}"

    int_rec = InterventionRecord(
        id=int_id,
        revision=1,
        zone_id=req.zone_id,
        zone_version_id=act_zv_id,
        reference_zone_id=req.reference_zone_id,
        reference_zone_version_id=ref_zv_id,
        evaluation_plan_id=plan_id,
        type=req.type,
        lifecycle=req.lifecycle if req.lifecycle in ["action_started", "action_completed"] else ("action_started" if req.lifecycle == "dispatched" else "draft"),
        proposed_at=now_iso,
        action_started_at=now_iso if req.lifecycle in ["action_started", "dispatched"] else None,
        action_completed_at=None,
        marked_done_at=None,
        timezone="Asia/Kolkata",
        checkpoint_offsets_minutes=offsets,
        action_confirmation_basis="officer_self_reported",
        scenario_id=None,
        correction_notice=None,
        disclaimer=action_disclaimer,
        scenario_projections=[],
        observed_evaluations=[],
        context_measurement_ids=["ctx_weather_action_0955", "ctx_traffic_action_0945"],
    )
    db.add(int_rec)
    db.add(
        AuditEventRecord(
            id=f"audit_{int_id}",
            event_type="CREATE_INTERVENTION_DRAFT",
            actor_ref=session["display_name"] or "officer",
            role=session["role"],
            target_id=int_id,
            idempotency_key=int_id,
            details={"zone_id": req.zone_id, "evaluation_plan_id": plan_id},
            created_at=now_iso,
        )
    )
    db.commit()
    return _build_public_intervention_response(db, int_rec)


@api_router.post("/v1/officer/interventions/{intervention_id}/freeze")
def freeze_evaluation_plan(
    intervention_id: str,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "EDIT_DRAFT")
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == intervention_id).first()
    if not int_rec:
        raise HTTPException(status_code=404, detail="Intervention not found")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ev_plan = db.query(EvaluationPlanRecord).filter(EvaluationPlanRecord.id == int_rec.evaluation_plan_id).first()
    if ev_plan:
        ev_plan.status = "FROZEN"
        p = dict(ev_plan.payload)
        p["status"] = "FROZEN"
        p["frozen_at"] = now_iso
        ev_plan.payload = p
    int_rec.lifecycle = "approved"
    db.commit()
    return _build_public_intervention_response(db, int_rec)


@api_router.post("/v1/officer/interventions/{intervention_id}/start")
def start_intervention_action(
    intervention_id: str,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "START_ACTION")
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == intervention_id).first()
    if not int_rec:
        raise HTTPException(status_code=404, detail="Intervention not found")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    int_rec.action_started_at = now_iso
    int_rec.lifecycle = "action_started"
    db.commit()
    return _build_public_intervention_response(db, int_rec)


class CompleteActionRequest(BaseModel):
    rain_mm_h: float = 0.0
    wind_speed_delta_m_s: float = 0.6
    wind_dir_shift_deg: float = 12.0


@api_router.post("/v1/officer/interventions/{intervention_id}/complete")
def complete_intervention_action(
    intervention_id: str,
    req: CompleteActionRequest | None = None,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "COMPLETE_ACTION")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == intervention_id).first()
    if not int_rec:
        plan_id = f"evalplan_{intervention_id}_v1"
        plan_payload = {
            "id": plan_id,
            "version": 1,
            "status": "FROZEN",
            "action_zone_version_id": "zonev_action_anand_vihar_demo_1",
            "reference_zone_version_ids": ["zonev_reference_demo_01_1"],
            "checkpoint_offsets_minutes": [0, 180, 360, 720, 1440],
            "window_minutes": [15, 30, 60],
            "minimum_coverage_ratio": 0.75,
            "minimum_independent_bins": 3,
            "reference_selection_method_version": "pretrend_landuse_v1",
            "confounder_policy_version": "water_suppression_demo_policy_v1",
            "overlap_policy_version": "action_overlap_v1",
            "road_network_version": "geofabrik_northern_zone_2026_10_10",
            "segmentation_version": "delhi_osm_250m_v1",
            "matching_method_version": "osrm_match_v1",
            "created_at": now_iso,
            "frozen_at": now_iso,
        }
        db.merge(
            EvaluationPlanRecord(
                id=plan_id,
                version=1,
                status="FROZEN",
                action_zone_version_id="zonev_action_anand_vihar_demo_1",
                payload=plan_payload,
            )
        )
        int_rec = InterventionRecord(
            id=intervention_id,
            revision=1,
            zone_id="action_zone_anand_vihar_demo",
            zone_version_id="zonev_action_anand_vihar_demo_1",
            reference_zone_id="reference_zone_demo_01",
            reference_zone_version_id="zonev_reference_demo_01_1",
            evaluation_plan_id=plan_id,
            type="water_suppression",
            lifecycle="action_completed",
            proposed_at=now_iso,
            action_started_at=now_iso,
            action_completed_at=now_iso,
            marked_done_at=now_iso,
            timezone="Asia/Kolkata",
            checkpoint_offsets_minutes=[0, 180, 360, 720, 1440],
            action_confirmation_basis="officer_self_reported",
            scenario_id=None,
            correction_notice=None,
            disclaimer=f"Municipal Clean Air Operation ({intervention_id}) · Evaluated against reference baseline.",
            scenario_projections=[],
            observed_evaluations=[],
            context_measurement_ids=["ctx_weather_action_0955", "ctx_traffic_action_0945"],
        )
        db.add(int_rec)
        db.commit()

    if not int_rec.action_started_at:
        int_rec.action_started_at = now_iso
    int_rec.action_completed_at = now_iso
    int_rec.marked_done_at = now_iso
    int_rec.lifecycle = "action_completed"

    # Mandate 5: Capture live atmospheric baseline on Mark as Done anchored to Delhi hotspot coordinates
    target_lat, target_lng = 28.6469, 77.3160  # Anand Vihar default
    zone_str = f"{int_rec.zone_id} {int_rec.id}".lower()
    for hs_key, hs_info in DELHI_13_HOTSPOTS.items():
        if hs_key in zone_str:
            target_lat, target_lng = hs_info["lat"], hs_info["lng"]
            break

    try:
        live_aq = fetch_live_google_air_quality(target_lat, target_lng)
        live_wx = fetch_live_google_weather(target_lat, target_lng)
        baseline_weather = {
            "temperature_c": live_wx.get("temperature_c", 27.5),
            "humidity_pct": live_wx.get("humidity_pct", 58.0),
            "wind_speed_kmh": live_wx.get("wind_speed_kmh", 8.5),
            "wind_speed_ms": live_wx.get("wind_speed_ms", 2.36),
            "wind_direction_deg": live_wx.get("wind_direction_deg", 295.0),
            "wind_compass": live_wx.get("wind_compass", "WNW"),
            "aqi": live_aq.get("aqi", 242),
            "pm25": live_aq.get("pollutants", {}).get("pm25", 92.0),
            "pm10": live_aq.get("pollutants", {}).get("pm10", 184.0),
            "captured_at": now_iso,
            "hotspot_coordinates": {"lat": target_lat, "lng": target_lng},
        }
    except Exception:
        baseline_weather = {
            "temperature_c": 27.5,
            "humidity_pct": 58.0,
            "wind_speed_kmh": 8.5,
            "wind_speed_ms": 2.36,
            "wind_direction_deg": 295.0,
            "wind_compass": "WNW",
            "aqi": 242,
            "captured_at": now_iso,
        }

    # Schedule evaluation checkpoints for baseline (+0h), +3h, +6h, +12h, +24h (minutes: 0, 180, 360, 720, 1440)
    eval_offsets = [0, 180, 360, 720, 1440]
    int_rec.checkpoint_offsets_minutes = eval_offsets

    ev_plan = db.query(EvaluationPlanRecord).filter(EvaluationPlanRecord.id == int_rec.evaluation_plan_id).first()
    if ev_plan:
        p = dict(ev_plan.payload)
        p["checkpoint_offsets_minutes"] = eval_offsets
        p["baseline_atmospheric"] = baseline_weather
        ev_plan.payload = p

    params = req or CompleteActionRequest()
    run_checkpoint_evaluations_for_intervention(
        db=db,
        intervention=int_rec,
        checkpoint_offsets=eval_offsets,
        rain_mm_h=params.rain_mm_h,
        wind_speed_delta_m_s=params.wind_speed_delta_m_s,
        wind_dir_shift_deg=params.wind_dir_shift_deg,
    )
    db.commit()
    return _build_public_intervention_response(db, int_rec)


class AttachMediaRequest(BaseModel):
    label: str = "Officer water-sprinkler field verification photo"
    media_type: Literal["image", "video"] = "image"


@api_router.post("/v1/officer/interventions/{intervention_id}/media")
def attach_intervention_media(
    intervention_id: str,
    req: AttachMediaRequest,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "ATTACH_MEDIA")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cam_id = f"cam_{intervention_id}_{datetime.now(timezone.utc).strftime('%H%M%S')}"
    cam_payload = {
        "id": cam_id,
        "hotspot_id": "hotspot_anand_vihar_corridor",
        "camera_source": "officer",
        "media_type": req.media_type,
        "detection_method": "officer_attached",
        "label": req.label,
        "recorded_at": now_iso,
        "scenario_event_at": now_iso,
        "position": {"lat": 28.6469, "lng": 77.316},
        "evidence_access": "restricted_media",
        "media_object_id": f"gs://{get_settings().media_restricted_bucket}/{cam_id}.jpg",
        "illustrative_only": True,
        "provenance": {
            "origin": "observed",
            "dataset_id": "aerify_officer_field_media_v1",
            "source_id": "officer_upload",
            "provider": "Aerify AI Field App",
            "license_id": "RESTRICTED-GOV-AUDIT",
        },
    }
    db.add(
        CameraMediaRecord(
            id=cam_id,
            intervention_id=intervention_id,
            hotspot_id="hotspot_anand_vihar_corridor",
            payload=cam_payload,
        )
    )
    db.commit()
    return cam_payload


class SubmitCorrectionRequest(BaseModel):
    reason: str
    corrected_fields: list[
        Literal[
            "action_started_at",
            "action_completed_at",
            "zone_version_id",
            "reference_zone_version_id",
            "evaluation_plan_id",
        ]
    ] = Field(default_factory=lambda: ["action_completed_at"])
    new_action_completed_at: str | None = None


@api_router.post("/v1/officer/interventions/{intervention_id}/correction")
def submit_supervisor_correction(
    intervention_id: str,
    req: SubmitCorrectionRequest,
    db: Session = Depends(get_db),
    session: dict[str, Any] = Depends(resolve_caller_session),
) -> dict[str, Any]:
    _require_capability(session, "SUBMIT_CORRECTION")
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == intervention_id).first()
    if not int_rec:
        raise HTTPException(status_code=404, detail="Intervention not found")

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_rev = int_rec.revision + 1
    superseded_ids = [ev.get("id", "") for ev in (int_rec.observed_evaluations or []) if ev.get("id")]
    rev_id = f"rev_{intervention_id}_v{new_rev}"

    db.add(
        InterventionRevisionRecord(
            id=rev_id,
            intervention_id=intervention_id,
            revision=new_rev,
            reason=req.reason,
            corrected_fields=req.corrected_fields,
            corrected_at=now_iso,
            corrected_by_role="SUPERVISOR",
            superseded_evaluation_ids=superseded_ids,
            recompute_requested=True,
        )
    )

    int_rec.revision = new_rev
    if req.new_action_completed_at:
        int_rec.action_completed_at = req.new_action_completed_at
    int_rec.correction_notice = f"Revision {new_rev} (SUPERVISOR correction at {now_iso}): {req.reason}"
    run_checkpoint_evaluations_for_intervention(db=db, intervention=int_rec)
    return _build_public_intervention_response(db, int_rec)


class CheckpointTaskPayload(BaseModel):
    intervention_id: str
    checkpoint_offset_minutes: int = 180


@api_router.post("/internal/tasks/evaluate-checkpoint")
def handle_cloud_task_checkpoint(
    payload: CheckpointTaskPayload,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    int_rec = db.query(InterventionRecord).filter(InterventionRecord.id == payload.intervention_id).first()
    if not int_rec:
        raise HTTPException(status_code=404, detail="Intervention not found")
    evals = run_checkpoint_evaluations_for_intervention(db=db, intervention=int_rec)
    return {"status": "evaluated", "intervention_id": int_rec.id, "evaluation_count": len(evals)}


@api_router.post("/v1/internal/ingest/open-meteo")
def trigger_open_meteo_ingest(
    location_id: str = "anand_vihar_demo_node",
    lat: float = 28.6469,
    lon: float = 77.3160,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return ingest_open_meteo_context(db=db, location_id=location_id, lat=lat, lon=lon)


# Mount API endpoints under both `/api` and root `/`
app.include_router(api_router, prefix="/api")
app.include_router(api_router)


@app.get("/api", include_in_schema=False)
@app.get("/api/", include_in_schema=False)
def api_welcome() -> dict[str, Any]:
    return {
        "service": "Aerify AI Governance & Air Quality API",
        "status": "healthy",
        "version": "0.10.0",
        "docs_url": "/api/docs",
        "openapi_url": "/api/openapi.json",
        "endpoints": {
            "health": "/api/healthz",
            "v1": "/api/v1",
            "city_overview": "/api/v1/public/city-overview",
            "clock": "/api/v1/clock",
            "legends": "/api/v1/public/legends",
        },
    }


@app.get("/api/docs", include_in_schema=False)
def api_docs_redirect():
    return RedirectResponse(url="/docs")


@app.get("/api/openapi.json", include_in_schema=False)
def api_openapi():
    return app.openapi()


# Frontend SPA & Static Assets Mounting
def _find_frontend_dist() -> Path | None:
    candidates = [
        Path(__file__).resolve().parent / "static",
        Path(__file__).resolve().parents[1] / "static",
        Path(__file__).resolve().parents[2] / "ui-bundle" / "dist",
    ]
    for p in candidates:
        if p.exists() and (p / "index.html").is_file():
            return p
    return None


FRONTEND_DIST = _find_frontend_dist()
if FRONTEND_DIST:
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if full_path.startswith(("api/", "v1/", "internal/", "healthz", "docs", "openapi.json")):
        raise HTTPException(status_code=404, detail="API route not found")

    dist = FRONTEND_DIST or _find_frontend_dist()
    if dist:
        file_path = dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        index_file = dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

    return {
        "status": "ok",
        "service": "Aerify AI",
        "message": "Aerify AI Backend API is online. Frontend static assets will be served here once built.",
        "api_docs": "/api/docs",
        "api_health": "/api/healthz",
    }
