/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - FixtureApi Implementation
 * Provides deterministic in-memory data conforming strictly to Contract Schema 0.9.
 * Serves the official fixtures plus required mock aggregates.
 */

import { ApiClient } from './ApiClient';
import {
  ActionOverlapAssessment,
  AgentNarrativeResponse,
  AgentType,
  BandId,
  CameraEvent,
  Capability,
  ClockMetadata,
  EvaluationPlan,
  EvidenceState,
  GeoPoint,
  Intervention,
  Legend,
  LocationContext,
  MapAggregate,
  Measurement,
  Metric,
  NearbySummary,
  PublicInterventionResponse,
  Role,
  ScenarioProjection,
  ScenarioRun,
  SessionInfo,
  UtcTime,
  ZoneSummary,
  ZoneVersion
} from '../contracts/types';

// Fixture imports
import actionOverlapFixture from '../contracts/fixtures/action-overlap.synthetic.json';
import cameraEventFixture from '../contracts/fixtures/camera-event.synthetic.json';
import locationContextFixture from '../contracts/fixtures/location-context.synthetic.json';
import observationFixture from '../contracts/fixtures/observation.synthetic.json';
import publicInterventionFixture from '../contracts/fixtures/public-intervention.synthetic.json';
import scenarioProjectionConfoundedFixture from '../contracts/fixtures/scenario-projection.confounded.synthetic.json';
import scenarioRunFixture from '../contracts/fixtures/scenario-run.synthetic.json';
import sessionOfficerFixture from '../contracts/fixtures/session.officer.synthetic.json';
import zoneCatalogFixture from '../contracts/fixtures/zone-catalog.synthetic.json';
import zoneVersionPalamDwarkaFixture from '../contracts/fixtures/zone-version.palam-dwarka.placeholder.json';
import legendBandsFixture from '../contracts/fixtures/legend-bands.v1.json';
import scenarioCatalogFixture from '../contracts/fixtures/scenario-catalog.v1.json';

export class FixtureApi implements ApiClient {
  private currentRole: Role = (sessionOfficerFixture.role as Role) || 'OFFICER';
  private sessionAuthMode: 'FIREBASE' | 'FIXTURE' = 'FIXTURE';
  
  // In-memory clones to support mutations during testing
  private interventionState: PublicInterventionResponse;
  private scenarioRuns: ScenarioRun[] = [];
  private zoneVersions: Map<string, ZoneVersion> = new Map();
  private zoneSummaries: ZoneSummary[] = [];
  private overlapAssessments: Map<string, ActionOverlapAssessment> = new Map();
  private cameraEvents: CameraEvent[] = [];

  constructor() {
    this.interventionState = JSON.parse(JSON.stringify(publicInterventionFixture)) as PublicInterventionResponse;
    this.zoneSummaries = JSON.parse(JSON.stringify(zoneCatalogFixture)) as ZoneSummary[];

    // Index known zone versions
    const palamZone = zoneVersionPalamDwarkaFixture as unknown as ZoneVersion;
    this.zoneVersions.set(palamZone.id, palamZone);
    for (const zv of this.interventionState.zone_versions) {
      this.zoneVersions.set(zv.id, zv);
    }

    // Overlap assessment
    const overlap = actionOverlapFixture as unknown as ActionOverlapAssessment;
    this.overlapAssessments.set(overlap.id, overlap);

    // Camera events
    const cam = cameraEventFixture as unknown as CameraEvent;
    this.cameraEvents.push(cam);

    // Initialize 12 Scenario Runs from scenario-catalog.v1.json
    this.hydrateScenarioRuns();
  }

  private hydrateScenarioRuns(): void {
    const catalogCases = scenarioCatalogFixture.cases;
    const s02Run = scenarioRunFixture as unknown as ScenarioRun;

    this.scenarioRuns = catalogCases.map((catalogCase) => {
      if (catalogCase.case_id === 'S02') {
        return s02Run;
      }

      // MOCK-NOT-IN-FIXTURES: Deterministically generated ScenarioRun for cases S01, S03-S12
      const isS01 = catalogCase.case_id === 'S01';
      const isS10 = catalogCase.case_id === 'S10';
      const isS12 = catalogCase.case_id === 'S12';

      const zoneSummary = this.zoneSummaries.find(z => z.scenario_case_id === catalogCase.case_id);
      const actionZoneVersionId = zoneSummary?.latest_zone_version_id || `zonev_${catalogCase.scenario_id}_1`;

      return {
        id: catalogCase.scenario_id,
        catalog_version: 'scenario_catalog_v1',
        case_id: catalogCase.case_id,
        design_intent: catalogCase.design_intent,
        scenario_time: '2026-10-08T10:00:00Z',
        generated_at: '2026-10-08T09:40:00Z',
        generator_version: '0.5.0',
        config_hash: `sha256:demo_config_${catalogCase.case_id.toLowerCase()}_hash`,
        seed: 20261000 + parseInt(catalogCase.case_id.replace('S', ''), 10),
        anchor_record_ids: isS01 ? [] : [`anchor_${catalogCase.case_id.toLowerCase()}_pm_001`],
        context_record_ids: [
          `ctx_weather_${catalogCase.case_id.toLowerCase()}_0955`,
          `ctx_traffic_${catalogCase.case_id.toLowerCase()}_0945`
        ],
        route_version_ids: isS01 ? [] : [`routev_${catalogCase.scenario_id}_1`],
        action_zone_version_id: actionZoneVersionId,
        reference_zone_version_ids: [`zonev_reference_${catalogCase.case_id.toLowerCase()}_1`],
        evaluation_plan_id: `evalplan_${catalogCase.case_id.toLowerCase()}_v1`,
        generated_metrics: [catalogCase.target_metric as Metric, 'PM2_5_MASS', 'PM10_MASS'],
        assumptions: [
          `Assumed ${catalogCase.action_type} response profile: ${catalogCase.design_intent}`,
          'Weather and traffic contextual models applied for baseline simulation',
          isS10 ? 'Unforecast precipitation of 1.2 mm/h detected in post-action window' : 'No severe meteorological anomalies during evaluation window',
          isS12 ? 'Auxiliary non-evaluated road sweeping (aux_road_sweep_for_S12) overlapped during window' : 'No interfering secondary municipal actions detected'
        ],
        time_alignment: 'historical_matched',
        branches: ['WITHOUT_ACTION', 'WITH_ACTION'],
        clock_mode: 'SCENARIO',
        display_label: isS01
          ? 'Fully synthetic demonstration — no verified observed anchors in this zone'
          : 'Synthetic demo — based on historical PM observations and contextual models'
      };
    });
  }

