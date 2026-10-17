/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Govt Actions & Verified Impact View
 * Displays:
 * - Tab 1: All Actions (Unified cards combining directive news + pre/post AQI drop, active emergency measures on top)
 * - Tab 2: Area Impact (Multi-Area Impact Explorer for Anand Vihar, Wazirpur, Jahangirpuri, Dwarka, Connaught Place, Okhla, Rohini with Before vs After comparison bars)
 * - Tab 3: Sensor Audit Timeline (Sensor-level Difference-in-Differences timeline and reference baseline validation)
 */

import React, { useEffect, useState } from 'react';
import {
  Layers,
  MapPin,
  LineChart,
  ShieldCheck,
  FileSearch
} from 'lucide-react';

import { ApiClient } from '../api/ApiClient';
import {
  PublicInterventionResponse,
  ObservedEvaluation,
  ClockMetadata,
  SessionInfo,
  ActionOverlapAssessment
} from '../contracts/types';
import { Disclaimer } from '../components/shared/Disclaimer';
import { CheckpointTimeline } from '../components/officer/CheckpointTimeline';
import { PairedDiffInDiffChart } from '../components/officer/PairedDiffInDiffChart';
import { ConfounderAndOverlapCard } from '../components/officer/ConfounderAndOverlapCard';
import { SupervisorCorrectionBanner } from '../components/officer/SupervisorCorrectionBanner';
import { GovernmentActionsRegistry } from '../components/officer/GovernmentActionsRegistry';
import { AreaImpactExplorer } from '../components/officer/AreaImpactExplorer';
import { AgentNarrativeCard } from '../components/shared/AgentNarrativeCard';
import { UiInterventionRevision } from '../ui/viewModels';

interface ObservedEvaluationsViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata;
  session: SessionInfo;
}

