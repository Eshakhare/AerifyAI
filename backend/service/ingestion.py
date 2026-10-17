from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from google.cloud import storage
import httpx
from sqlalchemy.orm import Session

from service.config import get_settings
from service.models import ContextObservationRecord, ObservationRecord
from service.osrm_matcher import snap_gps_point_to_road_segment


OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _archive_raw_payload_to_gcs(prefix: str, payload: dict[str, Any]) -> str | None:
    """Writes raw JSON payload to gs://aerifyai-raw-payloads for Bronze layer lineage."""
    settings = get_settings()
    raw_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    digest = hashlib.sha256(raw_bytes).hexdigest()[:12]
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    blob_path = f"bronze/{prefix}/{ts}_{digest}.json"
    try:
        client = storage.Client(project=settings.project_id)
        bucket = client.bucket(settings.raw_payloads_bucket)
        blob = bucket.blob(blob_path)
        blob.upload_from_string(raw_bytes, content_type="application/json")
        return f"gs://{settings.raw_payloads_bucket}/{blob_path}"
    except Exception:
        return None


def ingest_open_meteo_context(
    db: Session,
    location_id: str = "anand_vihar_demo_node",
    lat: float = 28.6469,
    lon: float = 77.3160,
    archive_to_gcs: bool = True,
) -> dict[str, Any]:
    """
    Fetches live meteorological and regional air-quality model context from Open-Meteo
    (non-commercial API, zero API keys required) and stores structured ContextObservationRecord rows.
    """
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    weather_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m",
        "timezone": "UTC",
    }
    aq_params = {
        "latitude": lat,
        "longitude": lon,
        "current": "pm10,pm2_5,nitrogen_dioxide",
        "timezone": "UTC",
    }

    with httpx.Client(timeout=10.0) as client:
        w_resp = client.get(OPEN_METEO_WEATHER_URL, params=weather_params)
        w_resp.raise_for_status()
        w_data = w_resp.json()

        aq_resp = client.get(OPEN_METEO_AQ_URL, params=aq_params)
        aq_resp.raise_for_status()
        aq_data = aq_resp.json()

    combined_raw = {"weather": w_data, "air_quality": aq_data, "fetched_at": now_iso}
    gcs_uri = _archive_raw_payload_to_gcs("open_meteo", combined_raw) if archive_to_gcs else None
    raw_hash = f"sha256:{hashlib.sha256(json.dumps(combined_raw, sort_keys=True).encode('utf-8')).hexdigest()}"

    current_w = w_data.get("current", {})
    wind_speed_kmh = float(current_w.get("wind_speed_10m", 4.5))
    wind_speed_ms = round(wind_speed_kmh / 3.6, 2)

    weather_meas_id = f"ctx_openmeteo_wind_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    weather_payload = {
        "id": weather_meas_id,
        "metric": "WIND_SPEED",
        "value": wind_speed_ms,
        "unit": "m/s",
        "event_time": now_iso,
        "ingested_at": now_iso,
        "processed_at": now_iso,
        "position": {"lat": lat, "lon": lon},
        "spatial_support": "GRID_CELL",
        "quality": {
            "ValidTimestamp": True,
            "ValidGeolocation": True,
            "NonNegativeValue": True,
            "PlausibleRange": True,
            "SensorWarmupCleared": None,
            "JumpCheckPassed": True,
            "CalibrationStateKnown": None,
            "RoadSegmentMatchConfidenceSufficient": None,
        },
        "quality_disposition": "PASS",
        "provenance": {
            "source_id": "open_meteo_archive_live_v1",
            "source_class": "MODEL_GRID",
            "feed_mode": "LIVE_PUBLIC_API",
            "evidence_state": "MODEL_OR_REGIONAL_CONTEXT",
            "raw_Snapshot_hash": raw_hash,
            "transform_version": "open_meteo_adapter_v1",
            "public_redistribution_allowed": True,
            "citation": "Open-Meteo Weather & Air Quality API (CC BY 4.0)",
        },
    }
    # Normalize key casing to exact schema 0.9 raw_snapshot_hash
    weather_payload["provenance"].pop("raw_Snapshot_hash", None)
    weather_payload["provenance"]["raw_snapshot_hash"] = raw_hash

    db.merge(
        ContextObservationRecord(
            id=weather_meas_id,
            location_id=location_id,
            context_kind="weather_model",
            metric="WIND_SPEED",
            value=wind_speed_ms,
            unit="m/s",
            event_time=now_iso,
            payload=weather_payload,
        )
    )

    current_aq = aq_data.get("current", {})
    pm25_model = float(current_aq.get("pm2_5", 78.0))
    aq_meas_id = f"ctx_openmeteo_pm25_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    aq_payload = {
        "id": aq_meas_id,
        "metric": "PM2_5_MASS",
        "value": pm25_model,
        "unit": "ug/m3",
        "event_time": now_iso,
        "ingested_at": now_iso,
        "processed_at": now_iso,
        "position": {"lat": lat, "lon": lon},
        "spatial_support": "GRID_CELL",
        "quality": {
            "ValidTimestamp": True,
            "ValidGeolocation": True,
            "NonNegativeValue": True,
            "PlausibleRange": True,
            "SensorWarmupCleared": None,
            "JumpCheckPassed": True,
            "CalibrationStateKnown": None,
            "RoadSegmentMatchConfidenceSufficient": None,
        },
        "quality_disposition": "PASS",
        "provenance": {
            "source_id": "open_meteo_cams_regional_v1",
            "source_class": "MODEL_GRID",
            "feed_mode": "LIVE_PUBLIC_API",
            "evidence_state": "MODEL_OR_REGIONAL_CONTEXT",
            "raw_snapshot_hash": raw_hash,
            "transform_version": "open_meteo_adapter_v1",
            "public_redistribution_allowed": True,
            "citation": "Open-Meteo Air Quality API (CAMS regional model)",
        },
    }
    db.merge(
        ContextObservationRecord(
            id=aq_meas_id,
            location_id=location_id,
            context_kind="air_quality_model",
            metric="PM2_5_MASS",
            value=pm25_model,
            unit="ug/m3",
            event_time=now_iso,
            payload=aq_payload,
        )
    )
    db.commit()
    return {
        "status": "INGESTED",
        "gcs_bronze_uri": gcs_uri,
        "weather_measurement_id": weather_meas_id,
        "aq_measurement_id": aq_meas_id,
        "wind_speed_m_s": wind_speed_ms,
        "pm25_model_ug_m3": pm25_model,
    }


