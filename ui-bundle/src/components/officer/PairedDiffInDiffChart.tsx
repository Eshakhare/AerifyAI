/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Paired Action vs Reference Diff-in-Diff Chart
 * Renders Recharts paired visualization using contract fields:
 * action_pre_ug_m3, action_post_ug_m3, reference_pre_ug_m3, reference_post_ug_m3,
 * effect_ug_m3, effect_interval (low/high/level/method).
 * PM2.5 and PM10 displayed separately. Frontend NEVER calculates the effect.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingDown, TrendingUp, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import {
  EffectInterval,
  Metric,
  ScenarioProjection,
  ObservedEvaluation
} from '../../contracts/types';
import { formatUnit } from '../../ui/viewModels';

export interface DiffInDiffDataPoint {
  id: string;
  metric: Metric;
  checkpoint_offset_minutes: number;
  status: string;
  action_pre_ug_m3: number | null;
  action_post_ug_m3: number | null;
  reference_pre_ug_m3: number | null;
  reference_post_ug_m3: number | null;
  effect_ug_m3: number | null;
  effect_interval: EffectInterval | null;
  method_version: string;
}

export interface PairedDiffInDiffChartProps {
  dataPoints?: DiffInDiffDataPoint[];
  projection?: ScenarioProjection | null;
  evaluation?: ObservedEvaluation | null;
  selectedOffsetMinutes?: number;
  title?: string;
  isObserved?: boolean;
}

export const PairedDiffInDiffChart: React.FC<PairedDiffInDiffChartProps> = ({
  dataPoints,
  projection,
  evaluation,
  selectedOffsetMinutes,
  title = 'Paired Pre/Post Concentration Comparison (Action vs Reference)',
  isObserved = false
}) => {
  // Normalize into DiffInDiffDataPoint list
  const resolvedPoints: DiffInDiffDataPoint[] = [];

  if (dataPoints && dataPoints.length > 0) {
    resolvedPoints.push(...dataPoints);
  } else if (projection) {
    resolvedPoints.push({
      id: projection.id,
      metric: projection.metric,
      checkpoint_offset_minutes: projection.checkpoint_offset_minutes,
      status: projection.status,
      action_pre_ug_m3: projection.action_pre_ug_m3,
      action_post_ug_m3: projection.action_post_ug_m3,
      reference_pre_ug_m3: projection.reference_pre_ug_m3,
      reference_post_ug_m3: projection.reference_post_ug_m3,
      effect_ug_m3: projection.effect_ug_m3,
      effect_interval: projection.effect_interval,
      method_version: projection.method_version
    });
  } else if (evaluation) {
    resolvedPoints.push({
      id: evaluation.id,
      metric: evaluation.metric,
      checkpoint_offset_minutes: evaluation.checkpoint_offset_minutes,
      status: evaluation.status,
      action_pre_ug_m3: evaluation.action_pre_ug_m3,
      action_post_ug_m3: evaluation.action_post_ug_m3,
      reference_pre_ug_m3: evaluation.reference_pre_ug_m3,
      reference_post_ug_m3: evaluation.reference_post_ug_m3,
      effect_ug_m3: evaluation.effect_ug_m3,
      effect_interval: evaluation.effect_interval,
      method_version: evaluation.method_version
    });
  }

  // Metric toggle between PM2.5 and PM10
  const availableMetrics = Array.from(new Set(resolvedPoints.map((d) => d.metric)));
  const defaultMetric = availableMetrics.includes('PM2_5_MASS')
    ? 'PM2_5_MASS'
    : availableMetrics[0] || 'PM10_MASS';
  const [selectedMetric, setSelectedMetric] = useState<Metric>(defaultMetric);

  const activePoint = resolvedPoints.find((d) => d.metric === selectedMetric) || resolvedPoints[0];

  if (!activePoint) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-mono shadow-xs">
        No comparative data available for this checkpoint.
      </div>
    );
  }

  // Bar chart dataset format
  const chartData = [
    {
      stage: 'Pre-Action Window',
      'Action Zone': activePoint.action_pre_ug_m3,
      'Reference Zone': activePoint.reference_pre_ug_m3
    },
    {
      stage: `Post-Action Window (+${activePoint.checkpoint_offset_minutes}m)`,
      'Action Zone': activePoint.action_post_ug_m3,
      'Reference Zone': activePoint.reference_post_ug_m3
    }
  ];

  const metricLabel = activePoint.metric === 'PM2_5_MASS' ? 'PM2.5 Concentration' : 'PM10 Concentration';

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
      {/* Header with Metric Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <span>{title}</span>
          </h4>
          <span className="text-[11px] font-mono text-slate-500">
            Method: {activePoint.method_version} · Offset: +{activePoint.checkpoint_offset_minutes} min
          </span>
        </div>

        {/* PM2.5 vs PM10 Tabs */}
        {availableMetrics.length > 1 && (
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            {availableMetrics.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-3 py-1 rounded-lg font-mono transition cursor-pointer ${
                  selectedMetric === m
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'PM2_5_MASS' ? 'PM2.5' : 'PM10'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recharts Bar Comparison */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="25%"
            barGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="stage"
              stroke="#64748b"
              tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace' }}
              unit=" µg/m³"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: '0.75rem',
                color: '#0f172a',
                fontSize: '12px',
                fontFamily: 'monospace',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(val: any) => [`${val} µg/m³`, '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}
            />
            {/* Action Zone: Solid Sky */}
            <Bar dataKey="Action Zone" fill="#0284c7" radius={[6, 6, 0, 0]} />
            {/* Reference Zone: Slate */}
            <Bar dataKey="Reference Zone" fill="#94a3b8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estimated Treatment Effect & Confidence Interval Row */}
      {activePoint.effect_ug_m3 !== null && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                activePoint.effect_ug_m3 < 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activePoint.effect_ug_m3 < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">
                Estimated Treatment Effect (DiD)
              </span>
              <span className="text-base font-bold text-slate-900">
                {activePoint.effect_ug_m3 > 0 ? `+${activePoint.effect_ug_m3}` : activePoint.effect_ug_m3} µg/m³
              </span>
            </div>
          </div>

          {/* Confidence Interval (Domain Rule: Never compute in UI, display server-provided interval) */}
          {activePoint.effect_interval && (
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block">
                {Math.round(activePoint.effect_interval.level * 100)}% Confidence Interval
              </span>
              <span className="text-xs font-semibold text-slate-800">
                [{activePoint.effect_interval.low} to {activePoint.effect_interval.high}] µg/m³
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Method: {activePoint.effect_interval.method}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Domain Rule 4 Notice */}
      <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
        {isObserved
          ? 'Observed improvement association relative to reference zone. Non-causal association.'
          : 'Synthetic demonstration scenario. Counterfactual model output.'}
      </div>
    </div>
  );
};
