/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Delhi Environmental Intelligence & Municipal Action Platform
 * Contract Schema 0.9 Types
 * All contract types live in this single file with snake_case property names
 * matching server DTOs and fixtures verbatim.
 */

export type UtcTime = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type Metric =
  | 'AQI'
  | 'PM2_5_MASS'
  | 'PM10_MASS'
  | 'PM1_MASS'
  | 'NO2'
  | 'SO2'
  | 'CO'
  | 'O3'
  | 'WIND_SPEED'
  | 'WIND_DIRECTION'
  | 'TEMPERATURE'
  | 'RELATIVE_HUMIDITY'
  | 'PRECIPITATION_RATE'
  | string;

export type Origin =
  | 'observed_direct'
  | 'observed_nearby'
  | 'modeled_context'
  | 'synthetic_scenario'
  | 'regulatory_station'
  | string;

export type EvidenceState =
  | 'DIRECTLY_OBSERVED'
  | 'OBSERVED_NEARBY'
  | 'MODEL_ESTIMATED'
  | 'SYNTHETIC'
  | 'INSUFFICIENT_EVIDENCE';

export type ClockMode = 'REAL' | 'SCENARIO' | 'TEST';

export type Role = 'PUBLIC' | 'OFFICER' | 'SUPERVISOR';

export type Capability =
  | 'VIEW_PUBLIC'
  | 'VIEW_RESTRICTED_MEDIA'
  | 'CREATE_DRAFT'
  | 'EDIT_DRAFT'
  | 'START_ACTION'
  | 'COMPLETE_ACTION'
  | 'ATTACH_MEDIA'
  | 'SUBMIT_CORRECTION';

export type BandId =
  | 'GOOD'
  | 'SATISFACTORY'
  | 'MODERATE'
  | 'POOR'
  | 'VERY_POOR'
  | 'SEVERE';

export interface SpatialSupport {
  kind: 'point' | 'grid_cell' | 'road_segment' | 'satellite_footprint' | 'polygon' | string;
  support_id: string;
  position: GeoPoint;
  geometry_ref: string | null;
  nominal_resolution_m: number | null;
  radius_m: number | null;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: any;
}

export interface GeometryTransport {
  encoding: 'geojson';
  data: GeoJSONGeometry;
}

export interface Provenance {
  origin: Origin;
  dataset_id: string;
  source_id: string;
  provider: string;
  license_id: string | null;
  method_version: string | null;
  scenario_id: string | null;
  generator_version: string | null;
  anchor_record_ids: string[];
}

export interface ContextDescriptor {
  context_kind: 'weather_model' | 'air_quality_model' | 'satellite_retrieval';
  product_id: string;
  product_version: string | null;
  measurement_basis: string;
  temporal_aggregation: string;
  resolution_label: string;
  footprint: GeometryTransport | null;
  qa_value: number | null;
  cloud_fraction: number | null;
}

export interface Measurement {
  id: string;
  metric: Metric;
  value: number;
  unit: string;
  event_time: UtcTime;
  event_time_end?: UtcTime | null;
  processed_at?: UtcTime | null;
  generated_at?: UtcTime | null;
  device_id?: string | null;
  raw_record_id?: string | null;
  calibration_version?: string | null;
  road_network_version?: string | null;
  segmentation_version?: string | null;
  matching_method_version?: string | null;
  map_match_confidence?: number | null;
  snapped_distance_m?: number | null;
  original_position?: GeoPoint | null;
  evidence_state: EvidenceState;
  spatial_support: SpatialSupport;
  quality_flags: string[];
  provenance: Provenance;
  context?: ContextDescriptor | null;
}

export interface Coverage {
  state: 'current' | 'stale' | 'sparse' | 'modeled_only' | 'synthetic_only' | 'no_data';
  sample_count: number;
  source_count: number;
  last_observation_at: UtcTime | null;
  expected_interval_seconds?: number | null;
}

export interface LiveWeatherSnapshot {
  temperature_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  wind_Speed_ms?: number;
  wind_direction_deg: number;
  wind_compass: string;
}

export interface LiveAirQualitySnapshot {
  pm2_5: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
  us_aqi: number;
  european_aqi: number;
  indian_aqi: number;
  primary_pollutant: string;
  cpcb_category: string;
}