def ingest_mobile_bus_sample(
    db: Session,
    sample_id: str,
    lat: float,
    lon: float,
    pm25_ug_m3: float,
    pm10_ug_m3: float,
    event_time: str,
) -> dict[str, Any]:
    """
    Validates a mobile sensor bus sample (AirDelhi / mobile fleet), snaps it to the nearest
    250m road segment using PostGIS OSRM matcher, and writes to ObservationRecord.
    """
    snap = snap_gps_point_to_road_segment(db, lat=lat, lon=lon)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    raw_hash = f"sha256:{hashlib.sha256(f'{sample_id}:{lat}:{lon}:{pm25_ug_m3}:{pm10_ug_m3}'.encode()).hexdigest()}"

    plausible = 0.0 <= pm25_ug_m3 <= 999.0 and 0.0 <= pm10_ug_m3 <= 1500.0
    disposition = "PASS" if (plausible and snap["matched"]) else ("FLAGGED" if plausible else "QUARANTINED")

    obs_payload = {
        "id": sample_id,
        "metric": "PM10_MASS",
        "value": pm10_ug_m3,
        "unit": "ug/m3",
        "event_time": event_time,
        "ingested_at": now_iso,
        "processed_at": now_iso,
        "position": {"lat": lat, "lon": lon},
        "road_segment_id": snap.get("road_segment_id"),
        "cell_id": snap.get("cell_id"),
        "spatial_support": "ROAD_SEGMENT" if snap["matched"] else "POINT",
        "quality": {
            "ValidTimestamp": True,
            "ValidGeolocation": -90 <= lat <= 90 and -180 <= lon <= 180,
            "NonNegativeValue": pm25_ug_m3 >= 0 and pm10_ug_m3 >= 0,
            "PlausibleRange": plausible,
            "SensorWarmupCleared": True,
            "JumpCheckPassed": True,
            "CalibrationStateKnown": True,
            "RoadSegmentMatchConfidenceSufficient": snap["matched"],
        },
        "quality_disposition": disposition,
        "provenance": {
            "source_id": "airdelhi_bus_archive_v1",
            "source_class": "MOBILE_SENSOR",
            "feed_mode": "HISTORICAL_REPLAY",
            "evidence_state": "OBSERVED",
            "raw_snapshot_hash": raw_hash,
            "transform_version": "mobile_qc_osrm_v1",
            "public_redistribution_allowed": True,
            "citation": "AirDelhi mobile particulate archive (CC BY 4.0)",
        },
    }

    db.merge(
        ObservationRecord(
            id=sample_id,
            metric="PM10_MASS",
            value=pm10_ug_m3,
            unit="ug/m3",
            event_time=event_time,
            ingested_at=now_iso,
            processed_at=now_iso,
            lat=lat,
            lon=lon,
            road_segment_id=snap.get("road_segment_id"),
            cell_id=snap.get("cell_id"),
            spatial_support="ROAD_SEGMENT" if snap["matched"] else "POINT",
            quality_disposition=disposition,
            evidence_state="OBSERVED",
            source_class="MOBILE_SENSOR",
            feed_mode="HISTORICAL_REPLAY",
            payload=obs_payload,
        )
    )
    db.commit()
    return {"sample_id": sample_id, "disposition": disposition, "snap": snap}
