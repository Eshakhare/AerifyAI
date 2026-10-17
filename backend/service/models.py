"""SQLAlchemy 2.0 + GeoAlchemy2 PostGIS ORM Models for Aerify AI (Schema 0.9 / Arch 0.10)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from service.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AppUser(Base):
    __tablename__ = "app_users"

    firebase_uid: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="PUBLIC")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    actor_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CpcbStation(Base):
    __tablename__ = "cpcb_stations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    agency: Mapped[str] = mapped_column(String(32), nullable=False, default="DPCC")
    district_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    baseline_pm25: Mapped[float] = mapped_column(Float, nullable=False, default=95.0)
    baseline_pm10: Mapped[float] = mapped_column(Float, nullable=False, default=195.0)
    baseline_no2: Mapped[float] = mapped_column(Float, nullable=False, default=42.0)
    aqi: Mapped[float] = mapped_column(Float, nullable=False, default=215.0)
    primary_pollutant: Mapped[str] = mapped_column(String(32), nullable=False, default="PM2.5")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MobileSensorTelemetry(Base):
    __tablename__ = "mobile_sensor_telemetry"
    __table_args__ = (
        Index("idx_telemetry_time_space", "timestamp", "district_id", "latitude", "longitude"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    bus_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    route_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    district_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, nullable=False, default=24.0)
    pm1: Mapped[float] = mapped_column(Float, nullable=False)
    pm2_5: Mapped[float] = mapped_column(Float, nullable=False)
    pm10: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False, default=54.0)
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=26.5)


class AdministrativeArea(Base):
    __tablename__ = "administrative_areas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    geom: Mapped[Any] = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    geojson_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    pm25_value: Mapped[float] = mapped_column(Float, nullable=False, default=90.0)
    pm10_value: Mapped[float] = mapped_column(Float, nullable=False, default=180.0)
    aqi_value: Mapped[float] = mapped_column(Float, nullable=False, default=210.0)
    primary_pollutant: Mapped[str] = mapped_column(String(32), nullable=False, default="PM2.5")


class AnalysisCell(Base):
    __tablename__ = "analysis_cells"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    district_id: Mapped[str] = mapped_column(String(64), ForeignKey("administrative_areas.id"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    geom: Mapped[Any] = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    geojson_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    pm25_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm10_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage_state: Mapped[str] = mapped_column(String(32), nullable=False, default="current")
    evidence_state: Mapped[str] = mapped_column(String(32), nullable=False, default="DIRECTLY_OBSERVED")
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=65)
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    last_observation_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provenance_mix: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    cell_id: Mapped[str] = mapped_column(String(64), ForeignKey("analysis_cells.id"), index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    segmentation_version: Mapped[str] = mapped_column(String(64), nullable=False, default="delhi_osm_250m_v1")
    road_network_version: Mapped[str] = mapped_column(String(64), nullable=False, default="geofabrik_northern_zone_2026_10_10")
    geom: Mapped[Any] = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    geojson_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    pm25_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm10_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage_state: Mapped[str] = mapped_column(String(32), nullable=False, default="current")
    evidence_state: Mapped[str] = mapped_column(String(32), nullable=False, default="DIRECTLY_OBSERVED")
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=42)
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_observation_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provenance_mix: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class Zone(Base):
    __tablename__ = "zones"

    zone_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    district_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    purposes: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    latest_zone_version_id: Mapped[str] = mapped_column(String(128), nullable=False)
    anchor_state: Mapped[str] = mapped_column(String(32), nullable=False, default="UNVERIFIED")
    verified_anchor_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    display_label: Mapped[str] = mapped_column(Text, nullable=False)
    observation_grade_wording_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    geometry_status: Mapped[str] = mapped_column(String(32), nullable=False, default="PLACEHOLDER")
    flagship_status: Mapped[str] = mapped_column(String(32), nullable=False, default="NOT_FLAGSHIP")
    scenario_case_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    route_version_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class ZoneVersionRecord(Base):
    __tablename__ = "zone_versions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    zone_id: Mapped[str] = mapped_column(String(128), ForeignKey("zones.zone_id"), index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    geom: Mapped[Any] = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    geometry: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    geometry_ref: Mapped[str | None] = mapped_column(String(256), nullable=True)
    geometry_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    source_dataset_id: Mapped[str] = mapped_column(String(128), nullable=False)
    effective_at: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class RouteVersionRecord(Base):
    __tablename__ = "route_versions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    route_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    geom: Mapped[Any] = mapped_column(Geometry(geometry_type="GEOMETRY", srid=4326), nullable=True)
    geometry: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    geometry_ref: Mapped[str | None] = mapped_column(String(256), nullable=True)
    geometry_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    source_dataset_id: Mapped[str] = mapped_column(String(128), nullable=False)
    road_network_version: Mapped[str] = mapped_column(String(64), nullable=False)
    segmentation_version: Mapped[str] = mapped_column(String(64), nullable=False)
    matching_method_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    effective_at: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)


class ObservationRecord(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    metric: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    event_time: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    processed_at: Mapped[str] = mapped_column(String(64), nullable=False)
    evidence_state: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class ContextObservationRecord(Base):
    __tablename__ = "context_observations"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    location_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    context_kind: Mapped[str] = mapped_column(String(64), nullable=False)
    metric: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    event_time: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class FacilityRecord(Base):
    __tablename__ = "facilities"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    distance_m: Mapped[float] = mapped_column(Float, nullable=False)
    bearing_deg: Mapped[float] = mapped_column(Float, nullable=False)
    wind_alignment: Mapped[str] = mapped_column(String(32), nullable=False)
    registry_source_id: Mapped[str] = mapped_column(String(128), nullable=False)
    satellite_measurement_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class ScenarioRunRecord(Base):
    __tablename__ = "scenario_runs"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    catalog_version: Mapped[str] = mapped_column(String(64), nullable=False)
    design_intent: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class EvaluationPlanRecord(Base):
    __tablename__ = "evaluation_plans"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="FROZEN")
    action_zone_version_id: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class InterventionRecord(Base):
    __tablename__ = "interventions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    zone_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    zone_version_id: Mapped[str] = mapped_column(String(128), nullable=False)
    reference_zone_id: Mapped[str] = mapped_column(String(128), nullable=False)
    reference_zone_version_id: Mapped[str] = mapped_column(String(128), nullable=False)
    evaluation_plan_id: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False, default="water_suppression")
    lifecycle: Mapped[str] = mapped_column(String(64), nullable=False, default="draft")
    proposed_at: Mapped[str] = mapped_column(String(64), nullable=False)
    action_started_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action_completed_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    marked_done_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Kolkata")
    checkpoint_offsets_minutes: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    action_confirmation_basis: Mapped[str] = mapped_column(String(64), nullable=False, default="officer_self_reported")
    scenario_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    correction_notice: Mapped[str | None] = mapped_column(Text, nullable=True)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    scenario_projections: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    observed_evaluations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    context_measurement_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class InterventionRevisionRecord(Base):
    __tablename__ = "intervention_revisions"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    intervention_id: Mapped[str] = mapped_column(String(128), ForeignKey("interventions.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    corrected_at: Mapped[str] = mapped_column(String(64), nullable=False)
    corrected_by_role: Mapped[str] = mapped_column(String(32), nullable=False, default="SUPERVISOR")
    superseded_evaluation_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    recompute_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ActionOverlapRecord(Base):
    __tablename__ = "action_overlap_assessments"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    primary_intervention_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class CameraMediaRecord(Base):
    __tablename__ = "camera_media"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    intervention_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    hotspot_id: Mapped[str] = mapped_column(String(128), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class CachedNarrativeRecord(Base):
    __tablename__ = "cached_narratives"

    cache_key: Mapped[str] = mapped_column(String(256), primary_key=True)
    agent_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    is_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    narrative_text: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_references: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[str] = mapped_column(String(64), nullable=False)


class AuditEventRecord(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    actor_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(128), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