export interface MapAggregate {
  id: string;
  level: 'city' | 'district' | 'analysis_cell' | 'road_segment';
  parent_id: string | null;
  name: string;
  metric: Metric;
  value: number | null;
  unit: string;
  category: BandId | null;
  legend_id: string | null;
  window_start: UtcTime;
  window_end: UtcTime;
  coverage: Coverage;
  evidence_state: EvidenceState;
  method_version: string;
  provenance_mix: string[];
  geometry_ref: string | null;
  geometry?: GeoJSONGeometry | null;
  // Live enriched district & map properties
  aqi?: number;
  cpcb_category?: string;
  primary_pollutant?: string;
  pm25_4h_avg?: number;
  pm10_4h_avg?: number;
  pm25_24h_avg?: number;
  pm10_24h_avg?: number;
  sample_count_24h?: number;
  centroid?: GeoPoint;
  headquarters?: string;
  weather?: LiveWeatherSnapshot;
}

export interface LegendBand {
  id: BandId;
  label: string;
  severity_rank: number;
  lower_bound: number;
  upper_bound: number | null;
}

export interface Legend {
  id: string;
  version: string;
  metric: Metric;
  unit: string;
  kind: 'concentration_band' | 'official_aqi';
  boundary_rule: 'upper_inclusive';
  reference_averaging_window: string;
  bands: LegendBand[];
  notice: string;
  source_citation: string;
  verification_status: string;
}

export interface NearbySourceContext {
  id: string;
  name: string;
  source_type: string;
  distance_m: number;
  bearing_deg: number;
  wind_alignment: 'upwind' | 'downwind' | 'crosswind' | 'variable' | string;
  registry_source_id: string;
  satellite_measurement_ids: string[];
  causation_claimed: boolean;
}

export interface ConfounderFinding {
  code:
    | 'RAIN'
    | 'WIND_SPEED_CHANGE'
    | 'WIND_DIRECTION_SHIFT'
    | 'TRAFFIC_DIVERGENCE'
    | 'ACTION_OVERLAP'
    | 'REFERENCE_CONTAMINATED'
    | 'LOW_COVERAGE'
    | 'INSUFFICIENT_BINS'
    | 'PRETREND_FAILED';
  state: 'DISCLOSED' | 'TRIGGERED';
  outcome: 'confounded' | 'inconclusive' | null;
  applies_to: 'ACTION' | 'REFERENCE' | 'COMPARISON' | string;
  observed_value: number;
  threshold: number;
  unit: string;
  policy_version: string;
  input_measurement_ids: string[];
  display_text: string;
}

export interface ScenarioRun {
  id: string;
  catalog_version: string;
  case_id: string;
  design_intent: string;
  scenario_time: UtcTime;
  generated_at: UtcTime;
  generator_version: string;
  config_hash: string;
  seed: number;
  anchor_record_ids: string[];
  context_record_ids: string[];
  route_version_ids: string[];
  action_zone_version_id: string;
  reference_zone_version_ids: string[];
  evaluation_plan_id: string;
  generated_metrics: Metric[];
  assumptions: string[];
  time_alignment: string;
  branches: string[];
  clock_mode: ClockMode;
  display_label: string;
}

export interface ZoneVersion {
  id: string;
  zone_id: string;
  version: number;
  purpose: 'ACTION' | 'REFERENCE' | 'EVALUATION';
  name: string;
  geometry: GeometryTransport;
  geometry_ref: string | null;
  geometry_hash: string;
  source_dataset_id: string;
  effective_at: UtcTime;
  created_at: UtcTime;
}

export interface ZoneSummary {
  zone_id: string;
  name: string;
  district_id: string | null;
  purposes: ('ACTION' | 'REFERENCE' | 'EVALUATION')[];
  latest_zone_version_id: string;
  anchor_state: 'ANCHORED' | 'NO_VERIFIED_ANCHORS' | 'UNVERIFIED';
  verified_anchor_count: number | null;
  display_label: string;
  observation_grade_wording_allowed: boolean;
  geometry_status: 'PLACEHOLDER' | 'VERIFIED';
  flagship_status: 'CONFIRMED' | 'PROPOSED' | 'NOT_FLAGSHIP';
  scenario_case_id: string | null;
  route_version_ids: string[];
}

export interface RouteVersion {
  id: string;
  route_id: string;
  version: number;
  name: string;
  road_segment_ids: string[];
  total_length_m: number;
  geometry?: GeometryTransport | null;
}

