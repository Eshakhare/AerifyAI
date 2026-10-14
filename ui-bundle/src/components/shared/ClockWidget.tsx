/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Authoritative Dual Clock Widget
 * Domain Rule 7: Computes freshness and dual timestamps strictly from
 * ClockMetadata.effective_now (UTC & Asia/Kolkata).
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { ClockMetadata } from '../../contracts/types';
import { formatDualTime } from '../../ui/viewModels';

interface ClockWidgetProps {
  clock: ClockMetadata | null;
  className?: string;
  compact?: boolean;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({
  clock,
  className = '',
  compact = false
}) => {
  if (!clock) {
    return (
      <div className={`text-slate-400 text-xs flex items-center gap-1.5 ${className}`}>
        <Clock className="w-3.5 h-3.5 animate-pulse text-sky-500" />
        <span className="font-mono">Syncing server clock...</span>
      </div>
    );
  }

  const { utc, ist } = formatDualTime(clock.effective_now);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 text-xs font-mono text-slate-600 ${className}`}
        title={`Clock Mode: ${clock.clock_mode}`}
      >
        <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
        <span className="font-semibold text-slate-900">{ist}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-700/80 bg-slate-800/80 p-3 text-xs text-slate-300 shadow-2xs space-y-1.5 ${className}`}
      title={`Server Authoritative Clock (${clock.clock_mode})`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-400">
          <Clock className="w-3 h-3 text-sky-400" />
          Authoritative Clock
        </span>
        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-md bg-slate-900 text-sky-400 font-semibold border border-slate-700">
          {clock.clock_mode}
        </span>
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] pt-0.5">
        <span className="text-slate-400">IST:</span>
        <span className="font-bold text-white">{ist}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
        <span>UTC:</span>
        <span className="font-medium text-slate-300">{utc}</span>
      </div>
    </div>
  );
};
