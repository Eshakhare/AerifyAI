/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - HttpApi Implementation (FastAPI Client)
 * Wired to remote FastAPI /v1 endpoints with Firebase ID token and role header support.
 */

import { ApiClient } from './ApiClient';
import {
  ActionOverlapAssessment,
  AgentNarrativeResponse,
  AgentType,
  AppUserRecord,
  AuthLoginPayload,
  CameraEvent,
  ClockMetadata,
  DistrictSummaryResponse,
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
  private activeRole: Role = 'PUBLIC';
  private activeUserEmail: string | null = null;
  private bearerToken: string | null = null;

  constructor(baseUrl: string = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setFixtureRole(role: Role): void {
    this.activeRole = role;
    if (role === 'PUBLIC') {
      this.bearerToken = null;
      this.activeUserEmail = null;
    } else if (role === 'SUPERVISOR') {
      this.activeUserEmail = 'supervisor@dpcc.delhi.gov.in';
    } else {
      this.activeUserEmail = 'esha.khare@mcd.delhi.gov.in';
    }
  }

  public setBearerToken(token: string | null): void {
    this.bearerToken = token;
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Aerify-Role': this.activeRole,
      ...((options?.headers as Record<string, string>) || {})
    };
    if (this.activeUserEmail) {
      headers['X-Aerify-User-Email'] = this.activeUserEmail;
    }
    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      throw new Error(`Aerify API HTTP error [${res.status}] ${res.statusText} at ${path}`);
    }

    return res.json() as Promise<T>;
  }

  public async getMe(): Promise<SessionInfo> {
    return this.fetchJson<SessionInfo>('/me');
  }

  public async loginWithCloudSql(payload: AuthLoginPayload): Promise<SessionInfo> {
    if (payload.id_token) {
      this.bearerToken = payload.id_token;
    }
    const resp = await this.fetchJson<SessionInfo>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        firebase_uid: payload.firebase_uid,
        display_name: payload.display_name,
        requested_role: payload.requested_role
      })
    });
    this.activeRole = resp.role;
    this.activeUserEmail = resp.user?.email || payload.email || null;
    return resp;
  }

  public async listCloudSqlUsers(): Promise<AppUserRecord[]> {
    const data = await this.fetchJson<{ users?: AppUserRecord[] }>('/auth/users');
    return data.users || [];
  }

  public async getClock(): Promise<ClockMetadata> {
    return this.fetchJson<ClockMetadata>('/clock');
  }

  public async getLegends(metric?: Metric): Promise<Legend[]> {
    const normalized = metric === 'AQI' ? 'INDIAN_AQI' : metric;
    const data = await this.fetchJson<{ legends?: Legend[] } | Legend[]>('/public/legends');
    const list = Array.isArray(data) ? data : data.legends || [];
    if (normalized) {
      const filtered = list.filter((l) => l.metric === normalized);
      return filtered.length > 0 ? filtered : list;
    }
    return list;
  }

  public async getCityOverview(metric: Metric): Promise<MapAggregate[]> {
    const normalized = metric === 'AQI' ? 'INDIAN_AQI' : metric;
    return this.fetchJson<MapAggregate[]>(`/public/city-overview?metric=${encodeURIComponent(normalized)}`);
  }

  public async getDistrictSummary(districtId: string): Promise<DistrictSummaryResponse> {
    return this.fetchJson<DistrictSummaryResponse>(
      `/public/districts/${encodeURIComponent(districtId)}/summary`
    );
  }

  public async getDistrictCells(districtId: string, metric: Metric): Promise<MapAggregate[]> {
    const normalized = metric === 'AQI' ? 'INDIAN_AQI' : metric;
    return this.fetchJson<MapAggregate[]>(
      `/public/districts/${encodeURIComponent(districtId)}/cells?metric=${encodeURIComponent(normalized)}`
    );
  }

  public async getCellRoads(cellId: string, metric: Metric): Promise<MapAggregate[]> {
    const normalized = metric === 'AQI' ? 'INDIAN_AQI' : metric;
    return this.fetchJson<MapAggregate[]>(
      `/public/cells/${encodeURIComponent(cellId)}/roads?metric=${encodeURIComponent(normalized)}`
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
    const data = await this.fetchJson<{ cases?: any[] } | ScenarioRun[]>('/public/scenarios');
    if (Array.isArray(data)) return data;
    return (data.cases || []).map((c: any) => ({
      id: c.run_id || c.scenario_id,
      catalog_version: 'scenario_catalog_v1',
      case_id: c.scenario_id,
      design_intent: c.design_intent,
      scenario_time: c.scenario_time || '2026-10-08T10:00:00Z',
      generated_at: '2026-10-08T09:40:00Z',
      generator_version: '0.5.0',
      config_hash: `sha256:demo_${String(c.scenario_id).toLowerCase()}`,
      seed: 20261001,
      anchor_record_ids: [`anchor_${String(c.scenario_id).toLowerCase()}`],
      context_record_ids: [`ctx_${String(c.scenario_id).toLowerCase()}`],
      route_version_ids: [`routev_${String(c.scenario_id).toLowerCase()}`],
      action_zone_version_id: c.action_zone_version_id || 'zonev_action_anand_vihar_demo_1',
      reference_zone_version_ids: c.reference_zone_version_ids || ['zonev_reference_demo_01_1'],
      evaluation_plan_id: c.evaluation_plan_id || 'evalplan_water_001_v1',
      generated_metrics: ['PM10_MASS', 'PM2_5_MASS'],
      assumptions: c.assumptions || [],
      time_alignment: 'historical_matched',
      branches: ['WITHOUT_ACTION', 'WITH_ACTION'],
      clock_mode: 'SCENARIO',
      display_label: c.display_label || c.name || `Scenario ${c.scenario_id}`
    }));
  }

  public async getScenario(id: string): Promise<ScenarioRun | null> {
    const all = await this.listScenarios();
    return all.find((s) => s.id === id || s.case_id === id) || null;
  }

  public async getIntervention(id: string): Promise<PublicInterventionResponse | null> {
    return this.fetchJson<PublicInterventionResponse>(`/public/interventions/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async listInterventions(): Promise<PublicInterventionResponse[]> {
    return this.fetchJson<PublicInterventionResponse[]>('/officer/interventions').catch(async () => {
      return this.fetchJson<PublicInterventionResponse[]>('/public/interventions').catch(() => []);
    });
  }

  public async listZones(purpose?: string, districtId?: string): Promise<ZoneSummary[]> {
    const zones = await this.fetchJson<ZoneSummary[]>('/public/zones');
    return zones.filter((z) => {
      if (purpose && !z.purposes.includes(purpose as any)) return false;
      if (districtId && z.district_id !== districtId) return false;
      return true;
    });
  }

  public async getZone(id: string): Promise<ZoneVersion | null> {
    const intResp = await this.getIntervention('int_water_001');
    return intResp?.zone_versions.find((zv) => zv.id === id || zv.zone_id === id) || null;
  }

  public async createDraftIntervention(payload: Partial<Intervention> & { title?: string; district_id?: string; corridor?: string; equipment?: string; notes?: string; lifecycle?: string }): Promise<Intervention> {
    const resp = await this.fetchJson<PublicInterventionResponse>('/officer/interventions', {
      method: 'POST',
      body: JSON.stringify({
        zone_id: payload.zone_id || 'action_zone_anand_vihar_demo',
        reference_zone_id: payload.reference_zone_id || 'reference_zone_demo_01',
        type: payload.type || 'water_suppression',
        title: (payload as any).title,
        district_id: (payload as any).district_id,
        corridor: (payload as any).corridor,
        equipment: (payload as any).equipment,
        notes: (payload as any).notes,
        lifecycle: (payload as any).lifecycle || 'draft'
      })
    });
    return resp.intervention;
  }

  public async freezePlan(interventionId: string, planPayload: Partial<EvaluationPlan>): Promise<EvaluationPlan> {
    const resp = await this.fetchJson<PublicInterventionResponse>(
      `/officer/interventions/${encodeURIComponent(interventionId)}/freeze`,
      {
        method: 'POST',
        body: JSON.stringify(planPayload)
      }
    );
    return resp.evaluation_plan;
  }

  public async startAction(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    const resp = await this.fetchJson<PublicInterventionResponse>(
      `/officer/interventions/${encodeURIComponent(interventionId)}/start`,
      {
        method: 'POST',
        body: JSON.stringify({ timestamp })
      }
    );
    return resp.intervention;
  }

  public async markDone(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    const resp = await this.fetchJson<PublicInterventionResponse>(
      `/officer/interventions/${encodeURIComponent(interventionId)}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ timestamp })
      }
    );
    return resp.intervention;
  }

  public async attachMedia(interventionId: string, mediaPayload: Partial<CameraEvent>): Promise<CameraEvent> {
    return this.fetchJson<CameraEvent>(`/officer/interventions/${encodeURIComponent(interventionId)}/media`, {
      method: 'POST',
      body: JSON.stringify({
        label: mediaPayload.label || 'Officer field verification photo',
        media_type: mediaPayload.media_type || 'image'
      })
    });
  }

  public async submitCorrection(interventionId: string, notice: string): Promise<PublicInterventionResponse> {
    return this.fetchJson<PublicInterventionResponse>(
      `/officer/interventions/${encodeURIComponent(interventionId)}/correction`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: notice, corrected_fields: ['action_completed_at'] })
      }
    );
  }

  public async getOverlapAssessment(id: string): Promise<ActionOverlapAssessment | null> {
    return this.fetchJson<ActionOverlapAssessment>(`/public/overlaps/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async getCameraEvent(id: string): Promise<CameraEvent | null> {
    return this.fetchJson<CameraEvent>(`/public/camera-events/${encodeURIComponent(id)}`).catch(() => null);
  }

  public async getNarrative(agentType: AgentType, targetId: string): Promise<AgentNarrativeResponse> {
    return this.fetchJson<AgentNarrativeResponse>(
      `/public/narratives/${encodeURIComponent(agentType)}/${encodeURIComponent(targetId)}`
    );
  }
}
