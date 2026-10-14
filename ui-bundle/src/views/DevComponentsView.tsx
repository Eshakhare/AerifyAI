/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Dev Components Sandbox & Storybook Catalog
 * Displays every badge state, label rule, disclaimer variant, and hatched pattern.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Clock,
  Shield,
  Gauge,
  MapPin,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  Compass
} from 'lucide-react';

import { EvidenceBadge } from '../components/shared/EvidenceBadge';
import { CoverageBadge } from '../components/shared/CoverageBadge';
import { FreshnessLabel } from '../components/shared/FreshnessLabel';
import { AqiLabel } from '../components/shared/AqiLabel';
import { ZoneStatusBadges } from '../components/shared/ZoneStatusBadges';
import { Disclaimer } from '../components/shared/Disclaimer';
import { HatchedNoData } from '../components/shared/HatchedNoData';
import { CapabilityGuard } from '../components/shared/CapabilityGuard';
import { EnvironmentalContextDrawer } from '../components/drawer/EnvironmentalContextDrawer';
import { ScenarioProvenanceModal } from '../components/scenarios/ScenarioProvenanceModal';
import { defaultApiClient, ApiClient } from '../api';

import {
  EvidenceState,
  Coverage,
  AqiDerivation,
  ZoneSummary,
  ClockMetadata,
  SessionInfo,
  ScenarioRun
} from '../contracts/types';
import { BAND_COLOR_TOKENS } from '../ui/viewModels';

interface DevComponentsViewProps {
  clock: ClockMetadata;
  session: SessionInfo;
  apiClient?: ApiClient;
}

