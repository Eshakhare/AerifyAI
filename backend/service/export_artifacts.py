from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from google.cloud import storage
from sqlalchemy.orm import Session

from service.config import get_settings
from service.database import get_session_factory
from service.models import AdministrativeArea, AnalysisCell, RoadSegment


def _sha256_bytes(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def build_geojson_bundles(db: Session) -> dict[str, bytes]:
    districts = db.query(AdministrativeArea).all()
    district_features = []
    for d in districts:
        district_features.append(
            {
                "type": "Feature",
                "id": d.id,
                "properties": {
                    "id": d.id,
                    "name": d.name,
                    "parent_id": d.parent_id,
                    "pm25_value": d.pm25_value,
                    "pm10_value": d.pm10_value,
                    "aqi_value": d.aqi_value,
                },
                "geometry": d.geojson_data,
            }
        )
    districts_fc = {
        "type": "FeatureCollection",
        "version": "aerify_demo_geography_v1",
        "features": district_features,
    }

    cells = db.query(AnalysisCell).all()
    cell_features = []
    for c in cells:
        cell_features.append(
            {
                "type": "Feature",
                "id": c.id,
                "properties": {
                    "id": c.id,
                    "name": c.name,
                    "district_id": c.district_id,
                    "pm25_value": c.pm25_value,
                    "pm10_value": c.pm10_value,
                    "coverage_state": c.coverage_state,
                    "evidence_state": c.evidence_state,
                },
                "geometry": c.geojson_data,
            }
        )
    cells_fc = {
        "type": "FeatureCollection",
        "version": "delhi_grid_1km_v1",
        "features": cell_features,
    }

    roads = db.query(RoadSegment).all()
    road_features = []
    for r in roads:
        road_features.append(
            {
                "type": "Feature",
                "id": r.id,
                "properties": {
                    "id": r.id,
                    "name": r.name,
                    "cell_id": r.cell_id,
                    "segmentation_version": r.segmentation_version,
                    "road_network_version": r.road_network_version,
                    "pm25_value": r.pm25_value,
                    "pm10_value": r.pm10_value,
                    "coverage_state": r.coverage_state,
                },
                "geometry": r.geojson_data,
            }
        )
    roads_fc = {
        "type": "FeatureCollection",
        "version": "delhi_osm_250m_v1",
        "features": road_features,
    }

    districts_bytes = json.dumps(districts_fc, separators=(",", ":"), sort_keys=True).encode("utf-8")
    cells_bytes = json.dumps(cells_fc, separators=(",", ":"), sort_keys=True).encode("utf-8")
    roads_bytes = json.dumps(roads_fc, separators=(",", ":"), sort_keys=True).encode("utf-8")

    manifest = {
        "schema_version": "0.9",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "road_network_version": "geofabrik_northern_zone_2026_10_10",
        "segmentation_version": "delhi_osm_250m_v1",
        "artifacts": {
            "districts.geojson": {
                "path": "v1/districts.geojson",
                "sha256": _sha256_bytes(districts_bytes),
                "feature_count": len(district_features),
            },
            "analysis_cells.geojson": {
                "path": "v1/analysis_cells.geojson",
                "sha256": _sha256_bytes(cells_bytes),
                "feature_count": len(cell_features),
            },
            "measured_roads.geojson": {
                "path": "v1/measured_roads.geojson",
                "sha256": _sha256_bytes(roads_bytes),
                "feature_count": len(road_features),
            },
        },
    }
    manifest_bytes = json.dumps(manifest, indent=2, sort_keys=True).encode("utf-8")

    return {
        "v1/districts.geojson": districts_bytes,
        "v1/analysis_cells.geojson": cells_bytes,
        "v1/measured_roads.geojson": roads_bytes,
        "v1/manifest.json": manifest_bytes,
    }


def upload_artifacts_to_gcs() -> dict[str, Any]:
    settings = get_settings()
    session_factory = get_session_factory()
    with session_factory() as db:
        bundles = build_geojson_bundles(db)

    client = storage.Client(project=settings.project_id)
    bucket = client.bucket(settings.public_artifacts_bucket)
    uploaded = []
    for blob_path, content in bundles.items():
        blob = bucket.blob(blob_path)
        blob.cache_control = "public, max-age=3600"
        blob.upload_from_string(content, content_type="application/geo+json" if blob_path.endswith(".geojson") else "application/json")
        uploaded.append(f"gs://{settings.public_artifacts_bucket}/{blob_path}")

    return {"uploaded": uploaded, "manifest": json.loads(bundles["v1/manifest.json"].decode("utf-8"))}


if __name__ == "__main__":
    res = upload_artifacts_to_gcs()
    print("Uploaded public GeoJSON artifacts to GCS:", json.dumps(res, indent=2))
