/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Server-driven Accessible Legend Component
 * Domain Rule 8:
 * Fetches Legend bands from server (legend-bands.v1.json via getLegends(metric)).
 * The UI owns ONLY the colour palette keyed by BandId/severity_rank and NEVER
 * hard-codes numeric thresholds in UI logic.
 * Renders each band's label, lower–upper bounds (upper_inclusive), unit,
 * and mandatory Legend.notice and source_citation.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React, { useEffect, useState } from 'react';
import { Info, BookOpen, AlertCircle, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../api/ApiClient';
import { Legend, Metric, BandId } from '../../contracts/types';
import { BAND_COLOR_TOKENS, formatUnit } from '../../ui/viewModels';

interface ServerLegendProps {
  apiClient: ApiClient;
  metric: Metric;
  className?: string;
  onFilterBand?: (bandId: BandId | null) => void;
  activeBandFilter?: BandId | null;
}

export const ServerLegend: React.FC<ServerLegendProps> = ({
  apiClient,
  metric,
  className = '',
  onFilterBand,
  activeBandFilter = null
}) => {
  const [legend, setLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLegend() {
      setLoading(true);
      try {
        const legends = await apiClient.getLegends(metric);
        // Find legend matching metric or fallback to first
        const matched = legends.find((l) => l.metric === metric) || legends[0] || null;
        setLegend(matched);
      } catch (err) {
        console.error('Error fetching server legend:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLegend();
  }, [apiClient, metric]);

  if (loading || !legend) {
    return (
      <div className={`p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 animate-pulse shadow-sm ${className}`}>
        Loading server-driven scale definition...
      </div>
    );
  }

  const isConcentration = legend.kind === 'concentration_band';
  const isOfficialAqi = legend.kind === 'official_aqi';

  return (
    <div
      role="region"
      aria-label={`Air Quality Scale Legend: ${legend.metric}`}
      className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs space-y-3.5 ${className}`}
    >
      {/* Legend Title & Standard Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          {isOfficialAqi ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <Info className="w-4 h-4 text-sky-600" />
          )}
          <span className="font-bold text-slate-900 tracking-tight">
            {isOfficialAqi ? 'Official CPCB NAQI Legend' : `${legend.metric} Concentration Scale`}
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
          {formatUnit(legend.unit)} · {legend.reference_averaging_window} avg
        </span>
      </div>

      {/* Bands Grid */}
      <div className="space-y-1" role="list" aria-label="Pollution Severity Categories">
        {legend.bands.map((band) => {
          const colorToken = BAND_COLOR_TOKENS[band.id];
          const isFiltered = activeBandFilter === band.id;
          const rangeLabel =
            band.upper_bound !== null
              ? `${band.lower_bound}–${band.upper_bound}`
              : `> ${band.lower_bound}`;

          return (
            <button
              key={band.id}
              role="listitem"
              onClick={() => onFilterBand?.(isFiltered ? null : band.id)}
              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left transition cursor-pointer border ${
                isFiltered
                  ? 'border-sky-400 bg-sky-50 shadow-xs ring-1 ring-sky-300'
                  : 'border-transparent hover:bg-slate-50'
              }`}
              title={`${band.label} (${rangeLabel} ${formatUnit(legend.unit)}) - Click to filter map`}
            >
              <div className="flex items-center gap-2.5">
                {/* Visual Swatch + Hex */}
                <span
                  className="w-3.5 h-3.5 rounded shrink-0 border border-black/20 shadow-xs"
                  style={{ backgroundColor: colorToken?.hex || '#94a3b8' }}
                  aria-hidden="true"
                />
                <span className="font-medium text-slate-800 text-xs">
                  {band.label}
                </span>
              </div>

              {/* Dynamic Range from Server Definition */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-600 font-semibold">{rangeLabel}</span>
                <span className="text-[10px] text-slate-400 uppercase">{formatUnit(legend.unit)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mandatory Legend Notice (Domain Rule 8) */}
      {legend.notice && (
        <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
          isConcentration
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block font-mono text-[10px] uppercase tracking-wider mb-0.5 text-slate-900">
                {isConcentration ? 'Important Category Notice:' : 'Regulatory Notice:'}
              </strong>
              <span>{legend.notice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Citation & Boundary Rule */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-slate-400" />
          <span>{legend.source_citation}</span>
        </span>
        <span title="Values equal to the upper threshold belong to that band">
          Rule: {legend.boundary_rule}
        </span>
      </div>
    </div>
  );
};
