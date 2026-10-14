/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Supervisor Correction & Audit Trail Banner
 * Displays existing correction notices, allows SUPERVISOR to submit new immutable corrections,
 * and maintains an inspectable revision history without altering contract schema 0.9.
 */

import React, { useState } from 'react';
import { ShieldAlert, Send, History, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { ClockMetadata, SessionInfo, InterventionRevision } from '../../contracts/types';
import { CapabilityGuard } from '../shared/CapabilityGuard';
import { UiInterventionRevision } from '../../ui/viewModels';

interface SupervisorCorrectionBannerProps {
  interventionId: string;
  currentRevision: number;
  correctionNotice: string | null;
  revisions: UiInterventionRevision[];
  session: SessionInfo;
  clock: ClockMetadata;
  onSubmitCorrection: (notice: string) => Promise<void>;
}

export const SupervisorCorrectionBanner: React.FC<SupervisorCorrectionBannerProps> = ({
  interventionId,
  currentRevision,
  correctionNotice,
  revisions,
  session,
  clock,
  onSubmitCorrection
}) => {
  const [newNoticeInput, setNewNoticeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const handleSubmit = async () => {
    if (!newNoticeInput.trim() || submitting) return;
    try {
      setSubmitting(true);
      await onSubmitCorrection(newNoticeInput.trim());
      setNewNoticeInput('');
    } catch (err) {
      console.error('Failed to submit correction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Banner Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Supervisor Audit Register & Formal Correction Notices
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
            Active Revision: Rev {currentRevision}
          </span>
          <button
            type="button"
            onClick={() => setExpandedHistory(!expandedHistory)}
            className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 cursor-pointer"
          >
            <History className="w-3 h-3 text-cyan-400" />
            <span>{expandedHistory ? 'Hide History' : `History (${revisions.length})`}</span>
          </button>
        </div>
      </div>

      {/* Active Correction Notice State */}
      {correctionNotice ? (
        <div className="bg-amber-950/30 border border-amber-700/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-300 font-bold uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Official Supervisor Correction Notice in Effect</span>
            </span>
            <span className="text-amber-400/80 text-[11px]">
              Authoritative Municipal Record
            </span>
          </div>
          <p className="text-xs text-amber-100 font-mono leading-relaxed bg-amber-950/60 p-3 rounded-lg border border-amber-800/60">
            &ldquo;{correctionNotice}&rdquo;
          </p>
          <div className="text-[10px] font-mono text-amber-400/70 pt-1">
            Note: This correction notice supersedes baseline evaluation assumptions for Intervention <strong className="text-white">{interventionId}</strong>.
          </div>
        </div>
      ) : (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>No administrative corrections logged against Revision {currentRevision}. Original protocol stands.</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Unadjusted</span>
        </div>
      )}

      {/* Inspectable Revision History Drawer */}
      {expandedHistory && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <span className="text-xs font-bold text-white uppercase tracking-wider block">
            Immutable Audit Trail of Revisions (GAP-01 Inspector)
          </span>
          <div className="space-y-2">
            {revisions.map((rev) => (
              <div
                key={rev.revision_id}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                  rev.revision_number === currentRevision
                    ? 'bg-cyan-950/40 border-cyan-700/80'
                    : 'bg-slate-900/60 border-slate-800 opacity-75'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Revision {rev.revision_number}</span>
                    <span className="text-[10px] text-slate-400">({rev.revision_id})</span>
                    {rev.revision_number === currentRevision ? (
                      <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-bold uppercase">
                        Current Active
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded uppercase">
                        Superseded
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">{rev.reason}</p>
                </div>

                <div className="text-right text-[10px] text-slate-500 shrink-0">
                  <div>By: {rev.changed_by}</div>
                  <div>{new Date(rev.changed_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supervisor Correction Submission Form */}
      <div className="pt-2 border-t border-slate-800">
        <CapabilityGuard
          requiredCapability="SUBMIT_CORRECTION"
          session={session}
          actionName="Formal Supervisor Correction"
        >
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span>Submit Formal Correction (Supervisor Only)</span>
              <span className="text-[10px] text-amber-400 uppercase">Reason strictly required</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newNoticeInput}
                onChange={(e) => setNewNoticeInput(e.target.value)}
                placeholder="e.g. Auxiliary road sweeping vehicle pass overlapped on segment 041 at 10:15 UTC; exclude 3 bins."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!newNoticeInput.trim() || submitting}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Log Correction'}</span>
              </button>
            </div>
          </div>
        </CapabilityGuard>
      </div>
    </div>
  );
};