  public setFixtureRole(role: Role): void {
    this.currentRole = role;
  }

  public async getMe(): Promise<SessionInfo> {
    const roleCapabilities: Record<Role, Capability[]> = {
      PUBLIC: ['VIEW_PUBLIC'],
      OFFICER: [
        'VIEW_PUBLIC',
        'VIEW_RESTRICTED_MEDIA',
        'CREATE_DRAFT',
        'EDIT_DRAFT',
        'START_ACTION',
        'COMPLETE_ACTION',
        'ATTACH_MEDIA'
      ],
      SUPERVISOR: [
        'VIEW_PUBLIC',
        'VIEW_RESTRICTED_MEDIA',
        'CREATE_DRAFT',
        'EDIT_DRAFT',
        'START_ACTION',
        'COMPLETE_ACTION',
        'ATTACH_MEDIA',
        'SUBMIT_CORRECTION'
      ]
    };

    return {
      schema_version: '0.9',
      clock: this.interventionState.clock,
      role: this.currentRole,
      capabilities: roleCapabilities[this.currentRole] || ['VIEW_PUBLIC'],
      auth_mode: this.sessionAuthMode,
      display_name: this.currentRole === 'PUBLIC' ? null : `Delhi Municipal Officer (${this.currentRole})`
    };
  }

  public async getClock(): Promise<ClockMetadata> {
    return this.interventionState.clock;
  }

  public async getLegends(metric?: Metric): Promise<Legend[]> {
    const legends = legendBandsFixture as unknown as Legend[];
    if (metric) {
      const normalized = metric === 'AQI' ? 'INDIAN_AQI' : metric;
      const filtered = legends.filter((l) => l.metric === normalized);
      return filtered.length > 0 ? filtered : legends;
    }
    return legends;
  }

  // MOCK-NOT-IN-FIXTURES: 11 Delhi Revenue Districts MapAggregates with simplified GeoJSON polygons
  public async getCityOverview(metric: Metric = 'PM2_5_MASS'): Promise<MapAggregate[]> {
    const clock = this.interventionState.clock;
    const windowStart = '2026-10-08T09:00:00Z';
    const windowEnd = '2026-10-08T10:00:00Z';

    const districts: Array<{
      id: string;
      name: string;
      value: number;
      category: BandId;
      coordinates: [number, number][][];
    }> = [
      {
        id: 'dist_central',
        name: 'Central Delhi',
        value: 88,
        category: 'MODERATE',
        coordinates: [[[77.18, 28.62], [77.23, 28.62], [77.23, 28.68], [77.18, 28.68], [77.18, 28.62]]]
      },
      {
        id: 'dist_east',
        name: 'East Delhi',
        value: 135,
        category: 'VERY_POOR',
        coordinates: [[[77.26, 28.61], [77.34, 28.61], [77.34, 28.67], [77.26, 28.67], [77.26, 28.61]]]
      },
      {
        id: 'dist_new_delhi',
        name: 'New Delhi',
        value: 58,
        category: 'SATISFACTORY',
        coordinates: [[[77.16, 28.57], [77.24, 28.57], [77.24, 28.63], [77.16, 28.63], [77.16, 28.57]]]
      },
      {
        id: 'dist_north',
        name: 'North Delhi',
        value: 104,
        category: 'POOR',
        coordinates: [[[77.14, 28.68], [77.22, 28.68], [77.22, 28.78], [77.14, 28.78], [77.14, 28.68]]]
      },
      {
        id: 'dist_north_east',
        name: 'North East Delhi',
        value: 122,
        category: 'VERY_POOR',
        coordinates: [[[77.23, 28.67], [77.31, 28.67], [77.31, 28.74], [77.23, 28.74], [77.23, 28.67]]]
      },
      {
        id: 'dist_north_west',
        name: 'North West Delhi',
        value: 148,
        category: 'VERY_POOR',
        coordinates: [[[77.02, 28.68], [77.16, 28.68], [77.16, 28.85], [77.02, 28.85], [77.02, 28.68]]]
      },
      {
        id: 'dist_shahdara',
        name: 'Shahdara',
        value: 165,
        category: 'VERY_POOR',
        coordinates: [[[77.27, 28.65], [77.33, 28.65], [77.33, 28.71], [77.27, 28.71], [77.27, 28.65]]]
      },
      {
        id: 'dist_south',
        name: 'South Delhi',
        value: 75,
        category: 'MODERATE',
        coordinates: [[[77.15, 28.48], [77.25, 28.48], [77.25, 28.56], [77.15, 28.56], [77.15, 28.48]]]
      },
      {
        id: 'dist_south_east',
        name: 'South East Delhi',
        value: 112,
        category: 'POOR',
        coordinates: [[[77.23, 28.50], [77.33, 28.50], [77.33, 28.58], [77.23, 28.58], [77.23, 28.50]]]
      },
      {
        id: 'dist_south_west',
        name: 'South West Delhi',
        value: 94,
        category: 'POOR',
        coordinates: [[[76.92, 28.48], [77.12, 28.48], [77.12, 28.62], [76.92, 28.62], [76.92, 28.48]]]
      },
      {
        id: 'dist_west',
        name: 'West Delhi',
        value: 118,
        category: 'POOR',
        coordinates: [[[77.06, 28.61], [77.16, 28.61], [77.16, 28.69], [77.06, 28.69], [77.06, 28.61]]]
      }
    ];

    return districts.map((d) => ({
      id: d.id,
      level: 'district',
      parent_id: 'city_delhi_nct',
      name: d.name,
      metric,
      value: d.value,
      unit: metric === 'AQI' ? 'index' : 'ug/m3',
      category: d.category,
      legend_id: metric === 'PM10_MASS' ? 'cpcb_pm10_conc_v1' : metric === 'AQI' ? 'cpcb_aqi_v1' : 'cpcb_pm25_conc_v1',
      window_start: windowStart,
      window_end: windowEnd,
      coverage: {
        state: 'current',
        sample_count: 650,
        source_count: 5,
        last_observation_at: '2026-10-08T09:55:00Z',
        expected_interval_seconds: 900
      },
      evidence_state: 'MODEL_ESTIMATED',
      method_version: 'delhi_revenue_district_kriging_v1',
      provenance_mix: ['cpcb_regulatory_stations', 'delhi_dpcc_network', 'aerify_model_assimilator'],
      geometry_ref: `postgis://districts/${d.id}`,
      geometry: {
        type: 'Polygon',
        coordinates: d.coordinates
      }
    }));
  }

