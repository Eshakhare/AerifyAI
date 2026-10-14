/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - CoverageBadge Component
 * Non-negotiable Domain Rule 3:
 * Displays Coverage.state (current | stale | sparse | modeled_only | synthetic_only | no_data)
 * with sample and source counts.
 */

import React from 'react';
import { Database, AlertOctagon, Activity, Sparkles, AlertCircle } from 'lucide-react';
import { Coverage } from '../../contracts/types';
import { getCoverageDescription } from '../../ui/viewModels';

interface CoverageBadgeProps {
  coverage: Coverage;
  showCounts?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const CoverageBadge: React.FC<CoverageBadgeProps> = ({
  coverage,
  showCounts = true,
  size = 'md',
  className = ''
}) => {
  const getBadgeStyle = () => {
    switch (coverage.state) {
      case 'current':
        return {
          label: 'Current Coverage',
          classes: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
          icon: <Activity className="w-3 h-3" />
        };
      case 'sparse':
        return {
          label: 'Sparse Coverage',
          classes: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
          icon: <Database className="w-3 h-3" />
        };
      case 'modeled_only':
        return {
          label: 'Modeled Only',
          classes: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
          icon: <Database className="w-3 h-3" />
        };
      case 'synthetic_only':
        return {
          label: 'Synthetic Simulation',
          classes: 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60',
          icon: <Sparkles className="w-3 h-3" />
        };
      case 'stale':
        return {
          label: 'Stale (No Recent Data)',
          classes: 'bg-slate-900/90 text-amber-400 border-amber-800/60 border-dashed',
          icon: <AlertOctagon className="w-3 h-3" />
        };
      case 'no_data':
      default:
        return {
          label: 'No Recent Data',
          classes: 'bg-slate-900/90 text-slate-400 border-slate-700/80 border-dashed',
          icon: <AlertCircle className="w-3 h-3" />
        };
    }
  };

  const style = getBadgeStyle();
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <span
      role="status"
      aria-label={`Coverage: ${style.label}`}
      title={getCoverageDescription(coverage)}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border tracking-tight ${style.classes} ${textSize} ${padding} ${className}`}
    >
      {style.icon}
      <span>{style.label}</span>
      {showCounts && coverage.sample_count > 0 && (
        <span className="font-mono opacity-75 text-[10px]">
          ({coverage.sample_count}s / {coverage.source_count}src)
        </span>
      )}
    </span>
  );
};
