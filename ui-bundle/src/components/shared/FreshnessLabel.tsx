/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - FreshnessLabel Component
 * Non-negotiable Domain Rule 7:
 * All freshness / "x minutes ago" is computed from ClockMetadata.effective_now returned
 * by the server, NEVER client Date.now().
 * Shows tooltip with precise timestamps in UTC and Asia/Kolkata (IST).
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { ClockMetadata, UtcTime } from '../../contracts/types';
import { formatFreshness, formatDualTime } from '../../ui/viewModels';

interface FreshnessLabelProps {
  observationTime: UtcTime | null;
  clock: ClockMetadata;
  showIcon?: boolean;
  className?: string;
}

export const FreshnessLabel: React.FC<FreshnessLabelProps> = ({
  observationTime,
  clock,
  showIcon = true,
  className = ''
}) => {
  const freshness = formatFreshness(observationTime, clock);
  const dualTime = observationTime ? formatDualTime(observationTime) : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${
        freshness.isStale ? 'text-amber-400' : 'text-slate-300'
      } ${className}`}
      title={
        dualTime
          ? `Observed: ${dualTime.ist} (${dualTime.utc})\nEffective Server Time: ${clock.effective_now}`
          : 'No timestamp available'
      }
    >
      {showIcon && <Clock className="w-3 h-3 text-slate-500 shrink-0" />}
      <span className={freshness.isStale ? 'font-medium' : ''}>
        {freshness.label}
      </span>
      {freshness.isStale && (
        <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/60 px-1 py-0.2 rounded uppercase tracking-wider font-sans font-semibold">
          Stale
        </span>
      )}
    </span>
  );
};