export interface EvaluationPlan {
  id: string;
  version: number;
  status: 'DRAFT' | 'FROZEN';
  action_zone_version_id: string;
  reference_zone_version_ids: string[];
  checkpoint_offsets_minutes: number[];
  window_minutes: number[];
  minimum_coverage_ratio: number;
  minimum_independent_bins: number;
  reference_selection_method_version: string;
  confounder_policy_version: string;
  overlap_policy_version: string;
  road_network_version: string;
  segmentation_version: string;
  matching_method_version: string;
  created_at: UtcTime;
  frozen_at: UtcTime | null;
}

export interface Intervention {
  id: string;
  revision: number;
  zone_id: string;
  zone_version_id: string;
  reference_zone_id: string | null;
  reference_zone_version_id: string | null;
  evaluation_plan_id: string | null;
  type: string;
  lifecycle:
    | 'draft'
    | 'planned'
    | 'in_progress'
    | 'completed'
    | 'result_available'
    | 'cancelled';
  proposed_at: UtcTime;
  action_started_at: UtcTime | null;
  action_completed_at: UtcTime | null;
  marked_done_at: UtcTime | null;
  timezone: string;
  checkpoint_offsets_minutes: number[];
  action_confirmation_basis: string;
  scenario_id: string | null;
}

export interface InterventionRevision {
  revision_id: string;
  intervention_id: string;
  revision_number: number;
  changed_at: UtcTime;
  changed_by: string;
  reason: string;
}

export interface ClockMetadata {
  clock_mode: ClockMode;
  effective_now: UtcTime;
  scenario_id: string | null;
  clock_revision: number;
}

export interface ActionOverlapAssessment {
  id: string;
  primary_intervention_id: string;
  interfering_intervention_id: string;
  overlap_policy_version: string;
  overlap_start: UtcTime;
  overlap_end: UtcTime;
  overlapping_road_segment_ids: string[];
  affected_bin_starts: UtcTime[];
  reference_contaminated: boolean;
  excluded_bin_count: number;
  remaining_eligible_bin_count: number;
  outcome: 'inconclusive' | 'confounded' | 'eligible' | string;
  reason_code: string;
}

export interface EffectInterval {
  low: number;
  high: number;
  level: number;
  method: string;
}

export interface ScenarioProjection {
  id: string;
  scenario_id: string;
  intervention_id: string;
  intervention_revision: number;
  evaluation_plan_id: string;
  checkpoint_offset_minutes: number;
  metric: Metric;
  status:
    | 'pending'
    | 'simulated_improvement'
    | 'simulated_no_measurable_improvement'
    | 'confounded_scenario'
    | 'insufficient_scenario_data';
  action_pre_ug_m3: number | null;
  action_post_ug_m3: number | null;
  reference_pre_ug_m3: number | null;
  reference_post_ug_m3: number | null;
  effect_ug_m3: number | null;
  effect_interval: EffectInterval | null;
  method_version: string;
  generated_at: UtcTime;
  confounders: ConfounderFinding[];
  limitations: string[];
}

export interface ObservedEvaluation {
  id: string;
  intervention_id: string;
  intervention_revision: number;
  evaluation_plan_id: string;
  checkpoint_offset_minutes: number;
  metric: Metric;
  status:
    | 'pending'
    | 'observed_improvement_association'
    | 'no_measurable_change'
    | 'confounded'
    | 'inconclusive';
  action_pre_ug_m3: number | null;
  action_post_ug_m3: number | null;
  reference_pre_ug_m3: number | null;
  reference_post_ug_m3: number | null;
  effect_ug_m3: number | null;
  effect_interval: EffectInterval | null;
  method_version: string;
  evaluated_at: UtcTime;
  confounders: ConfounderFinding[];
  limitations: string[];
}

export interface AqiDerivation {
  kind:
    | 'regulatory_cpcb_aqi'
    | 'estimated_local_aqi'
    | 'pm_based_air_quality_indicator'
    | 'pollutant_subindex';
  data_sufficiency_status: 'sufficient' | 'insufficient';
  insufficiency_reason: string | null;
  primary_pollutant: string | null;
  sub_indices?: Record<string, number>;
}

export interface CameraEvent {
  id: string;
  hotspot_id: string;
  camera_source: string;
  media_type: 'video' | 'image' | string;
  detection_method: string;
  label: string;
  recorded_at: UtcTime;
  scenario_event_at: UtcTime | null;
  position: GeoPoint;
  evidence_access: 'restricted_media' | 'public_media' | string;
  media_object_id: string;
  illustrative_only: boolean;
  provenance: Provenance;
}

