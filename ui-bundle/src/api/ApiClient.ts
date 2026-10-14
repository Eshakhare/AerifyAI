/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Client Data Access Interface
 * UI components interact with the platform ONLY through this ApiClient interface.
 * UI components NEVER import fixtures or backend services directly.
 */

import {
  ActionOverlapAssessment,
  CameraEvent,
  ClockMetadata,
  EvaluationPlan,
  GeoPoint,
  Intervention,
  Legend,
  LocationContext,
  MapAggregate,
  Metric,
  NearbySummary,
  PublicInterventionResponse,
  Role,
  ScenarioRun,
  SessionInfo,
  UtcTime,
  ZoneSummary,
  ZoneVersion
} from '../contracts/types';

export interface ApiClient {
  getMe(): Promise<SessionInfo>;
  getClock(): Promise<ClockMetadata>;
  getLegends(metric?: Metric): Promise<Legend[]>;
  getCityOverview(metric: Metric): Promise<MapAggregate[]>;
  getDistrictCells(districtId: string, metric: Metric): Promise<MapAggregate[]>;
  getCellRoads(cellId: string, metric: Metric): Promise<MapAggregate[]>;
  getNearby(position: GeoPoint): Promise<NearbySummary>;
  getLocationContext(locationId: string): Promise<LocationContext>;
  listScenarios(): Promise<ScenarioRun[]>;
  getScenario(id: string): Promise<ScenarioRun | null>;
  getIntervention(id: string): Promise<PublicInterventionResponse | null>;
  listZones(purpose?: string, districtId?: string): Promise<ZoneSummary[]>;
  getZone(id: string): Promise<ZoneVersion | null>;
  createDraftIntervention(payload: Partial<Intervention>): Promise<Intervention>;
  freezePlan(interventionId: string, planPayload: Partial<EvaluationPlan>): Promise<EvaluationPlan>;
  startAction(interventionId: string, timestamp?: UtcTime): Promise<Intervention>;
  markDone(interventionId: string, timestamp?: UtcTime): Promise<Intervention>;
  attachMedia(interventionId: string, mediaPayload: Partial<CameraEvent>): Promise<CameraEvent>;
  submitCorrection(interventionId: string, notice: string): Promise<PublicInterventionResponse>;
  getOverlapAssessment(id: string): Promise<ActionOverlapAssessment | null>;
  getCameraEvent(id: string): Promise<CameraEvent | null>;
  
  // Test/Fixture specific helpers
  setFixtureRole?(role: Role): void;
}
