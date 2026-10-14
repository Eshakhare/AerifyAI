/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Confounder & Overlap Findings Card
 * Renders ConfounderFinding[] and ActionOverlapAssessment strictly adhering to:
 * - display_text verbatim from the server
 * - badge state (TRIGGERED vs DISCLOSED below threshold)
 * - code, applies_to, observed_value vs threshold (unit), outcome, policy_version
 * - limitations: string[] as plain server-provided strings
 * - ActionOverlapAssessment (S12: excluded_bin_count, remaining_eligible_bin_count, outcome, reason_code: MULTI_ACTION_CONTAMINATION)
 *
 * The UI NEVER evaluates thresholds or composes confounder text.
 */

import React from 'react';
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  GitMerge,
  Layers,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import { ActionOverlapAssessment, ConfounderFinding } from '../../contracts/types';
import { formatUnit } from '../../ui/viewModels';

interface ConfounderAndOverlapCardProps {
  confounders: ConfounderFinding[];
  limitations?: string[];
  overlapAssessment?: ActionOverlapAssessment | null;
  policyVersion?: string;
}

export const ConfounderAndOverlapCard: React.FC<ConfounderAndOverlapCardProps> = ({
  confounders,
  limitations = [],
  overlapAssessment,
  policyVersion
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Structured Confounder Assessment & Municipal Overlap Control
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Policy: {policyVersion || 'water_suppression_demo_policy_v1'}
        </span>
      </div>

      {/* 1. Confounder Findings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wide">
            Evaluated Confounder Factors ({confounders.length})
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Rules strictly verified server-side
          </span>
        </div>

        {confounders.length === 0 ? (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No meteorological or contextual confounders triggered or disclosed for this evaluation window.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {confounders.map((finding, idx) => {
              const isTriggered = finding.state === 'TRIGGERED';
              return (
                <div
                  key={`${finding.code}-${idx}`}
                  className={`p-3.5 rounded-lg border font-mono text-xs space-y-2.5 ${
                    isTriggered
                      ? 'bg-amber-950/40 border-amber-700/80'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {/* Top Bar: Code badge, applies_to, and state */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isTriggered
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {finding.code}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Applies to: <strong className="text-white">{finding.applies_to}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isTriggered
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-600'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        State: {finding.state}
                      </span>
                      {finding.outcome && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-800">
                          Outcome: {finding.outcome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantitative Comparison: Observed vs Threshold */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Observed Value</span>
                      <strong className="text-white font-mono text-xs">
                        {finding.observed_value} {formatUnit(finding.unit)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Rule Threshold</span>
                      <span className="text-slate-300 font-mono text-xs">
                        {finding.threshold} {formatUnit(finding.unit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Policy Standard</span>
                      <span className="text-slate-400 font-mono text-[10px] truncate block">
                        {finding.policy_version}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Input Context Records</span>
                      <span className="text-cyan-400 font-mono text-[10px]">
                        {finding.input_measurement_ids.length > 0
                          ? `${finding.input_measurement_ids.length} linked`
                          : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Verbatim Server-Provided Display Text (Domain Rule) */}
                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-900/40 p-2.5 rounded border border-slate-800/60">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">Authoritative Evaluation Finding:</span>
                    <p className="italic">{finding.display_text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Action Overlap Assessment Section (S12 Multi-Action Contamination) */}
      {overlapAssessment && (
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-white uppercase tracking-wide">
                Action Overlap Assessment ({overlapAssessment.id})
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase">
              {overlapAssessment.reason_code}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Primary Action</span>
                <span className="text-cyan-400 text-xs truncate block">{overlapAssessment.primary_intervention_id}</span>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Interfering Action</span>
                <span className="text-amber-400 text-xs truncate block">{overlapAssessment.interfering_intervention_id}</span>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Excluded Bins</span>
                <strong className="text-rose-400 text-sm block">{overlapAssessment.excluded_bin_count} bins</strong>
              </div>
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block">Eligible Bins Left</span>
                <strong className="text-white text-sm block">{overlapAssessment.remaining_eligible_bin_count} bins</strong>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Overlap Policy: {overlapAssessment.overlap_policy_version} · Outcome: <strong className="uppercase">{overlapAssessment.outcome}</strong>
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Secondary municipal operation ({overlapAssessment.interfering_intervention_id}) overlapped between {new Date(overlapAssessment.overlap_start).toLocaleTimeString()} and {new Date(overlapAssessment.overlap_end).toLocaleTimeString()}. Contaminated road segments: {overlapAssessment.overlapping_road_segment_ids.join(', ')}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Server Limitations Strings */}
      {limitations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-mono font-semibold text-slate-400 block uppercase">
            Platform Limitations & Governance Disclosures:
          </span>
          <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 italic">
            {limitations.map((lim, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-slate-500">•</span>
                <span>{lim}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