export interface PublicInterventionResponse {
  schema_version: '0.9';
  clock: ClockMetadata;
  intervention: Intervention;
  evaluation_plan: EvaluationPlan;
  zone_versions: ZoneVersion[];
  scenario_projections: ScenarioProjection[];
  observed_evaluations: ObservedEvaluation[];
  context_measurement_ids: string[];
  correction_notice: string | null;
  disclaimer: string;
}

export interface LocalityInfo {
  is_within_delhi_ncr: boolean;
  district_id: string;
  district_name: string;
  locality_name: string;
  nearest_landmark: string;
  distance_to_landmark_m: number;
}

export interface DistrictRollingWindow {
  window: '4h' | '24h';
  pm2_5_avg: number;
  pm10_avg: number;
  pm2_5_min: number;
  pm2_5_max: number;
  sample_count: number;
}

export interface DistrictSummaryResponse {
  schema_version: '0.9';
  district_id: string;
  district_name: string;
  headquarters: string;
  aqi: number;
  cpcb_category: string;
  primary_pollutant: string;
  rolling_4h: DistrictRollingWindow;
  rolling_24h: DistrictRollingWindow;
  hourly_trend: Array<{
    timestamp: string;
    pm2_5: number;
    pm10: number;
    speed_kmh: number;
    samples: number;
  }>;
  cpcb_stations: Array<{
    id: string;
    name: string;
    agency: string;
    latitude: number;
    longitude: number;
    pm2_5: number;
    pm10: number;
    no2: number;
    aqi: number;
    primary_pollutant: string;
  }>;
  live_weather: LiveWeatherSnapshot;
  live_regional_aq: LiveAirQualitySnapshot;
  last_observation_at?: string | null;
}

export interface NearbySummary {
  requested_position: GeoPoint;
  locality_info?: LocalityInfo;
  live_weather?: LiveWeatherSnapshot;
  live_air_quality?: LiveAirQualitySnapshot;
  district_rolling?: {
    district_id: string;
    district_name: string;
    pm25_4h_avg: number;
    pm10_4h_avg: number;
    pm25_24h_avg: number;
    pm10_24h_avg: number;
    sample_count_4h: number;
    sample_count_24h: number;
  };
  nearest_road_observation: (Measurement & {
    pm10_value?: number;
    pm1_value?: number;
    speed_kmh?: number;
    bus_id?: string;
    route_id?: string;
    distance_m?: number;
    within_500m?: boolean;
  }) | null;
  nearest_station: (Measurement & {
    pm25_value?: number;
    pm10_value?: number;
    no2_value?: number;
    primary_pollutant?: string;
    cpcb_category?: string;
    station_name?: string;
    distance_m?: number;
    distance_km?: number;
  }) | null;
  regional_model: (Measurement & {
    pm10_value?: number;
    no2_value?: number;
    so2_value?: number;
    o3_value?: number;
    co_value?: number;
    indian_aqi?: number;
    us_aqi?: number;
    cpcb_category?: string;
  }) | null;
  nearby_cities: MapAggregate[];
}

export interface LocationContext {
  schema_version: '0.9';
  clock: ClockMetadata;
  location_id: string;
  requested_position: GeoPoint;
  live_weather?: LiveWeatherSnapshot;
  live_air_quality?: LiveAirQualitySnapshot;
  weather: Measurement[];
  satellite: Measurement[];
  air_quality_model: Measurement[];
  nearby_sources: NearbySourceContext[];
  source_radii_m: number[];
  resolution_notice: string;
  disclaimer: string;
}

export interface SessionInfo {
  schema_version: '0.9';
  clock: ClockMetadata;
  role: Role;
  capabilities: Capability[];
  auth_mode: 'FIREBASE' | 'FIXTURE';
  display_name: string | null;
  user?: AppUserRecord;
}

export interface AppUserRecord {
  firebase_uid: string;
  email: string | null;
  role: Role;
  active: boolean;
  actor_ref: string;
  display_name: string | null;
  department?: string | null;
  last_login_at?: string | null;
}

export interface AuthLoginPayload {
  email?: string;
  firebase_uid?: string;
  display_name?: string;
  requested_role?: Role;
  id_token?: string;
}

export type AgentType = 'hotspot' | 'simulation' | 'audit';

export interface AgentNarrativeResponse {
  agent_id: string;
  agent_type: AgentType;
  target_id: string;
  model_id: string;
  evidence_state: EvidenceState;
  summary: string;
  evidence_bullets: string[];
  confounder_disclosure: string;
  governance_caveat: string;
  generated_at: UtcTime;
  is_fallback?: boolean;
  cached?: boolean;
}

