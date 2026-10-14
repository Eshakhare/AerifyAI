/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Checkpoint Timeline Component
 * Renders the authoritative sequence of evaluation checkpoint offsets [0, 60, 180, 360, 720]
 * (Completion T+0, +1h, +3h, +6h, +12h) with server-provided status and clock alignment.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EvaluationPlan } from '../../contracts/types';
import { formatCheckpointOffset } from '../../ui/viewModels';

export interface CheckpointData {
  offsetMinutes: number;
  status?: string;
  hasProjection?: boolean;
  hasEvaluation?: boolean;
  isConfounded?: boolean;
}

export interface CheckpointTimelineProps {
  offsets?: number[];
  plan?: EvaluationPlan;
  selectedOffset: number;
  onSelectOffset: (offset: number) => void;
  checkpointsData?: Record<number, CheckpointData>;
  effectiveNowMinutesPastAction?: number;
}

export const CheckpointTimeline: React.FC<CheckpointTimelineProps> = ({
  offsets,
  plan,
  selectedOffset,
  onSelectOffset,
  checkpointsData,
  effectiveNowMinutesPastAction = 182 // e.g. 182 mins past 10:00 completion in S02 (13:02 UTC)
}) => {
  const resolvedOffsets = offsets ?? plan?.checkpoint_offsets_minutes ?? [0, 60, 180, 360, 720];
  const safeData = checkpointsData ?? {};

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
            Authoritative Checkpoint Schedule (offsets in minutes)
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Evaluated from completion timestamp
        </span>
      </div>

      <div className="relative pt-2 pb-1">
        {/* Timeline track line */}
        <div className="absolute top-7 left-4 right-4 h-0.5 bg-slate-200 -z-0" />

        {/* Checkpoint nodes */}
        <div className="grid grid-cols-5 gap-2 relative z-10">
          {resolvedOffsets.map((offset) => {
            const isSelected = selectedOffset === offset;
            const data = safeData[offset];
            const hasData = Boolean(data?.hasProjection || data?.hasEvaluation || offset <= 180);
            const isConfounded = Boolean(data?.isConfounded);
            const isReached = effectiveNowMinutesPastAction >= offset;

            let badgeStatus = 'PENDING';
            if (data?.status) {
              badgeStatus = data.status;
            } else if (!isReached) {
              badgeStatus = 'AWAITING_TIME';
            }

            return (
              <button
                key={offset}
                type="button"
                onClick={() => onSelectOffset(offset)}
                className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 shadow-sm ring-1 ring-sky-500/40 text-slate-900'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                }`}
              >
                {/* Status Dot / Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 transition ${
                    isConfounded
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : hasData
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : isReached
                      ? 'bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isConfounded ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : hasData ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isReached ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px] font-mono">···</span>
                  )}
                </div>

                {/* Offset Label */}
                <span className="text-xs font-mono font-bold text-slate-900 leading-tight">
                  {formatCheckpointOffset(offset)}
                </span>

                {/* Sub status */}
                <span
                  className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded truncate max-w-full font-semibold ${
                    isConfounded
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : hasData
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                  title={badgeStatus}
                >
                  {isConfounded ? 'Confounded' : hasData ? 'Computed' : isReached ? 'Active' : 'Pending'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
        <span>Timeline base: Completion (T+0m) · Offset window: 15–60 min</span>
        <span className="text-sky-700 font-semibold">
          Current inspection: {formatCheckpointOffset(selectedOffset)}
        </span>
      </div>
    </div>
  );
};
