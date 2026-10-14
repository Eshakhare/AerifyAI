/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Scenario Catalog & Synthetic Projections View (Phase P6)
 * Heading: "Synthetic demonstration" (Domain Rule 4)
 * Displays counterfactual model projections across the fixed 12 catalog cases (S01–S12).
 * Strictly segregated from empirical observations.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  LayoutGrid,
  Activity
} from 'lucide-react';

import { ApiClient } from '../api/ApiClient';
import {
  ScenarioRun,
  ZoneSummary,
  ClockMetadata,
  SessionInfo,
  PublicInterventionResponse,
  ScenarioProjection,
  ActionOverlapAssessment
} from '../contracts/types';
import { EvidenceBadge } from '../components/shared/EvidenceBadge';
import { ZoneStatusBadges } from '../components/shared/ZoneStatusBadges';
import { Disclaimer } from '../components/shared/Disclaimer';
import { CheckpointTimeline } from '../components/officer/CheckpointTimeline';
import { PairedDiffInDiffChart } from '../components/officer/PairedDiffInDiffChart';
import { ConfounderAndOverlapCard } from '../components/officer/ConfounderAndOverlapCard';
import { SupervisorCorrectionBanner } from '../components/officer/SupervisorCorrectionBanner';
import { ScenarioProvenanceModal } from '../components/scenarios/ScenarioProvenanceModal';
import {
  UiInterventionRevision,
  SCENARIO_GROUPS,
  ScenarioGroupKey,
  getScenarioGroupKey
} from '../ui/viewModels';