export const DevComponentsView: React.FC<DevComponentsViewProps> = ({
  clock,
  session,
  apiClient = defaultApiClient
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [sampleScenario, setSampleScenario] = useState<ScenarioRun | null>(null);
  const evidenceStates: EvidenceState[] = [
    'DIRECTLY_OBSERVED',
    'OBSERVED_NEARBY',
    'MODEL_ESTIMATED',
    'SYNTHETIC',
    'INSUFFICIENT_EVIDENCE'
  ];

  const coverages: Coverage[] = [
    { state: 'current', sample_count: 420, source_count: 5, last_observation_at: '2026-10-08T12:55:00Z', expected_interval_seconds: 60 },
    { state: 'sparse', sample_count: 12, source_count: 1, last_observation_at: '2026-10-08T12:15:00Z', expected_interval_seconds: 900 },
    { state: 'modeled_only', sample_count: 1, source_count: 1, last_observation_at: '2026-10-08T12:00:00Z', expected_interval_seconds: 3600 },
    { state: 'synthetic_only', sample_count: 180, source_count: 1, last_observation_at: '2026-10-08T13:00:00Z', expected_interval_seconds: 60 },
    { state: 'stale', sample_count: 0, source_count: 0, last_observation_at: '2026-10-07T10:00:00Z', expected_interval_seconds: 900 },
    { state: 'no_data', sample_count: 0, source_count: 0, last_observation_at: null, expected_interval_seconds: 900 }
  ];

  const aqiDerivations: Array<{ title: string; derivation: AqiDerivation; val: number | null }> = [
    {
      title: 'Rule 1: Official Regulatory Station AQI',
      derivation: {
        kind: 'regulatory_cpcb_aqi',
        data_sufficiency_status: 'sufficient',
        insufficiency_reason: null,
        primary_pollutant: 'PM2.5'
      },
      val: 342
    },
    {
      title: 'Rule 1: Estimated Local AQI (Spatial Model)',
      derivation: {
        kind: 'estimated_local_aqi',
        data_sufficiency_status: 'sufficient',
        insufficiency_reason: null,
        primary_pollutant: 'PM10'
      },
      val: 215
    },
    {
      title: 'Rule 1: PM-based Air Quality Indicator (Single Sensor)',
      derivation: {
        kind: 'pm_based_air_quality_indicator',
        data_sufficiency_status: 'sufficient',
        insufficiency_reason: null,
        primary_pollutant: 'PM2.5'
      },
      val: 178
    },
    {
      title: 'Rule 1: Pollutant Sub-index',
      derivation: {
        kind: 'pollutant_subindex',
        data_sufficiency_status: 'sufficient',
        insufficiency_reason: null,
        primary_pollutant: 'PM10'
      },
      val: 154
    },
    {
      title: 'Rule 1: Insufficient Station Coverage (Suppressed Value)',
      derivation: {
        kind: 'regulatory_cpcb_aqi',
        data_sufficiency_status: 'insufficient',
        insufficiency_reason: 'Missing mandatory 16-hr valid readings for PM2.5 & NO2',
        primary_pollutant: null
      },
      val: 999
    }
  ];

  const sampleZones: ZoneSummary[] = [
    {
      zone_id: 'action_zone_palam_dwarka_demo',
      name: 'Palam–Dwarka corridor (Proposed Flagship)',
      district_id: 'dist_south_west',
      purposes: ['ACTION'],
      latest_zone_version_id: 'zonev_action_palam_dwarka_demo_1',
      anchor_state: 'UNVERIFIED',
      verified_anchor_count: null,
      display_label: 'Fully synthetic demonstration — no verified observed anchors in this zone',
      observation_grade_wording_allowed: false,
      geometry_status: 'PLACEHOLDER',
      flagship_status: 'PROPOSED',
      scenario_case_id: 'S01',
      route_version_ids: []
    },
    {
      zone_id: 'action_zone_anand_vihar_demo',
      name: 'Anand Vihar ISBT vicinity (Anchored Demo)',
      district_id: 'dist_east',
      purposes: ['ACTION'],
      latest_zone_version_id: 'zonev_action_anand_vihar_demo_1',
      anchor_state: 'ANCHORED',
      verified_anchor_count: 1,
      display_label: 'Synthetic demo — based on historical PM observations and contextual models',
      observation_grade_wording_allowed: true,
      geometry_status: 'PLACEHOLDER',
      flagship_status: 'NOT_FLAGSHIP',
      scenario_case_id: 'S02',
      route_version_ids: ['routev_synthetic_corridor_01_1']
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Intro Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Shared Component System · Storybook Reference</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1">
          Aerify Shared UI Badges & Compliance Sandbox
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Living reference verifying Non-negotiable Domain Rules 1–10: anti-slop typography, explicit text and icons on every evidence state, hatched no-data patterns, CPCB AQI naming rules, and authoritative server clock freshness.
        </p>
      </div>

      {/* 1. EvidenceBadge Specification */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              1. EvidenceBadge (Domain Rule 2)
            </h3>
            <p className="text-xs text-slate-400">
              Required on every value, cell, road, and chart series. Colour is NEVER the only cue.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
            5 States
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidenceStates.map((st) => (
            <div key={st} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <EvidenceBadge state={st} size="md" />
                <span className="text-[10px] font-mono text-slate-500 uppercase">{st}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                <span className="text-[10px] text-slate-500">Sizes:</span>
                <EvidenceBadge state={st} size="sm" />
                <EvidenceBadge state={st} size="md" />
                <EvidenceBadge state={st} size="lg" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. CoverageBadge Specification */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              2. CoverageBadge (Domain Rule 3)
            </h3>
            <p className="text-xs text-slate-400">
              Coverage states with sample and source counts.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
            6 States
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {coverages.map((cov, idx) => (
            <div key={idx} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <CoverageBadge coverage={cov} showCounts={true} />
              <div className="text-[11px] text-slate-400 font-mono">
                Samples: {cov.sample_count} · Sources: {cov.source_count}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FreshnessLabel Specification */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              3. FreshnessLabel (Domain Rule 7)
            </h3>
            <p className="text-xs text-slate-400">
              Freshness calculated strictly relative to server clock (<code className="text-cyan-300">{clock.effective_now}</code>), never Date.now().
            </p>
          </div>
          <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
            Authoritative Time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Fresh (7m ago)</span>
            <FreshnessLabel observationTime="2026-10-08T12:55:00Z" clock={clock} />
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Recent (32m ago)</span>
            <FreshnessLabel observationTime="2026-10-08T12:30:00Z" clock={clock} />
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">Stale (&gt; 45m)</span>
            <FreshnessLabel observationTime="2026-10-08T11:00:00Z" clock={clock} />
          </div>
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase block font-mono">No Recent Observation</span>
            <FreshnessLabel observationTime={null} clock={clock} />
          </div>
        </div>
      </section>

      {/* 4. AqiLabel Specification */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              4. AqiLabel (Domain Rule 1)
            </h3>
            <p className="text-xs text-slate-400">
              Never calls PM-only values &quot;Official CPCB AQI&quot;. Respects insufficiency flags.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
            Domain Rule #1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {aqiDerivations.map((item, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono text-slate-400 block border-b border-slate-900 pb-1">
                {item.title}
              </span>
              <AqiLabel derivation={item.derivation} value={item.val} />
            </div>
          ))}
        </div>
      </section>

      {/* 5. ZoneStatusBadges Specification */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              5. ZoneStatusBadges (Domain Rule 4 & S01/S02 Flagship Alignment)
            </h3>
            <p className="text-xs text-slate-400">
              Displays anchor_state, geometry_status, flagship_status, and server display_label.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sampleZones.map((zone) => (
            <div key={zone.zone_id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">{zone.name}</span>
                <span className="font-mono text-[10px] text-slate-400">{zone.scenario_case_id}</span>
              </div>
              <ZoneStatusBadges zone={zone} />
            </div>
          ))}
        </div>
      </section>

      {/* 6. Disclaimers */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          6. Disclaimer Components (Domain Rules 4, 5, 6)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Disclaimer variant="synthetic" />
          <Disclaimer variant="media" />
          <Disclaimer variant="proximity" />
        </div>
      </section>

      {/* 7. HatchedNoData & CapabilityGuard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            7. HatchedNoData (Domain Rule 3)
          </h3>
          <p className="text-xs text-slate-400">
            Diagonal hatch overlay for unmeasured roads, stale cells, or offline monitoring stations.
          </p>
          <HatchedNoData label="No recent data" sublabel="Palam corridor feeder stretch — unmonitored" />
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            8. CapabilityGuard (Domain Rule 10)
          </h3>
          <p className="text-xs text-slate-400">
            Demonstrates explicit access denial state when session lacks required capability.
          </p>
          
          <CapabilityGuard
            requiredCapability="SUBMIT_CORRECTION"
            session={session}
            actionName="Correction Submission"
          >
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-xs text-emerald-200">
              Authorized: User has SUBMIT_CORRECTION capability.
            </div>
          </CapabilityGuard>
        </section>
      </div>

      {/* 9. CPCB AQI NAQI Legend Band Reference */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">
          9. CPCB NAQI Category Bands Palette
        </h3>
        <p className="text-xs text-slate-400">
          UI color palette keyed strictly by BandId. Thresholds are never hard-coded in UI components.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Object.values(BAND_COLOR_TOKENS).map((band) => (
            <div
              key={band.id}
              className={`p-3 rounded-lg border flex flex-col justify-between ${band.bgClass} ${band.borderClass}`}
            >
              <div className={`text-xs font-bold ${band.textClass}`}>{band.label}</div>
              <div className="font-mono text-[10px] text-slate-400 mt-2">{band.id}</div>
              <div className="font-mono text-[10px] text-slate-400">{band.hex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Environmental Context Drawer (P3 LocationContext & ContextDescriptor) */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              10. Environmental Context Drawer (LocationContext & ContextDescriptor)
            </h3>
            <p className="text-xs text-slate-400">
              Slide-out drawer containing weather parameters, Sentinel-5P NO₂ column (mol/m²), CAMS regional model, and proximity sources.
            </p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Launch Environmental Context Drawer</span>
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed">
          Demonstrates compliance with: top resolution notice and proximity disclaimer, weather context with rotating wind arrows, satellite columns in mol/m² (never µg/m³), footprint map toggle, and role-gated media inspection for public vs officer accounts.
        </div>
      </section>

      {/* 11. P5 Checkpoints, Recharts Paired Chart & Confounders Showcase */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            11. Phase P5 Checkpoints, Paired Diff-in-Diff Charts & Confounder Findings
          </h3>
          <p className="text-xs text-slate-400">
            Showcases the interactive checkpoint schedule [0, 60, 180, 360, 720], paired Recharts bars comparing action vs reference pre/post concentrations, structured confounders (RAIN / WIND_SPEED_CHANGE), and ActionOverlapAssessment (MULTI_ACTION_CONTAMINATION).
          </p>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
          Inspection active in <strong className="text-cyan-400">/scenarios</strong>, <strong className="text-emerald-400">/evaluations</strong>, and Step 5 of <strong className="text-amber-400">/officer</strong> portal.
        </div>
      </section>

      {/* 12. Phase P6 12-Case Scenario Explorer & Provenance Lineage Modal */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              12. Phase P6 Synthetic Scenario Explorer & Provenance Lineage
            </h3>
            <p className="text-xs text-slate-400">
              Interactive drawer & modal showcasing reproducible cryptographic seed hashes, deterministic branches (WITHOUT_ACTION vs WITH_ACTION), corridor classifications, and server display labels.
            </p>
          </div>

          <button
            onClick={async () => {
              const scList = await apiClient.listScenarios();
              const s02 = scList.find((s) => s.case_id === 'S02') || scList[0];
              setSampleScenario(s02);
              setIsProvenanceOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>Open Provenance Modal (S02)</span>
          </button>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
          <span>Fixed 12 catalog cases: S01–S12 partitioned by SUSTAINED, TEMPORARY, NO_RESPONSE, and CONFOUNDED.</span>
          <span className="text-cyan-400">Ready in /scenarios</span>
        </div>
      </section>

      {/* Slide-out Environmental Context Drawer */}
      <EnvironmentalContextDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        locationId="road_segment_anand_vihar_014"
        apiClient={apiClient}
        clock={clock}
        session={session}
      />

      {/* Provenance & Lineage Modal */}
      <ScenarioProvenanceModal
        scenario={sampleScenario}
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
      />
    </div>
  );
};
