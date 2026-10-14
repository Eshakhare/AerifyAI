/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - HttpApi Implementation (FastAPI Client Stub)
 * Wired to remote FastAPI /v1 endpoints.
 * In Phase P0, serves as the production network client adapter with endpoint mapping.
 */

import { ApiClient } from './ApiClient';
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

export class HttpApi implements ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {})
      }
    });

    if (!res.ok) {
      throw new Error(`Aerify API HTTP error [${res.status}] ${res.statusText} at ${path}`);
    }

    return res.json() as Promise<T>;
  }

  public async getMe(): Promise<SessionInfo> {
    return this.fetchJson<SessionInfo>('/me');
  }

  public async getClock(): Promise<ClockMetadata> {
    return this.fetchJson<ClockMetadata>('/clock');
  }

  public async getLegends(metric?: Metric): Promise<Legend[]> {
    const query = metric ? `?metric=${encodeURIComponent(metric)}` : '';
    return this.fetchJson<Legend[]>(`/public/legends${query}`);
  }

  public async getCityOverview(metric: Metric): Promise<MapAggregate[]> {
    return this.fetchJson<MapAggregate[]>(`/public/city-overview?metric=${encodeURIComponent(metric)}`);
  }

  public async getDistrictCells(districtId: string, metric: Metric): Promise<MapAggregate[]> {
    return this.fetchJson<MapAggregate[]>(
      `/public/districts/${encodeURIComponent(districtId)}/cells?metric=${encodeURIComponent(metric)}`
    );
  }

  public async getCellRoads(cellId: string, metric: Metric): Promise<MapAggregate[]> {
    return this.fetchJson<MapAggregate[]>(
      `/public/cells/${encodeURIComponent(cellId)}/roads?metric=${encodeURIComponent(metric)}`
    );
  }

  public async getNearby(position: GeoPoint): Promise<NearbySummary> {
    return this.fetchJson<NearbySummary>(
      `/public/nearby?lat=${position.lat}&lng=${position.lng}`
    );
  }

  public async getLocationContext(locationId: string): Promise<LocationContext> {
    return this.fetchJson<LocationContext>(`/public/location-context/${encodeURIComponent(locationId)}`);
  }

  public async listScenarios(): Promise<ScenarioRun[]> {
    return this.fetchJson<ScenarioRun[]>('/scenarios');
  }

  public async getScenario(id: string): Promise<ScenarioRun | null> {
    return this.fetchJson<ScenarioRun>(`/scenarios/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async getIntervention(id: string): Promise<PublicInterventionResponse | null> {
    return this.fetchJson<PublicInterventionResponse>(`/public/interventions/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async listZones(purpose?: string, districtId?: string): Promise<ZoneSummary[]> {
    const params = new URLSearchParams();
    if (purpose) params.set('purpose', purpose);
    if (districtId) params.set('district_id', districtId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchJson<ZoneSummary[]>(`/zones${qs}`);
  }

  public async getZone(id: string): Promise<ZoneVersion | null> {
    return this.fetchJson<ZoneVersion>(`/zones/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async createDraftIntervention(payload: Partial<Intervention>): Promise<Intervention> {
    return this.fetchJson<Intervention>('/officer/interventions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async freezePlan(interventionId: string, planPayload: Partial<EvaluationPlan>): Promise<EvaluationPlan> {
    return this.fetchJson<EvaluationPlan>(`/officer/interventions/${encodeURIComponent(interventionId)}/plan/freeze`, {
      method: 'POST',
      body: JSON.stringify(planPayload)
    });
  }

  public async startAction(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    return this.fetchJson<Intervention>(`/officer/interventions/${encodeURIComponent(interventionId)}/start`, {
      method: 'POST',
      body: JSON.stringify({ timestamp })
    });
  }

  public async markDone(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    return this.fetchJson<Intervention>(`/officer/interventions/${encodeURIComponent(interventionId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ timestamp })
    });
  }

  public async attachMedia(interventionId: string, mediaPayload: Partial<CameraEvent>): Promise<CameraEvent> {
    return this.fetchJson<CameraEvent>(`/officer/interventions/${encodeURIComponent(interventionId)}/media`, {
      method: 'POST',
      body: JSON.stringify(mediaPayload)
    });
  }

  public async submitCorrection(interventionId: string, notice: string): Promise<PublicInterventionResponse> {
    return this.fetchJson<PublicInterventionResponse>(`/officer/interventions/${encodeURIComponent(interventionId)}/correction`, {
      method: 'POST',
      body: JSON.stringify({ notice })
    });
  }

  public async getOverlapAssessment(id: string): Promise<ActionOverlapAssessment | null> {
    return this.fetchJson<ActionOverlapAssessment>(`/public/overlap-assessments/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async getCameraEvent(id: string): Promise<CameraEvent | null> {
    return this.fetchJson<CameraEvent>(`/public/camera-events/${encodeURIComponent(id)}`).catch(() => null);
  }
}