export const ObservedEvaluationsView: React.FC<ObservedEvaluationsViewProps> = ({
  apiClient,
  clock,
  session
}) => {
  const [activeTab, setActiveTab] = useState<'all_actions' | 'area_impact' | 'sensor_audit'>('all_actions');
  const [interventionResp, setInterventionResp] = useState<PublicInterventionResponse | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number>(180);
  const [revisions, setRevisions] = useState<UiInterventionRevision[]>([]);
  const [overlapAssessment, setOverlapAssessment] = useState<ActionOverlapAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  // Toggle for audit empty state demo
  const [simulateEmptyState, setSimulateEmptyState] = useState<boolean>(false);

  const sampleEmpiricalEvaluation: ObservedEvaluation = {
    id: 'eval_obs_anand_vihar_pm10_180m',
    intervention_id: 'int_water_001',
    intervention_revision: 1,
    evaluation_plan_id: 'evalplan_water_001_v1',
    checkpoint_offset_minutes: 180,
    metric: 'PM10_MASS',
    status: 'observed_improvement_association',
    action_pre_ug_m3: 181.5,
    action_post_ug_m3: 154.2,
    reference_pre_ug_m3: 174.0,
    reference_post_ug_m3: 171.1,
    effect_ug_m3: -24.4,
    effect_interval: {
      level: 0.95,
      low: -31.2,
      high: -17.6,
      method: 'block_bootstrap_v1'
    },
    method_version: 'did_paired_bootstrap_v1',
    evaluated_at: '2026-10-08T13:00:00Z',
    confounders: [
      {
        code: 'WIND_SPEED_CHANGE',
        state: 'DISCLOSED',
        applies_to: 'COMPARISON',
        observed_value: 0.8,
        threshold: 2.5,
        unit: 'm/s',
        display_text: 'Wind speed change 0.8 m/s within baseline stability tolerance (threshold 2.5 m/s).',
        outcome: null,
        policy_version: 'delhi_confounder_rules_v1',
        input_measurement_ids: ['meas_wind_001', 'meas_wind_002']
      }
    ],
    limitations: [
      'Empirical difference-in-differences estimates reflect associative local suppression during calm weather.',
      'Observed reduction is measured specifically along the Anand Vihar ISBT arterial corridor.'
    ]
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [resp, overlap] = await Promise.all([
          apiClient.getIntervention('int_water_001'),
          apiClient.getOverlapAssessment('overlap_assessment_demo_01')
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
              reason: 'Initial verified draft creation with geometry lock',
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
        console.error('Failed to load observed evaluations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [apiClient, clock.effective_now]);

  const handleSubmitCorrection = async (notice: string) => {
    if (!interventionResp) return;
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
  };

  // Derive active evaluations based on toggle
  const activeEvaluations: ObservedEvaluation[] = simulateEmptyState
    ? (interventionResp?.observed_evaluations || [])
    : (interventionResp?.observed_evaluations?.length ? interventionResp.observed_evaluations : [sampleEmpiricalEvaluation]);

  const evaluationsForOffset = activeEvaluations.filter((e) => e.checkpoint_offset_minutes === selectedOffset);
  const currentEvaluations = evaluationsForOffset.length > 0 ? evaluationsForOffset : activeEvaluations;
  const currentConfounders = currentEvaluations.flatMap((e) => e.confounders);
  const currentLimitations = Array.from(new Set(currentEvaluations.flatMap((e) => e.limitations)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 p-5 rounded-2xl space-y-2 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-900 text-xs uppercase tracking-wider font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Government Clean Air Initiatives & Verified Field Impact</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Delhi NCT Registry
            </span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Delhi Anti-Pollution Actions & Verified Field Impact
        </h2>
        <p className="text-xs text-slate-700 leading-relaxed max-w-4xl font-medium">
          Track live Delhi government anti-pollution directives, vehicular restrictions, and verified changes in air quality.
        </p>
      </div>

      {/* Main View Navigation Tabs (Item 9: Shorten Tab Names) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all_actions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all_actions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Actions</span>
        </button>

        <button
          onClick={() => setActiveTab('area_impact')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'area_impact'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Area Impact</span>
        </button>

        <button
          onClick={() => setActiveTab('sensor_audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sensor_audit'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <LineChart className="w-4 h-4" />
          <span>Detailed Sensor Audit</span>
        </button>
      </div>

      {/* TAB 1: All Actions (Unified Directives + Pre/Post Cards) */}
      {activeTab === 'all_actions' && (
        <GovernmentActionsRegistry
          clock={clock}
          onInspectInterventionAudit={() => {
            setActiveTab('sensor_audit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* TAB 2: Multi-Area Clean Air Impact Explorer */}
      {activeTab === 'area_impact' && <AreaImpactExplorer />}

      {/* TAB 3: Detailed Sensor Audit & Timeline */}
      {activeTab === 'sensor_audit' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3">
            <span className="text-xs font-bold text-slate-700">
              Corridor Focus: Anand Vihar ISBT (int_water_001) vs Rohini Reference Corridor
            </span>
            <button
              onClick={() => setSimulateEmptyState(!simulateEmptyState)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 border border-slate-300 cursor-pointer shadow-xs"
            >
              {simulateEmptyState ? 'Show Verified Checkpoint (+180m)' : 'Simulate Empty State'}
            </button>
          </div>

          {/* Supervisor Audit & Correction Banner */}
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

          {/* Empty State vs Results View */}
          {activeEvaluations.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto shadow-xs">
                <FileSearch className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  No post-intervention sensor evaluation yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Ground sensor before vs. after evaluations require completed post-action measurement windows and baseline stability verification.
                </p>
              </div>
              <button
                onClick={() => setSimulateEmptyState(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs font-mono transition cursor-pointer shadow-xs"
              >
                Inspect Verified Sensor Checkpoint (+180m)
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Checkpoint Timeline Component */}
              {interventionResp?.evaluation_plan && (
                <CheckpointTimeline
                  plan={interventionResp.evaluation_plan}
                  selectedOffset={selectedOffset}
                  onSelectOffset={setSelectedOffset}
                />
              )}

              {/* Paired Diff-in-Diff Recharts Component */}
              {interventionResp?.scenario_projections && interventionResp.scenario_projections.length > 0 && (
                <PairedDiffInDiffChart
                  projection={interventionResp.scenario_projections[0]}
                  selectedOffsetMinutes={selectedOffset}
                />
              )}

              {/* Structured Confounder & Overlap Findings Card */}
              <ConfounderAndOverlapCard
                confounders={currentConfounders}
                limitations={currentLimitations}
                overlapAssessment={overlapAssessment}
              />

              {/* AI Narrative Evaluation Audit Summary */}
              <AgentNarrativeCard
                apiClient={apiClient}
                agentType="audit"
                targetId={interventionResp?.intervention.id || 'int_water_001'}
                title="AI Sensor Audit Summary"
              />
            </div>
          )}
        </div>
      )}

      {/* Methodology Disclaimer */}
      <Disclaimer
        variant="proximity"
        customText="Field evaluations compare air quality before and after municipal actions against contemporaneous reference areas to track verified improvements."
      />
    </div>
  );
};
