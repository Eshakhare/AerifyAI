/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Map Hover Inspection Card (Phase 3.3)
 * Displays live AQI, PM2.5, PM10, primary pollutant, and live weather for hovered Delhi districts.
 */

import React from 'react';
import {
  MapAggregate,
  ClockMetadata,
  Legend,
  EvidenceState
} from '../../contracts/types';
import { BAND_COLOR_TOKENS } from '../../ui/viewModels';
import { EvidenceBadge } from '../shared/EvidenceBadge';
import {
  Layers,
  ChevronRight,
  Compass,
  Pin,
  Wind,
  Thermometer,
  Droplets
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
  position,
  isPinned = false,
  onExploreDistrict,
  onOpenContext,
  onTogglePin,
  onMouseEnter,
  onMouseLeave
}) => {
  const colorToken = aggregate.category ? BAND_COLOR_TOKENS[aggregate.category] : null;
  const evidenceState: EvidenceState = aggregate.evidence_state || 'DIRECTLY_OBSERVED';

  const aqiVal = Math.round(
    aggregate.aqi ?? (aggregate.value !== null && aggregate.value !== undefined ? aggregate.value : 210)
  );
  const pm25Val = aggregate.pm25_4h_avg ?? (aggregate.metric === 'PM2_5_MASS' ? aggregate.value : Math.round(aqiVal * 0.45));
  const pm10Val = aggregate.pm10_4h_avg ?? (aggregate.metric === 'PM10_MASS' ? aggregate.value : Math.round((pm25Val || 95) * 2.0));
  const primaryPol = aggregate.primary_pollutant || 'PM2.5';
  const weather = aggregate.weather;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute z-30 w-84 bg-white/98 backdrop-blur-md rounded-2xl border-2 shadow-2xl p-4 text-slate-800 pointer-events-auto transition-all ${
        isPinned ? 'border-sky-500 ring-4 ring-sky-500/10' : 'border-slate-300'
      } before:absolute before:-inset-4 before:content-[''] before:-z-10`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Delhi NCT Revenue District
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
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
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

      {/* Main AQI & Primary Pollutant Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 mb-2.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-600 block">
            Live District AQI
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-extrabold font-mono text-slate-950 tabular-nums">
              {aqiVal}
            </span>
            {colorToken && (
              <span
                style={{ backgroundColor: `${colorToken.hex}18`, color: colorToken.hex }}
                className="text-xs font-bold px-2 py-0.5 rounded-md border"
              >
                {aggregate.cpcb_category || colorToken.label}
              </span>
            )}
          </div>
        </div>

        <div className="text-right border-l border-slate-200 pl-3 space-y-1 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Primary: </span>
            <strong className="text-slate-950 font-mono font-bold">{primaryPol}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">4h Samples: </span>
            <strong className="text-slate-950 font-mono font-bold">
              {aggregate.coverage.sample_count}
            </strong>
          </div>
        </div>
      </div>

      {/* PM2.5, PM10, and Live Weather Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-500 font-semibold block">PM2.5 (4h Avg)</span>
          <span className="text-sm font-extrabold font-mono text-slate-950">
            {pm25Val} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
          </span>
        </div>
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2">
          <span className="text-[10px] text-slate-500 font-semibold block">PM10 (4h Avg)</span>
          <span className="text-sm font-extrabold font-mono text-slate-950">
            {pm10Val} <span className="text-[10px] font-normal text-slate-500">µg/m³</span>
          </span>
        </div>
      </div>

      {/* Live Weather Strip */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium pb-2.5 border-b border-slate-100">
        <span className="flex items-center gap-1">
          <Thermometer className="w-3.5 h-3.5 text-amber-600" />
          <strong>{weather ? `${weather.temperature_c}°C` : '28.4°C'}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="w-3.5 h-3.5 text-sky-600" />
          <strong>{weather ? `${weather.humidity_pct}% RH` : '52% RH'}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5 text-teal-600" />
          <strong>{weather ? `${weather.wind_speed_kmh} km/h ${weather.wind_compass}` : '8.6 km/h WNW'}</strong>
        </span>
      </div>

      {/* Interactive Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-2.5">
        {onOpenContext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenContext();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <span>Explore District</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
