from __future__ import annotations

import math
from typing import Any
from sqlalchemy import text
from sqlalchemy.orm import Session


MATCHING_METHOD_VERSION = "osrm_match_v1"
SEGMENTATION_VERSION = "delhi_osm_250m_v1"
ROAD_NETWORK_VERSION = "geofabrik_northern_zone_2026_10_10"
MIN_CONFIDENCE = 0.50
MAX_SNAP_DISTANCE_M = 40.0


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def snap_gps_point_to_road_segment(
    db: Session,
    lat: float,
    lon: float,
    max_distance_m: float = MAX_SNAP_DISTANCE_M,
) -> dict[str, Any]:
    """
    Matches a GPS trace point to the nearest canonical 250m road segment in PostGIS
    using ST_DistanceSphere, enforcing confidence >= 0.50 and distance <= 40m.
    """
    stmt = text(
        """
        SELECT
            id,
            cell_id,
            name,
            ST_DistanceSphere(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) AS distance_m
        FROM road_segments
        WHERE geom IS NOT NULL
        ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        LIMIT 1
        """
    )
    row = db.execute(stmt, {"lat": lat, "lon": lon}).mappings().first()
    if not row:
        return {
            "matched": False,
            "reason": "NO_SEGMENTS_IN_NETWORK",
            "matching_method_version": MATCHING_METHOD_VERSION,
        }

    dist_m = float(row["distance_m"])
    confidence = max(0.0, round(1.0 - (dist_m / 80.0), 3))
    matched = dist_m <= max_distance_m and confidence >= MIN_CONFIDENCE

    return {
        "matched": matched,
        "road_segment_id": row["id"] if matched else None,
        "candidate_segment_id": row["id"],
        "cell_id": row["cell_id"],
        "road_name": row["name"],
        "snap_distance_m": round(dist_m, 2),
        "match_confidence": confidence,
        "matching_method_version": MATCHING_METHOD_VERSION,
        "segmentation_version": SEGMENTATION_VERSION,
        "road_network_version": ROAD_NETWORK_VERSION,
    }