interface ScenariosViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata;
  session: SessionInfo;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  apiClient,
  clock,
  session
}) => {
  const [scenarios, setScenarios] = useState<ScenarioRun[]>([]);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioRun | null>(null);
  const [provenanceScenario, setProvenanceScenario] = useState<ScenarioRun | null>(null);
  const [interventionResp, setInterventionResp] = useState<PublicInterventionResponse | null>(null);
  const [overlapAssessment, setOverlapAssessment] = useState<ActionOverlapAssessment | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number>(180);
  const [revisions, setRevisions] = useState<UiInterventionRevision[]>([]);
  const [activeGroupFilter, setActiveGroupFilter] = useState<ScenarioGroupKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'inspector' | 'matrix'>('inspector');
  const [loading, setLoading] = useState(true);

  // 1. Initial Load of Scenarios and Zones
  useEffect(() => {
    async function loadScenarios() {
      try {
        setLoading(true);
        const [scList, zList] = await Promise.all([
          apiClient.listScenarios(),
          apiClient.listZones()
        ]);
        setScenarios(scList);
        setZones(zList);

        // Select S02 by default (anchored scenario projection fixture)
        const defaultSc = scList.find((s) => s.case_id === 'S02') || scList[0];
        setSelectedScenario(defaultSc);
      } catch (err) {
        console.error('Error loading scenarios:', err);
      } finally {
        setLoading(false);
      }
    }
    loadScenarios();
  }, [apiClient]);

  // 2. When Selected Scenario changes, load corresponding Intervention and Overlap data
  useEffect(() => {
    if (!selectedScenario) return;

    async function loadScenarioData() {
      try {
        const [resp, overlap] = await Promise.all([
          apiClient.getIntervention(selectedScenario?.id || selectedScenario?.case_id || 'int_water_001'),
          selectedScenario?.case_id === 'S12' || selectedScenario?.case_id === 'S10'
            ? apiClient.getOverlapAssessment('overlap_assessment_demo_01')
            : Promise.resolve(null)
        ]);

        setInterventionResp(resp);
        setOverlapAssessment(overlap);

        if (resp) {
          const revList: UiInterventionRevision[] = [
            {
              revision_id: `rev_${resp.intervention.id}_001`,
              intervention_id: resp.intervention.id,
              revision_number: 1,
              changed_at: '2026-10-08T09:45:00Z',
              changed_by: 'Automated Ingestion Gate',
              reason: 'Initial synthetic counterfactual compilation',
              is_superseded: resp.intervention.revision > 1
            }
          ];

          if (resp.correction_notice) {
            revList.push({
              revision_id: `rev_${resp.intervention.id}_002_correction`,
              intervention_id: resp.intervention.id,
              revision_number: 2,
              changed_at: clock.effective_now,
              changed_by: 'Supervisor Oversight Desk',
              reason: resp.correction_notice,
              is_superseded: false
            });
          }
          setRevisions(revList);
        }
      } catch (err) {
        console.error('Error loading scenario intervention results:', err);
      }
    }
    loadScenarioData();
  }, [apiClient, selectedScenario, clock.effective_now]);

  // Handle Supervisor Correction
  const handleSubmitCorrection = async (notice: string) => {
    if (!interventionResp) return;
    try {
      const updated = await apiClient.submitCorrection(interventionResp.intervention.id, notice);
      setInterventionResp(updated);

      const newRevItem: UiInterventionRevision = {
        revision_id: `rev_${updated.intervention.id}_00${updated.intervention.revision}`,
        intervention_id: updated.intervention.id,
        revision_number: updated.intervention.revision,
        changed_at: clock.effective_now,
        changed_by: session.display_name || 'Municipal Supervisor',
        reason: notice,
        is_superseded: false
      };

      setRevisions((prev) => [
        ...prev.map((r) => ({ ...r, is_superseded: true })),
        newRevItem
      ]);
    } catch (err) {
      console.error('Failed to submit correction:', err);
    }
  };

  // Find Zone for selected scenario
  const selectedZone = useMemo(() => {
    if (!selectedScenario) return null;
    return zones.find((z) => z.scenario_case_id === selectedScenario.case_id) || null;
  }, [selectedScenario, zones]);

  // Filtered Scenarios based on Group and Search Query
  const filteredScenarios = useMemo(() => {
    return scenarios.filter((sc) => {
      // Group filter
      if (activeGroupFilter !== 'ALL') {
        const group = getScenarioGroupKey(sc.case_id);
        if (group !== activeGroupFilter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const zone = zones.find((z) => z.scenario_case_id === sc.case_id);
        const matchCase = sc.case_id.toLowerCase().includes(q);
        const matchId = sc.id.toLowerCase().includes(q);
        const matchIntent = sc.design_intent.toLowerCase().includes(q);
        const matchZone = zone?.name.toLowerCase().includes(q);
        if (!matchCase && !matchId && !matchIntent && !matchZone) {
          return false;
        }
      }

      return true;
    });
  }, [scenarios, zones, activeGroupFilter, searchQuery]);

  // Timeline & Projections Mapping
  const timelineOffsets = interventionResp?.evaluation_plan.checkpoint_offsets_minutes || [0, 60, 180, 360, 720];
  const projections = interventionResp?.scenario_projections || [];
  const projectionsForOffset = projections.filter((p) => p.checkpoint_offset_minutes === selectedOffset);
  const activeProjections = projectionsForOffset.length > 0 ? projectionsForOffset : projections;

  const currentConfounders = activeProjections.flatMap((p) => p.confounders);
  const currentLimitations = Array.from(new Set(activeProjections.flatMap((p) => p.limitations)));

  // Timeline checkpoints state dictionary
  const checkpointsDataMap: Record<number, any> = {};
  for (const off of timelineOffsets) {
    const projMatch = projections.find((p) => p.checkpoint_offset_minutes === off);
    if (projMatch) {
      checkpointsDataMap[off] = {
        offsetMinutes: off,
        hasProjection: true,
        status: projMatch.status,
        isConfounded:
          projMatch.status === 'confounded_scenario' ||
          projMatch.confounders.some((c) => c.state === 'TRIGGERED')
      };
    } else {
      checkpointsDataMap[off] = {
        offsetMinutes: off,
        hasProjection: false,
        status: 'PENDING'
      };
    }
  }

  // Get decorative styling for a scenario case
  const getCaseBadges = (sc: ScenarioRun) => {
    const zone = zones.find((z) => z.scenario_case_id === sc.case_id);
    const groupKey = getScenarioGroupKey(sc.case_id);

    let intentLabel = sc.design_intent;
    let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';

    if (sc.case_id === 'S01') {
      intentLabel = 'Flagship Proposed';
      badgeColor = 'bg-amber-50 text-amber-900 border-amber-300';
    } else if (sc.case_id === 'S02') {
      intentLabel = 'Anchored Sustained';
      badgeColor = 'bg-emerald-50 text-emerald-900 border-emerald-300';
    } else if (sc.case_id === 'S03') {
      intentLabel = 'Rapid Decay';
      badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    } else if (sc.case_id === 'S04') {
      intentLabel = 'Low Dosage';
      badgeColor = 'bg-sky-50 text-sky-900 border-sky-300';
    } else if (sc.case_id === 'S05') {
      intentLabel = 'Mechanical Sweeping';
      badgeColor = 'bg-sky-50 text-sky-900 border-sky-300';
    } else if (sc.case_id === 'S06') {
      intentLabel = 'Sweeping Decay';
      badgeColor = 'bg-sky-50 text-sky-900 border-sky-300';
    } else if (sc.case_id === 'S07') {
      intentLabel = 'Smog Gun Targeted';
      badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
    } else if (sc.case_id === 'S08') {
      intentLabel = 'Mist Cannon Cont.';
      badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
    } else if (sc.case_id === 'S09') {
      intentLabel = 'Delayed Onset';
      badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
    } else if (sc.case_id === 'S10') {
      intentLabel = 'Rain Confounded';
      badgeColor = 'bg-rose-50 text-rose-900 border-rose-300';
    } else if (sc.case_id === 'S11') {
      intentLabel = 'Wind Shift Confounded';
      badgeColor = 'bg-rose-50 text-rose-900 border-rose-300';
    } else if (sc.case_id === 'S12') {
      intentLabel = 'Overlap Contamination';
      badgeColor = 'bg-rose-50 text-rose-900 border-rose-300';
    }

    return { intentLabel, badgeColor, zone, groupKey };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Synthetic Demonstration Header Banner (Domain Rule 4) */}
      <div className="bg-amber-50 border border-amber-300 p-5 rounded-2xl space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-amber-900 font-mono text-xs uppercase tracking-wider font-semibold">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Synthetic Demonstration · Municipal Scenario Catalog (Phase P6)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300 font-medium">
              catalog_version: scenario_catalog_v1
            </span>
            <EvidenceBadge state="SYNTHETIC" size="sm" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Action Impact Simulations
        </h2>

        <p className="text-xs text-slate-700 leading-relaxed max-w-4xl font-medium">
          Predictive AI Counterfactual Simulations — evaluating expected pollution reduction and weather/overlap confounders for municipal interventions before field deployment.
        </p>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-4xl">
          Non-negotiable Rule 4: Scenario projections represent synthetic counterfactual simulation branches across 12 fixed catalog corridors. They are strictly segregated from empirical observations. Inspect provenance lineage for cryptographic seeds and contextual anchors.
        </p>

        {/* Group Filter Tabs */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {SCENARIO_GROUPS.map((grp) => {
              const isActive = activeGroupFilter === grp.key;
              const count = grp.key === 'ALL' ? 12 : grp.caseIds.length;
              return (
                <button
                  key={grp.key}
                  onClick={() => setActiveGroupFilter(grp.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                    isActive
                      ? 'bg-amber-600 text-white border-amber-700 font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{grp.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setViewMode('inspector')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'inspector'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Inspector View</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>12-Case Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by case (e.g. S01, S12), corridor name (Anand Vihar, Palam), action type, or intent..."
          className="bg-transparent border-0 text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded-lg bg-slate-100 font-mono cursor-pointer border border-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* MATRIX VIEW MODE: Side-by-side grid of 12 cases */}
      {viewMode === 'matrix' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-sky-600" />
              <span>Delhi Municipal Intervention Scenario Matrix ({filteredScenarios.length} Cases)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Click any card to inspect or review algorithmic provenance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((sc) => {
              const { intentLabel, badgeColor, zone } = getCaseBadges(sc);
              const isSelected = selectedScenario?.id === sc.id;

              return (
                <div
                  key={sc.id}
                  className={`bg-white border rounded-2xl p-4.5 flex flex-col justify-between space-y-3 transition shadow-sm ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-300 bg-sky-50/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        Case {sc.case_id}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                        {intentLabel}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                        {zone?.name || sc.id}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        {sc.id}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed font-sans">
                      {sc.display_label}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                      <div className="text-slate-500">
                        Anchors: <span className="text-slate-800 font-bold">{sc.anchor_record_ids.length}</span>
                      </div>
                      <div className="text-slate-500">
                        Context: <span className="text-purple-700 font-bold">{sc.context_record_ids.length}</span>
                      </div>
                      <div className="text-slate-500">
                        Routes: <span className="text-sky-700 font-bold">{sc.route_version_ids.length || 'Unmeasured'}</span>
                      </div>
                      <div className="text-slate-500">
                        Seed: <span className="text-slate-700">{sc.seed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedScenario(sc);
                        setViewMode('inspector');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-mono font-semibold border border-sky-200 transition cursor-pointer flex-1 text-center shadow-xs"
                    >
                      Inspect Results
                    </button>

                    <button
                      onClick={() => setProvenanceScenario(sc)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono border border-slate-200 transition cursor-pointer flex items-center gap-1 shadow-xs"
                      title="View Provenance & Lineage"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-sky-600" />
                      <span>Lineage</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* INSPECTOR VIEW MODE: Master-Detail Layout */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Column: Filtered Catalog Cases List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 lg:col-span-1 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Catalog Cases</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {filteredScenarios.length} of 12
              </span>
            </div>

            <div className="space-y-2 max-h-[720px] overflow-y-auto scrollbar-thin pr-1">
              {filteredScenarios.map((sc) => {
                const isSelected = selectedScenario?.id === sc.id;
                const { intentLabel, badgeColor, zone } = getCaseBadges(sc);

                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenario(sc)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex flex-col space-y-2 ${
                      isSelected
                        ? 'bg-sky-50 border-sky-400 shadow-sm ring-1 ring-sky-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {sc.case_id}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${badgeColor}`}>
                        {intentLabel}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {zone?.name || sc.id}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {sc.id}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="font-mono text-slate-400">Seed: {sc.seed}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProvenanceScenario(sc);
                        }}
                        className="text-sky-700 hover:text-sky-900 font-mono font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>Lineage</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 3 Columns: Selected Scenario & Checkpoint Results */}
          <div className="lg:col-span-3 space-y-5">
            {selectedScenario ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm">
                {/* Header Info */}
                <div className="flex items-start justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900 font-mono">
                        Scenario Case {selectedScenario.case_id}: {selectedScenario.design_intent}
                      </span>
                      <button
                        onClick={() => setProvenanceScenario(selectedScenario)}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 text-[11px] font-mono flex items-center gap-1 cursor-pointer font-semibold shadow-xs"
                      >
                        <GitBranch className="w-3 h-3 text-sky-600" />
                        <span>Inspect Provenance & Lineage</span>
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-sky-700">
                      {selectedZone?.name || selectedScenario.id}
                    </h3>
                  </div>

                  <EvidenceBadge state="SYNTHETIC" size="md" />
                </div>

                {/* Zone Badges & Domain Rule 4 Display Label */}
                {selectedZone && (
                  <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-semibold">
                      Target Spatial Zone & Verified Anchors:
                    </span>
                    <ZoneStatusBadges zone={selectedZone} showDisplayLabel={true} />
                  </div>
                )}

                {/* Supervisor Correction Notice Banner if present */}
                {interventionResp && (
                  <SupervisorCorrectionBanner
                    interventionId={interventionResp.intervention.id}
                    currentRevision={interventionResp.intervention.revision}
                    correctionNotice={interventionResp.correction_notice}
                    revisions={revisions}
                    session={session}
                    clock={clock}
                    onSubmitCorrection={handleSubmitCorrection}
                  />
                )}

                {/* Checkpoint Timeline Component */}
                {interventionResp?.evaluation_plan && (
                  <CheckpointTimeline
                    plan={interventionResp.evaluation_plan}
                    selectedOffset={selectedOffset}
                    onSelectOffset={setSelectedOffset}
                  />
                )}

                {/* Paired Diff-in-Diff Recharts Component */}
                {activeProjections.length > 0 ? (
                  <PairedDiffInDiffChart
                    projection={activeProjections[0]}
                    selectedOffsetMinutes={selectedOffset}
                  />
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs font-mono text-slate-500">
                    No projection computed for offset +{selectedOffset}m in this scenario.
                  </div>
                )}

                {/* Structured Confounder & Overlap Findings Card */}
                <ConfounderAndOverlapCard
                  confounders={currentConfounders}
                  limitations={currentLimitations}
                  overlapAssessment={overlapAssessment}
                />

                {/* Mandatory Synthetic Disclaimer */}
                <Disclaimer
                  variant="synthetic"
                  customText="Synthetic demonstration. The timelines and projected outcomes do not describe a real government intervention. Municipal decisions require certified ground monitoring."
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 font-mono text-xs shadow-sm">
                Select a scenario case from the catalog to inspect counterfactual projections.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Provenance & Lineage Modal */}
      <ScenarioProvenanceModal
        scenario={provenanceScenario}
        zone={
          provenanceScenario
            ? zones.find((z) => z.scenario_case_id === provenanceScenario.case_id)
            : null
        }
        isOpen={!!provenanceScenario}
        onClose={() => setProvenanceScenario(null)}
      />
    </div>
  );
};