  public async getDistrictCells(districtId: string, metric: Metric = 'PM2_5_MASS'): Promise<MapAggregate[]> {
    const windowStart = '2026-10-08T09:00:00Z';
    const windowEnd = '2026-10-08T10:00:00Z';

    const districtCellPresets: Record<string, Array<{
      id: string;
      name: string;
      value: number | null;
      category: BandId | null;
      coverageState: 'current' | 'sparse' | 'stale' | 'synthetic_only' | 'no_data';
      evidenceState: any;
      coords: [number, number][][];
    }>> = {
      dist_east: [
        {
          id: 'cell_east_anand_vihar_01',
          name: 'Anand Vihar Core Analysis Cell',
          value: 181.5,
          category: 'VERY_POOR',
          coverageState: 'synthetic_only',
          evidenceState: 'SYNTHETIC',
          coords: [[[77.30, 28.64], [77.32, 28.64], [77.32, 28.66], [77.30, 28.66], [77.30, 28.64]]]
        },
        {
          id: 'cell_east_patparganj_02',
          name: 'Patparganj Industrial Buffer Cell',
          value: 110.0,
          category: 'POOR',
          coverageState: 'sparse',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.28, 28.62], [77.30, 28.62], [77.30, 28.64], [77.28, 28.64], [77.28, 28.62]]]
        },
        {
          id: 'cell_east_stale_03',
          name: 'Ghazipur Border Cell (Stale)',
          value: null,
          category: null,
          coverageState: 'stale',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.32, 28.62], [77.34, 28.62], [77.34, 28.64], [77.32, 28.64], [77.32, 28.62]]]
        },
        {
          id: 'cell_east_nodata_04',
          name: 'Kondli Outskirts Cell (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.32, 28.60], [77.34, 28.60], [77.34, 28.62], [77.32, 28.62], [77.32, 28.60]]]
        }
      ],
      dist_south_west: [
        {
          id: 'cell_sw_dwarka_sector_01',
          name: 'Dwarka Sector 8 Corridor Cell',
          value: 78.0,
          category: 'MODERATE',
          coverageState: 'current',
          evidenceState: 'MODEL_ESTIMATED',
          coords: [[[77.05, 28.57], [77.08, 28.57], [77.08, 28.60], [77.05, 28.60], [77.05, 28.57]]]
        },
        {
          id: 'cell_sw_palam_flyover_02',
          name: 'Palam Flyover Approach Cell',
          value: 105.0,
          category: 'POOR',
          coverageState: 'sparse',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.08, 28.57], [77.11, 28.57], [77.11, 28.60], [77.08, 28.60], [77.08, 28.57]]]
        },
        {
          id: 'cell_sw_nodata_03',
          name: 'South West Najafgarh Border (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[76.98, 28.55], [77.02, 28.55], [77.02, 28.58], [76.98, 28.58], [76.98, 28.55]]]
        }
      ],
      dist_central: [
        {
          id: 'cell_central_chandni_01',
          name: 'Chandni Chowk Core Analysis Cell',
          value: 88.0,
          category: 'MODERATE',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.19, 28.64], [77.22, 28.64], [77.22, 28.67], [77.19, 28.67], [77.19, 28.64]]]
        },
        {
          id: 'cell_central_daryaganj_02',
          name: 'Daryaganj Arterial Cell',
          value: 102.0,
          category: 'POOR',
          coverageState: 'current',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.21, 28.63], [77.23, 28.63], [77.23, 28.65], [77.21, 28.65], [77.21, 28.63]]]
        },
        {
          id: 'cell_central_nodata_03',
          name: 'Paharganj Transit Border (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.18, 28.63], [77.20, 28.63], [77.20, 28.65], [77.18, 28.65], [77.18, 28.63]]]
        }
      ],
      dist_new_delhi: [
        {
          id: 'cell_nd_cp_01',
          name: 'Connaught Place Inner Circle Cell',
          value: 58.0,
          category: 'SATISFACTORY',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.20, 28.62], [77.23, 28.62], [77.23, 28.64], [77.20, 28.64], [77.20, 28.62]]]
        },
        {
          id: 'cell_nd_indiagate_02',
          name: 'India Gate Heritage Corridor Cell',
          value: 45.0,
          category: 'GOOD',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.22, 28.60], [77.24, 28.60], [77.24, 28.62], [77.22, 28.62], [77.22, 28.60]]]
        },
        {
          id: 'cell_nd_stale_03',
          name: 'Chanakyapuri Buffer Cell (Stale)',
          value: null,
          category: null,
          coverageState: 'stale',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.17, 28.58], [77.20, 28.58], [77.20, 28.60], [77.17, 28.60], [77.17, 28.58]]]
        }
      ],
      dist_north: [
        {
          id: 'cell_north_wazirpur_01',
          name: 'Wazirpur Industrial Approach Cell',
          value: 145.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.15, 28.69], [77.18, 28.69], [77.18, 28.72], [77.15, 28.72], [77.15, 28.69]]]
        },
        {
          id: 'cell_north_civillines_02',
          name: 'Civil Lines Urban Forest Cell',
          value: 85.0,
          category: 'MODERATE',
          coverageState: 'current',
          evidenceState: 'MODEL_ESTIMATED',
          coords: [[[77.20, 28.67], [77.22, 28.67], [77.22, 28.70], [77.20, 28.70], [77.20, 28.67]]]
        },
        {
          id: 'cell_north_nodata_03',
          name: 'Burari Yamuna Rim Cell (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.18, 28.73], [77.21, 28.73], [77.21, 28.76], [77.18, 28.76], [77.18, 28.73]]]
        }
      ],
      dist_north_west: [
        {
          id: 'cell_nw_rohini_01',
          name: 'Rohini Sector 16 Corridor Cell',
          value: 130.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'MODEL_ESTIMATED',
          coords: [[[77.06, 28.71], [77.10, 28.71], [77.10, 28.75], [77.06, 28.75], [77.06, 28.71]]]
        },
        {
          id: 'cell_nw_pitampura_02',
          name: 'Pitampura TV Tower Cell',
          value: 110.0,
          category: 'POOR',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.12, 28.69], [77.15, 28.69], [77.15, 28.72], [77.12, 28.72], [77.12, 28.69]]]
        },
        {
          id: 'cell_nw_nodata_03',
          name: 'Bawana Industrial Rim (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.03, 28.78], [77.07, 28.78], [77.07, 28.82], [77.03, 28.82], [77.03, 28.78]]]
        }
      ],
      dist_shahdara: [
        {
          id: 'cell_shah_vivek_vihar_01',
          name: 'Vivek Vihar Industrial Buffer Cell',
          value: 165.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.29, 28.66], [77.32, 28.66], [77.32, 28.69], [77.29, 28.69], [77.29, 28.66]]]
        },
        {
          id: 'cell_shah_flyover_02',
          name: 'Shahdara Flyover Approach Cell',
          value: 175.0,
          category: 'SEVERE',
          coverageState: 'sparse',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.27, 28.66], [77.29, 28.66], [77.29, 28.68], [77.27, 28.68], [77.27, 28.66]]]
        },
        {
          id: 'cell_shah_stale_03',
          name: 'Dilshad Garden Buffer (Stale)',
          value: null,
          category: null,
          coverageState: 'stale',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.30, 28.68], [77.33, 28.68], [77.33, 28.71], [77.30, 28.71], [77.30, 28.68]]]
        }
      ],
      dist_south: [
        {
          id: 'cell_south_hauzkhas_01',
          name: 'Hauz Khas Urban Cell',
          value: 75.0,
          category: 'MODERATE',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.18, 28.53], [77.21, 28.53], [77.21, 28.56], [77.18, 28.56], [77.18, 28.53]]]
        },
        {
          id: 'cell_south_saket_02',
          name: 'Saket District Centre Cell',
          value: 68.0,
          category: 'MODERATE',
          coverageState: 'current',
          evidenceState: 'MODEL_ESTIMATED',
          coords: [[[77.20, 28.51], [77.23, 28.51], [77.23, 28.54], [77.20, 28.54], [77.20, 28.51]]]
        },
        {
          id: 'cell_south_nodata_03',
          name: 'Mehrauli Ridge Border (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.15, 28.50], [77.18, 28.50], [77.18, 28.53], [77.15, 28.53], [77.15, 28.50]]]
        }
      ],
      dist_south_east: [
        {
          id: 'cell_se_okhla_01',
          name: 'Okhla Phase II Industrial Buffer Cell',
          value: 112.0,
          category: 'POOR',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.26, 28.52], [77.29, 28.52], [77.29, 28.55], [77.26, 28.55], [77.26, 28.52]]]
        },
        {
          id: 'cell_se_saraikale_02',
          name: 'Sarai Kale Khan Ring Road Cell',
          value: 135.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.24, 28.57], [77.27, 28.57], [77.27, 28.60], [77.24, 28.60], [77.24, 28.57]]]
        },
        {
          id: 'cell_se_stale_03',
          name: 'Badarpur Border Buffer (Stale)',
          value: null,
          category: null,
          coverageState: 'stale',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.28, 28.49], [77.31, 28.49], [77.31, 28.52], [77.28, 28.52], [77.28, 28.49]]]
        }
      ],
      dist_west: [
        {
          id: 'cell_west_punjabibagh_01',
          name: 'Punjabi Bagh Ring Road Cell',
          value: 118.0,
          category: 'POOR',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.11, 28.65], [77.14, 28.65], [77.14, 28.68], [77.11, 28.68], [77.11, 28.65]]]
        },
        {
          id: 'cell_west_mayapuri_02',
          name: 'Mayapuri Industrial Cluster Cell',
          value: 142.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'OBSERVED_NEARBY',
          coords: [[[77.11, 28.62], [77.14, 28.62], [77.14, 28.65], [77.11, 28.65], [77.11, 28.62]]]
        },
        {
          id: 'cell_west_nodata_03',
          name: 'Mundka Peripheral Stretch (No Data)',
          value: null,
          category: null,
          coverageState: 'no_data',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.02, 28.66], [77.06, 28.66], [77.06, 28.69], [77.02, 28.69], [77.02, 28.66]]]
        }
      ],
      dist_north_east: [
        {
          id: 'cell_ne_seelampur_01',
          name: 'Seelampur Arterial Cell',
          value: 122.0,
          category: 'VERY_POOR',
          coverageState: 'current',
          evidenceState: 'DIRECTLY_OBSERVED',
          coords: [[[77.25, 28.66], [77.28, 28.66], [77.28, 28.69], [77.25, 28.69], [77.25, 28.66]]]
        },
        {
          id: 'cell_ne_yamunavihar_02',
          name: 'Yamuna Vihar Buffer Cell',
          value: 105.0,
          category: 'POOR',
          coverageState: 'current',
          evidenceState: 'MODEL_ESTIMATED',
          coords: [[[77.27, 28.69], [77.30, 28.69], [77.30, 28.72], [77.27, 28.72], [77.27, 28.69]]]
        },
        {
          id: 'cell_ne_stale_03',
          name: 'Gokulpuri Peripheral Rim (Stale)',
          value: null,
          category: null,
          coverageState: 'stale',
          evidenceState: 'INSUFFICIENT_EVIDENCE',
          coords: [[[77.28, 28.71], [77.31, 28.71], [77.31, 28.74], [77.28, 28.74], [77.28, 28.71]]]
        }
      ]
    };

    const presets = districtCellPresets[districtId] || districtCellPresets.dist_east;

    return presets.map((p) => ({
      id: p.id,
      level: 'analysis_cell',
      parent_id: districtId,
      name: p.name,
      metric,
      value: p.value,
      unit: metric === 'AQI' ? 'index' : 'ug/m3',
      category: p.category,
      legend_id: metric === 'PM10_MASS' ? 'cpcb_pm10_conc_v1' : metric === 'AQI' ? 'cpcb_aqi_v1' : 'cpcb_pm25_conc_v1',
      window_start: windowStart,
      window_end: windowEnd,
      coverage: {
        state: p.coverageState,
        sample_count: p.value !== null ? 65 : 0,
        source_count: p.value !== null ? 2 : 0,
        last_observation_at: p.coverageState === 'stale' ? '2026-10-07T14:30:00Z' : p.value !== null ? '2026-10-08T09:50:00Z' : null,
        expected_interval_seconds: 900
      },
      evidence_state: p.evidenceState,
      method_version: 'cell_spatial_aggregation_v1',
      provenance_mix: p.value !== null ? ['delhi_dpcc_network', 'mobile_fleet_01'] : [],
      geometry_ref: `postgis://cells/${p.id}`,
      geometry: {
        type: 'Polygon',
        coordinates: p.coords
      }
    }));
  }

  // MOCK-NOT-IN-FIXTURES: 250m road segments with segmentation_version: "delhi_osm_250m_v1"
  public async getCellRoads(cellId: string, metric: Metric = 'PM2_5_MASS'): Promise<MapAggregate[]> {
    const windowStart = '2026-10-08T09:00:00Z';
    const windowEnd = '2026-10-08T10:00:00Z';

    const cellLabel = cellId
      .replace(/^cell_[a-z]+_/g, '')
      .replace(/_[0-9]+$/g, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return [
      {
        id: `seg_${cellId}_arterial_01`,
        level: 'road_segment',
        parent_id: cellId,
        name: `${cellLabel || 'Corridor'} Main Arterial (250m)`,
        metric,
        value: 172.5,
        unit: 'ug/m3',
        category: 'VERY_POOR',
        legend_id: 'cpcb_pm25_conc_v1',
        window_start: windowStart,
        window_end: windowEnd,
        coverage: {
          state: 'current',
          sample_count: 42,
          source_count: 1,
          last_observation_at: '2026-10-08T09:55:00Z',
          expected_interval_seconds: 60
        },
        evidence_state: 'DIRECTLY_OBSERVED',
        method_version: 'road_segment_osrm_snapping_v1',
        provenance_mix: ['mobile_van_01'],
        geometry_ref: `postgis://roads/seg_${cellId}_arterial_01`,
        geometry: {
          type: 'LineString',
          coordinates: [[77.3155, 28.6465], [77.3165, 28.6472]]
        }
      },
      {
        id: `seg_${cellId}_corridor_02`,
        level: 'road_segment',
        parent_id: cellId,
        name: `${cellLabel || 'Corridor'} Connecting Road (250m)`,
        metric,
        value: 128.0,
        unit: 'ug/m3',
        category: 'POOR',
        legend_id: 'cpcb_pm25_conc_v1',
        window_start: windowStart,
        window_end: windowEnd,
        coverage: {
          state: 'current',
          sample_count: 24,
          source_count: 2,
          last_observation_at: '2026-10-08T09:50:00Z',
          expected_interval_seconds: 120
        },
        evidence_state: 'OBSERVED_NEARBY',
        method_version: 'road_segment_osrm_snapping_v1',
        provenance_mix: ['mobile_van_02'],
        geometry_ref: `postgis://roads/seg_${cellId}_corridor_02`,
        geometry: {
          type: 'LineString',
          coordinates: [[77.3140, 28.6450], [77.3150, 28.6458]]
        }
      },
      {
        id: `seg_${cellId}_unmeasured_03`,
        level: 'road_segment',
        parent_id: cellId,
        name: `${cellLabel || 'Corridor'} Feeder Road (Unmeasured)`,
        metric,
        value: null,
        unit: 'ug/m3',
        category: null,
        legend_id: null,
        window_start: windowStart,
        window_end: windowEnd,
        coverage: {
          state: 'no_data',
          sample_count: 0,
          source_count: 0,
          last_observation_at: null,
          expected_interval_seconds: 300
        },
        evidence_state: 'INSUFFICIENT_EVIDENCE',
        method_version: 'road_segment_osrm_snapping_v1',
        provenance_mix: [],
        geometry_ref: `postgis://roads/seg_${cellId}_unmeasured_03`,
        geometry: {
          type: 'LineString',
          coordinates: [[77.3120, 28.6440], [77.3130, 28.6446]]
        }
      }
    ];
  }

  // MOCK-NOT-IN-FIXTURES: One NearbySummary row strictly schema-0.9 valid
  public async getNearby(position: GeoPoint): Promise<NearbySummary> {
    const obs = observationFixture as unknown as Measurement;
    const ctx = locationContextFixture as unknown as LocationContext;
    const cities = await this.getCityOverview('PM2_5_MASS');
    return {
      requested_position: position,
      nearest_road_observation: obs,
      nearest_station: obs,
      regional_model: ctx.air_quality_model?.[0] || null,
      nearby_cities: cities.slice(0, 3)
    };
  }

  public async getLocationContext(locationId: string): Promise<LocationContext> {
    return locationContextFixture as unknown as LocationContext;
  }

  public async listScenarios(): Promise<ScenarioRun[]> {
    return this.scenarioRuns;
  }

  public async getScenario(id: string): Promise<ScenarioRun | null> {
    return this.scenarioRuns.find((s) => s.id === id) || null;
  }

  public async getIntervention(id: string): Promise<PublicInterventionResponse | null> {
    if (this.interventionState.intervention.id === id || id === 'water_suppression_sustained_02' || id === 'S02') {
      return this.interventionState;
    }

    // Alignment for S10 (water_suppression_confounded_rain_01)
    if (id === 'int_water_rain_01' || id === 'water_suppression_confounded_rain_01' || id === 'S10') {
      const confoundedProj = scenarioProjectionConfoundedFixture as unknown as ScenarioProjection;
      return {
        schema_version: '0.9',
        clock: {
          clock_mode: 'SCENARIO',
          effective_now: '2026-10-28T13:02:00Z',
          scenario_id: 'water_suppression_confounded_rain_01',
          clock_revision: 1
        },
        intervention: {
          id: 'int_water_rain_01',
          revision: 1,
          zone_id: 'action_zone_ito_vikas_marg_demo',
          zone_version_id: 'zonev_action_ito_vikas_marg_demo_1',
          reference_zone_id: 'reference_zone_ito_01',
          reference_zone_version_id: 'zonev_reference_ito_01_1',
          evaluation_plan_id: 'evalplan_water_rain_01_v1',
          type: 'water_suppression',
          lifecycle: 'result_available',
          proposed_at: '2026-10-28T09:30:00Z',
          action_started_at: '2026-10-28T09:50:00Z',
          action_completed_at: '2026-10-28T10:00:00Z',
          marked_done_at: '2026-10-28T10:05:00Z',
          timezone: 'Asia/Kolkata',
          checkpoint_offsets_minutes: [0, 60, 180],
          action_confirmation_basis: 'officer_self_reported',
          scenario_id: 'water_suppression_confounded_rain_01'
        },
        evaluation_plan: {
          ...this.interventionState.evaluation_plan,
          id: 'evalplan_water_rain_01_v1',
          action_zone_version_id: 'zonev_action_ito_vikas_marg_demo_1'
        },
        zone_versions: this.interventionState.zone_versions,
        scenario_projections: [confoundedProj],
        observed_evaluations: [],
        context_measurement_ids: ['ctx_weather_rain_rain01_1130'],
        correction_notice: null,
        disclaimer: 'Synthetic demonstration. Rain confounds comparison; no improvement claimed.'
      };
    }

    // Alignment for S12 (water_suppression_confounded_overlap_01)
    if (id === 'int_water_overlap_01' || id === 'water_suppression_confounded_overlap_01' || id === 'S12') {
      const overlapProj: ScenarioProjection = {
        id: 'proj_s12_overlap_180',
        scenario_id: 'water_suppression_confounded_overlap_01',
        intervention_id: 'int_water_overlap_01',
        intervention_revision: 1,
        evaluation_plan_id: 'evalplan_water_overlap_01_v1',
        checkpoint_offset_minutes: 180,
        metric: 'PM10_MASS',
        status: 'confounded_scenario',
        action_pre_ug_m3: 165.0,
        action_post_ug_m3: 140.0,
        reference_pre_ug_m3: 160.0,
        reference_post_ug_m3: 135.0,
        effect_ug_m3: 0.0,
        effect_interval: null,
        method_version: 'synthetic_did_kernel_v1',
        generated_at: '2026-10-18T13:30:00Z',
        confounders: [
          {
            code: 'ACTION_OVERLAP',
            state: 'TRIGGERED',
            outcome: 'confounded',
            applies_to: 'COMPARISON',
            observed_value: 3.0,
            threshold: 1.0,
            unit: 'actions',
            policy_version: 'action_overlap_v1',
            input_measurement_ids: ['aux_road_sweep_for_S12'],
            display_text: 'Overlapping non-evaluated road sweeping (aux_road_sweep_for_S12) contaminated 3 spatial analysis bins during evaluation window.'
          }
        ],
        limitations: [
          'Multi-action contamination: auxiliary road sweeping (aux_road_sweep_for_S12) overlapped during window',
          '3 spatial bins excluded; remaining bins insufficient for isolated counterfactual assessment'
        ]
      };

      return {
        schema_version: '0.9',
        clock: {
          clock_mode: 'SCENARIO',
          effective_now: '2026-10-18T13:30:00Z',
          scenario_id: 'water_suppression_confounded_overlap_01',
          clock_revision: 1
        },
        intervention: {
          id: 'int_water_overlap_01',
          revision: 1,
          zone_id: 'action_zone_sarai_kale_khan_ring_road_demo',
          zone_version_id: 'zonev_action_sarai_kale_khan_ring_road_demo_1',
          reference_zone_id: 'reference_zone_sarai_kale_khan_01',
          reference_zone_version_id: 'zonev_reference_sarai_kale_khan_01_1',
          evaluation_plan_id: 'evalplan_water_overlap_01_v1',
          type: 'water_suppression',
          lifecycle: 'result_available',
          proposed_at: '2026-10-18T10:00:00Z',
          action_started_at: '2026-10-18T10:15:00Z',
          action_completed_at: '2026-10-18T10:30:00Z',
          marked_done_at: '2026-10-18T10:35:00Z',
          timezone: 'Asia/Kolkata',
          checkpoint_offsets_minutes: [0, 60, 180, 360],
          action_confirmation_basis: 'officer_self_reported',
          scenario_id: 'water_suppression_confounded_overlap_01'
        },
        evaluation_plan: {
          ...this.interventionState.evaluation_plan,
          id: 'evalplan_water_overlap_01_v1',
          action_zone_version_id: 'zonev_action_sarai_kale_khan_ring_road_demo_1'
        },
        zone_versions: this.interventionState.zone_versions,
        scenario_projections: [overlapProj],
        observed_evaluations: [],
        context_measurement_ids: ['aux_road_sweep_for_S12', 'ctx_weather_s12'],
        correction_notice: null,
        disclaimer: 'Synthetic demonstration. Overlapping secondary road sweeping action confounds evaluation.'
      };
    }

    // Generic handler for remaining catalog cases S01, S03-S09, S11
    const matchCase = scenarioCatalogFixture.cases.find(
      (c) => c.case_id === id || c.scenario_id === id
    );

    if (matchCase) {
      const isS01 = matchCase.case_id === 'S01';
      const isS11 = matchCase.case_id === 'S11';
      const isNoResp = ['S04', 'S07', 'S08'].includes(matchCase.case_id);

      const status = isS11
        ? 'confounded_scenario'
        : isNoResp
        ? 'simulated_no_measurable_improvement'
        : 'simulated_improvement';

      const effectVal = isS11 || isNoResp ? 0.0 : -32.5;

      const genericProj: ScenarioProjection = {
        id: `proj_${matchCase.case_id.toLowerCase()}_180`,
        scenario_id: matchCase.scenario_id,
        intervention_id: `int_${matchCase.case_id.toLowerCase()}_01`,
        intervention_revision: 1,
        evaluation_plan_id: `evalplan_${matchCase.case_id.toLowerCase()}_v1`,
        checkpoint_offset_minutes: 180,
        metric: matchCase.target_metric as Metric,
        status,
        action_pre_ug_m3: 158.0,
        action_post_ug_m3: isNoResp ? 157.0 : 125.5,
        reference_pre_ug_m3: 154.0,
        reference_post_ug_m3: 153.0,
        effect_ug_m3: effectVal,
        effect_interval: isNoResp || isS11 ? null : {
          low: -40.0,
          high: -24.0,
          level: 0.95,
          method: 'bootstrap_percentile_v1'
        },
        method_version: 'synthetic_did_kernel_v1',
        generated_at: '2026-10-08T13:00:00Z',
        confounders: isS11
          ? [
              {
                code: 'WIND_DIRECTION_SHIFT',
                state: 'TRIGGERED',
                outcome: 'confounded',
                applies_to: 'COMPARISON',
                observed_value: 120.0,
                threshold: 45.0,
                unit: 'degrees',
                policy_version: 'wind_alignment_v1',
                input_measurement_ids: ['ctx_weather_s11_wind_shift'],
                display_text: 'Wind direction rotated 120° during evaluation window, rotating plume and confounding downwind reference area.'
              }
            ]
          : [],
        limitations: isS01
          ? ['Pre-Gate 1 unverified corridor geometry; proposed flagship candidate without physical anchors']
          : isS11
          ? ['Meteorological shift confounds downwind reference area']
          : ['Synthetic model projection; unverified for regulatory compliance']
      };

      return {
        schema_version: '0.9',
        clock: {
          clock_mode: 'SCENARIO',
          effective_now: '2026-10-08T13:00:00Z',
          scenario_id: matchCase.scenario_id,
          clock_revision: 1
        },
        intervention: {
          id: `int_${matchCase.case_id.toLowerCase()}_01`,
          revision: 1,
          zone_id: matchCase.candidate_zone_id,
          zone_version_id: `zonev_${matchCase.candidate_zone_id}_1`,
          reference_zone_id: `reference_zone_${matchCase.case_id.toLowerCase()}_01`,
          reference_zone_version_id: `zonev_reference_${matchCase.case_id.toLowerCase()}_01_1`,
          evaluation_plan_id: `evalplan_${matchCase.case_id.toLowerCase()}_v1`,
          type: matchCase.action_type,
          lifecycle: 'result_available',
          proposed_at: '2026-10-08T09:30:00Z',
          action_started_at: '2026-10-08T09:50:00Z',
          action_completed_at: '2026-10-08T10:00:00Z',
          marked_done_at: '2026-10-08T10:05:00Z',
          timezone: 'Asia/Kolkata',
          checkpoint_offsets_minutes: [0, 60, 180, 360, 720],
          action_confirmation_basis: 'officer_self_reported',
          scenario_id: matchCase.scenario_id
        },
        evaluation_plan: {
          ...this.interventionState.evaluation_plan,
          id: `evalplan_${matchCase.case_id.toLowerCase()}_v1`,
          action_zone_version_id: `zonev_${matchCase.candidate_zone_id}_1`
        },
        zone_versions: this.interventionState.zone_versions,
        scenario_projections: [genericProj],
        observed_evaluations: [],
        context_measurement_ids: [`ctx_${matchCase.case_id.toLowerCase()}`],
        correction_notice: null,
        disclaimer: `Synthetic demonstration for case ${matchCase.case_id} (${matchCase.design_intent}).`
      };
    }

    return null;
  }

  public async listInterventions(): Promise<PublicInterventionResponse[]> {
    return [this.interventionState];
  }

  public async listZones(purpose?: string, districtId?: string): Promise<ZoneSummary[]> {
    let zones = this.zoneSummaries;
    if (purpose) {
      zones = zones.filter((z) => z.purposes.includes(purpose as any));
    }
    if (districtId) {
      zones = zones.filter((z) => z.district_id === districtId);
    }
    return zones;
  }

  public async getZone(id: string): Promise<ZoneVersion | null> {
    return this.zoneVersions.get(id) || null;
  }

  public async createDraftIntervention(payload: Partial<Intervention>): Promise<Intervention> {
    const newId = `int_draft_${Date.now()}`;
    const effectiveNow = this.interventionState.clock.effective_now;
    
    const draft: Intervention = {
      id: newId,
      revision: 1,
      zone_id: payload.zone_id || 'action_zone_palam_dwarka_demo',
      zone_version_id: payload.zone_version_id || 'zonev_action_palam_dwarka_demo_1',
      reference_zone_id: payload.reference_zone_id || null,
      reference_zone_version_id: payload.reference_zone_version_id || null,
      evaluation_plan_id: null,
      type: payload.type || 'water_suppression',
      lifecycle: 'draft',
      proposed_at: effectiveNow,
      action_started_at: null,
      action_completed_at: null,
      marked_done_at: null,
      timezone: 'Asia/Kolkata',
      checkpoint_offsets_minutes: payload.checkpoint_offsets_minutes || [0, 60, 180, 360, 720],
      action_confirmation_basis: 'officer_draft',
      scenario_id: payload.scenario_id || null
    };

    return draft;
  }

  public async freezePlan(interventionId: string, planPayload: Partial<EvaluationPlan>): Promise<EvaluationPlan> {
    const frozenPlan: EvaluationPlan = {
      ...this.interventionState.evaluation_plan,
      ...planPayload,
      id: planPayload.id || `evalplan_${interventionId}_frozen`,
      status: 'FROZEN',
      frozen_at: this.interventionState.clock.effective_now
    };
    return frozenPlan;
  }

  public async startAction(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    const time = timestamp || this.interventionState.clock.effective_now;
    this.interventionState.intervention.action_started_at = time;
    this.interventionState.intervention.lifecycle = 'in_progress';
    return this.interventionState.intervention;
  }

  public async markDone(interventionId: string, timestamp?: UtcTime): Promise<Intervention> {
    const time = timestamp || this.interventionState.clock.effective_now;
    this.interventionState.intervention.action_completed_at = time;
    this.interventionState.intervention.marked_done_at = time;
    this.interventionState.intervention.lifecycle = 'completed';
    return this.interventionState.intervention;
  }

  public async attachMedia(interventionId: string, mediaPayload: Partial<CameraEvent>): Promise<CameraEvent> {
    const event: CameraEvent = {
      id: `cam_event_${Date.now()}`,
      hotspot_id: mediaPayload.hotspot_id || 'hotspot_anand_vihar_demo_01',
      camera_source: mediaPayload.camera_source || 'officer_device_upload',
      media_type: mediaPayload.media_type || 'image',
      detection_method: 'officer_manual_attachment',
      label: mediaPayload.label || 'operational_dust_suppression_activity',
      recorded_at: this.interventionState.clock.effective_now,
      scenario_event_at: null,
      position: mediaPayload.position || { lat: 28.6469, lng: 77.3160 },
      evidence_access: 'restricted_media',
      media_object_id: `upload-${Date.now()}`,
      illustrative_only: true,
      provenance: {
        origin: 'observed_direct',
        dataset_id: 'delhi_municipal_actions_2026',
        source_id: 'field_officer_terminal',
        provider: 'Municipal Corporation of Delhi',
        license_id: null,
        method_version: 'media_upload_v1',
        scenario_id: null,
        generator_version: null,
        anchor_record_ids: []
      }
    };
    this.cameraEvents.push(event);
    return event;
  }

  public async submitCorrection(interventionId: string, notice: string): Promise<PublicInterventionResponse> {
    const clock = this.interventionState.clock;
    const priorRev = this.interventionState.intervention.revision;
    const newRev = priorRev + 1;
    this.interventionState.intervention.revision = newRev;
    this.interventionState.correction_notice = notice;
    // Update scenario projections intervention_revision
    for (const p of this.interventionState.scenario_projections) {
      p.intervention_revision = newRev;
    }
    return JSON.parse(JSON.stringify(this.interventionState));
  }

  public async getOverlapAssessment(id: string): Promise<ActionOverlapAssessment | null> {
    return this.overlapAssessments.get(id) || null;
  }

  public async getCameraEvent(id: string): Promise<CameraEvent | null> {
    return this.cameraEvents.find((e) => e.id === id) || this.cameraEvents[0] || null;
  }

  public async getNarrative(agentType: AgentType, targetId: string): Promise<AgentNarrativeResponse> {
    const agentMap: Record<AgentType, { id: string; state: EvidenceState }> = {
      hotspot: { id: 'aerify-hotspot-agent', state: 'DIRECTLY_OBSERVED' },
      simulation: { id: 'aerify-simulation-agent', state: 'SYNTHETIC' },
      audit: { id: 'aerify-audit-agent', state: 'DIRECTLY_OBSERVED' }
    };
    const meta = agentMap[agentType];
    return {
      agent_id: meta.id,
      agent_type: agentType,
      target_id: targetId,
      model_id: 'gemini-2.5-flash-lite',
      evidence_state: meta.state,
      summary: `Vertex AI (${meta.id}) diagnostic for ${targetId}: Grounded in governed Gold SQL views with strict separation between 250 m street observations and regional context.`,
      evidence_bullets: [
        `Target entity: ${targetId} evaluated under Schema 0.9 contract`,
        'Policy version: water_suppression_demo_policy_v1 (rain >= 0.5 mm/h, wind delta >= 2.0 m/s)',
        'Difference-in-Differences compares action corridor against pre-frozen reference corridor'
      ],
      confounder_disclosure: 'Meteorological and multi-action overlap gates checked prior to attribution.',
      governance_caveat:
        meta.state === 'SYNTHETIC'
          ? 'Synthetic demonstration. Projections do not describe a real government intervention.'
          : 'Reports observed association relative to a matched reference corridor, never causal proof.',
      generated_at: this.interventionState.clock.effective_now,
      is_fallback: false,
      cached: true
    };
  }

  public async loginWithCloudSql(payload: {
    email?: string;
    firebase_uid?: string;
    display_name?: string;
    requested_role?: Role;
  }): Promise<SessionInfo> {
    const role: Role =
      payload.requested_role ||
      (payload.email?.includes('dpcc') || payload.email?.includes('supervisor') ? 'SUPERVISOR' : 'OFFICER');
    this.setFixtureRole(role);
    const me = await this.getMe();
    return {
      ...me,
      auth_mode: 'FIREBASE',
      display_name: payload.display_name || payload.email || me.display_name,
      user: {
        firebase_uid: payload.firebase_uid || `uid_${payload.email || role.toLowerCase()}`,
        email: payload.email || `${role.toLowerCase()}@mcd.delhi.gov.in`,
        role,
        active: true,
        actor_ref: `actor_${role.toLowerCase()}_01`,
        display_name: payload.display_name || me.display_name,
        department:
          role === 'SUPERVISOR'
            ? 'Delhi Pollution Control Committee (DPCC)'
            : 'Municipal Corporation of Delhi (MCD)'
      }
    };
  }

  public async listCloudSqlUsers() {
    return [
      {
        firebase_uid: 'uid_esha_khare_mcd',
        email: 'esha.khare@mcd.delhi.gov.in',
        role: 'OFFICER' as Role,
        active: true,
        actor_ref: 'actor_mcd_officer_esha',
        display_name: 'Esha Khare — MCD Field Officer',
        department: 'Municipal Corporation of Delhi (MCD)'
      },
      {
        firebase_uid: 'supervisor@dpcc.delhi.gov.in',
        email: 'supervisor@dpcc.delhi.gov.in',
        role: 'SUPERVISOR' as Role,
        active: true,
        actor_ref: 'actor_dpcc_supervisor_02',
        display_name: 'DPCC Senior Oversight Supervisor',
        department: 'Delhi Pollution Control Committee (DPCC)'
      },
      {
        firebase_uid: 'demo_public_uid',
        email: 'citizen@delhi.in',
        role: 'PUBLIC' as Role,
        active: true,
        actor_ref: 'actor_public_citizen',
        display_name: 'Public Citizen Viewer',
        department: 'Citizen Portal'
      }
    ];
  }
}
