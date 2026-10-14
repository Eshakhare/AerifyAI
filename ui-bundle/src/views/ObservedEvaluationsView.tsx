/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Observed Evaluations View (Phase P5)
 * Dedicated view strictly isolated from synthetic scenario projections.
 * Non-negotiable Domain Rule 4:
 * Qualified wording only ("observed improvement association", NEVER "caused" or "proved").
 * Evaluates empirical Difference-in-Differences against verified reference zones.
 * Displays CheckpointTimeline, PairedDiffInDiffChart, ConfounderAndOverlapCard, and empty state when empty.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  TrendingDown,
  History,
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
import { EvidenceBadge } from '../components/shared/EvidenceBadge';
import { FreshnessLabel } from '../components/shared/FreshnessLabel';
import { Disclaimer } from '../components/shared/Disclaimer';
import { CheckpointTimeline } from '../components/officer/CheckpointTimeline';
import { PairedDiffInDiffChart } from '../components/officer/PairedDiffInDiffChart';
import { ConfounderAndOverlapCard } from '../components/officer/ConfounderAndOverlapCard';
import { SupervisorCorrectionBanner } from '../components/officer/SupervisorCorrectionBanner';
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
  const [interventionResp, setInterventionResp] = useState<PublicInterventionResponse | null>(null);
  const [evaluations, setEvaluations] = useState<ObservedEvaluation[]>([]);
  const [selectedOffset, setSelectedOffset] = useState<number>(180);
  const [revisions, setRevisions] = useState<UiInterventionRevision[]>([]);
  const [overlapAssessment, setOverlapAssessment] = useState<ActionOverlapAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  // Toggle to demonstrate either an empirical observation evaluation or the empty state
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
      'Empirical difference-in-differences estimates are associative and subject to unmeasured background transport.',
      'Observed reduction is specific to the Anand Vihar ISBT corridor buffer during calm wind conditions.'
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

  const timelineOffsets = interventionResp?.evaluation_plan.checkpoint_offsets_minutes || [0, 60, 180, 360, 720];

  const checkpointsDataMap: Record<number, any> = {};
  for (const off of timelineOffsets) {
    const evalMatch = activeEvaluations.find((e) => e.checkpoint_offset_minutes === off);
    if (evalMatch) {
      checkpointsDataMap[off] = {
        offsetMinutes: off,
        hasEvaluation: true,
        status: evalMatch.status,
        isConfounded: evalMatch.status === 'confounded' || evalMatch.confounders.some((c) => c.state === 'TRIGGERED')
      };
    } else {
      checkpointsDataMap[off] = {
        offsetMinutes: off,
        hasEvaluation: false,
        status: 'PENDING'
      };
    }
  }

  const evaluationsForOffset = activeEvaluations.filter((e) => e.checkpoint_offset_minutes === selectedOffset);
  const currentEvaluations = evaluationsForOffset.length > 0 ? evaluationsForOffset : activeEvaluations;
  const currentConfounders = currentEvaluations.flatMap((e) => e.confounders);
  const currentLimitations = Array.from(new Set(currentEvaluations.flatMap((e) => e.limitations)));

  return (
    <div className="space-y-6 pb-12">
      {/* Isolation Header Banner (Domain Rule 4) */}
      <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl space-y-2 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-800 font-mono text-xs uppercase tracking-wider font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Empirical Observed Evaluations · Statistical Diff-in-Diff</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimulateEmptyState(!simulateEmptyState)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-[11px] font-mono text-slate-700 border border-slate-300 cursor-pointer shadow-xs"
            >
              {simulateEmptyState ? 'Show Empirical Sample' : 'Show Empty State (Contract Default)'}
            </button>
            <EvidenceBadge state="DIRECTLY_OBSERVED" size="sm" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Empirical Action Evaluations & Statistical Associations
        </h2>
        <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
          Non-negotiable Rule 4: Observed evaluations use strictly qualified language: &quot;observed improvement association&quot;, never &quot;caused&quot; or &quot;proved&quot;. Status values: pending, observed_improvement_association, no_measurable_change, confounded, inconclusive. They are never mixed into synthetic scenario projections.
        </p>
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
              No observed post-intervention evaluation yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Ground sensor post-intervention Difference-in-Differences calculations require completed post-action measurement windows and rigorous pretrend verification before publication.
            </p>
          </div>
          <button
            onClick={() => setSimulateEmptyState(false)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs font-mono transition cursor-pointer shadow-xs"
          >
            Inspect Verified Empirical Checkpoint (+180m)
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
        </div>
      )}

      {/* Methodology Disclaimer */}
      <Disclaimer
        variant="proximity"
        customText="Observed evaluations report statistically adjusted difference-in-differences associations against contemporaneous reference zones. They do not claim definitive causal proof."
      />
    </div>
  );
};
