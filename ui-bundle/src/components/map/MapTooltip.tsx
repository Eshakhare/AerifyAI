/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Map Tooltip Component
 * Displays rich interactive inspection card for hovered Delhi districts.
 * Non-negotiable Domain Rules:
 * - Direct vs estimated wording
 * - Pinned on hover with interactive action buttons ("Show Air Report", "Explore District")
 */

import React from 'react';
import {
  MapAggregate,
  ClockMetadata,
  Legend,
  EvidenceState
} from '../../contracts/types';
import { formatFreshness, BAND_COLOR_TOKENS } from '../../ui/viewModels';
import { EvidenceBadge } from '../shared/EvidenceBadge';
import {
  Clock,
  Layers,
  ChevronRight,
  Compass,
  Pin,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface MapTooltipProps {
  aggregate: MapAggregate;
  featureName: string;
  clock: ClockMetadata | null;
  activeLegend: Legend | null;
  position: { x: number; y: number };
  isPinned?: boolean;
  onExploreDistrict?: () => void;
  onOpenContext?: () => void;
  onTogglePin?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const MapTooltip: React.FC<MapTooltipProps> = ({
  aggregate,
  featureName,
  clock,
  activeLegend,
  position,
  isPinned = false,
  onExploreDistrict,
  onOpenContext,
  onTogglePin,
  onMouseEnter,
  onMouseLeave
}) => {
  const colorToken = aggregate.category ? BAND_COLOR_TOKENS[aggregate.category] : null;

  const freshnessResult =
    clock && aggregate.coverage.last_observation_at
      ? formatFreshness(aggregate.coverage.last_observation_at, clock)
      : null;
  const freshness = freshnessResult ? freshnessResult.label : 'Recent';

  // Overall primary evidence state
  const evidenceState: EvidenceState = aggregate.evidence_state || 'MODEL_ESTIMATED';

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute z-30 w-80 bg-white/98 backdrop-blur-md rounded-2xl border-2 shadow-2xl p-4.5 text-slate-800 pointer-events-auto transition-all ${
        isPinned ? 'border-sky-500 ring-4 ring-sky-500/10' : 'border-slate-300'
      } before:absolute before:-inset-4 before:content-[''] before:-z-10`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Delhi NCT District
          </div>
          <h4 className="text-base font-extrabold text-slate-950 tracking-tight leading-snug">
            {featureName}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <EvidenceBadge state={evidenceState} size="sm" />
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              title={isPinned ? 'Unpin card' : 'Pin card'}
              className={`p-1.5 rounded-lg border transition-colors ${
                isPinned
                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Metric Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 mb-3 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">
            {aggregate.metric === 'AQI' ? 'Official Station AQI' : 'Observed Concentration'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-950 tabular-nums">
              {aggregate.value !== null && aggregate.value !== undefined ? Math.round(aggregate.value) : '--'}
            </span>
            {colorToken && (
              <span
                style={{ backgroundColor: `${colorToken.hex}18`, color: colorToken.hex }}
                className="text-xs font-bold px-2 py-0.5 rounded-md border"
              >
                {colorToken.label}
              </span>
            )}
          </div>
        </div>

        {/* Secondary Unit & Metric */}
        <div className="text-right border-l border-slate-200 pl-3 space-y-1">
          <div className="text-xs">
            <span className="text-slate-500 font-medium">Metric: </span>
            <strong className="text-slate-900 font-mono font-bold">
              {aggregate.metric}
            </strong>
          </div>
          <div className="text-xs">
            <span className="text-slate-500 font-medium">Unit: </span>
            <strong className="text-slate-900 font-mono font-bold">
              {aggregate.unit === 'ug/m3' ? 'µg/m³' : aggregate.unit}
            </strong>
          </div>
        </div>
      </div>

      {/* Freshness & Coverage Metadata */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium pb-3 border-b border-slate-100">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Observed: </span>
          <strong className="text-slate-800">{freshness}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Samples: </span>
          <strong className="text-slate-800 font-mono">
            {aggregate.coverage.sample_count}
          </strong>
        </span>
      </div>

      {/* Interactive Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
        {onOpenContext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenContext();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors focus:ring-2 focus:ring-sky-500"
          >
            <Compass className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Air Report</span>
          </button>
        )}

        {onExploreDistrict && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExploreDistrict();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-sky-500"
          >
            <span>Explore</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
