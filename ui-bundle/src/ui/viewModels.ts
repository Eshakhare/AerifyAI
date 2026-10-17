/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - UI View Models & Presentation Helpers
 * UI-only presentation formats, badges, colour mappings, and freshness calculations.
 * Contract types are NEVER altered here; this file only formats and projects them.
 */

import {
  BandId,
  EvidenceState,
  Coverage,
  AqiDerivation,
  UtcTime,
  Metric,
  ClockMetadata
} from '../contracts/types';

export interface EvidenceBadgeSpec {
  label: string;
  badgeClass: string;
  iconName: 'check-circle' | 'radio' | 'cpu' | 'flask-conical' | 'alert-circle';
  description: string;
}

export const EVIDENCE_BADGE_SPECS: Record<EvidenceState, EvidenceBadgeSpec> = {
  DIRECTLY_OBSERVED: {
    label: 'Directly Observed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium',
    iconName: 'check-circle',
    description: 'Ground instrument physically measuring ambient air on site'
  },
  OBSERVED_NEARBY: {
    label: 'Observed Nearby',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 font-medium',
    iconName: 'radio',
    description: 'Nearby verified station or sensor mapped with proximity weights'
  },
  MODEL_ESTIMATED: {
    label: 'Model Estimated',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300 font-medium',
    iconName: 'cpu',
    description: 'Numerical weather or regional chemical transport model context'
  },
  SYNTHETIC: {
    label: 'Synthetic Demonstration',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-medium',
    iconName: 'flask-conical',
    description: 'Generated counterfactual simulation data for training & validation'
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    iconName: 'alert-circle',
    description: 'Data sufficiency requirements not met; value suppressed'
  }
};

export interface BandColorToken {
  id: BandId;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  hex: string;
}

export const BAND_COLOR_TOKENS: Record<BandId, BandColorToken> = {
  GOOD: {
    id: 'GOOD',
    label: 'Good',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800 font-semibold',
    borderClass: 'border-emerald-300',
    hex: '#10b981'
  },
  SATISFACTORY: {
    id: 'SATISFACTORY',
    label: 'Satisfactory',
    bgClass: 'bg-lime-50',
    textClass: 'text-lime-800 font-semibold',
    borderClass: 'border-lime-300',
    hex: '#84cc16'
  },
  MODERATE: {
    id: 'MODERATE',
    label: 'Moderate',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-900 font-semibold',
    borderClass: 'border-amber-300',
    hex: '#f59e0b'
  },
  POOR: {
    id: 'POOR',
    label: 'Poor',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-900 font-semibold',
    borderClass: 'border-orange-300',
    hex: '#f97316'
  },
  VERY_POOR: {
    id: 'VERY_POOR',
    label: 'Very Poor',
    bgClass: 'bg-red-50',
    textClass: 'text-red-900 font-semibold',
    borderClass: 'border-red-300',
    hex: '#ef4444'
  },
  SEVERE: {
    id: 'SEVERE',
    label: 'Severe',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-950 font-bold',
    borderClass: 'border-rose-400',
    hex: '#7f1d1d'
  }
};

/**
 * Format unit according to standard scientific notation
 */
export function formatUnit(unit: string): string {
  switch (unit) {
    case 'ug/m3':
      return 'µg/m³';
    case 'mol/m2':
      return 'mol/m²';
    case 'degC':
      return '°C';
    case 'index':
      return 'NAQI Index';
    case 'mm/h':
      return 'mm/h';
    case 'm/s':
      return 'm/s';
    default:
      return unit;
  }
}

/**
 * Derives user-facing AQI label strictly following domain rules
 */
export function getAqiLabel(derivation?: AqiDerivation | null): string {
  if (!derivation) return 'Air Quality Indicator';
  switch (derivation.kind) {
    case 'regulatory_cpcb_aqi':
      return 'Official CPCB AQI';
    case 'estimated_local_aqi':
      return 'Estimated Local AQI';
    case 'pm_based_air_quality_indicator':
      return 'PM-based Air Quality Indicator';
    case 'pollutant_subindex':
      return `${derivation.primary_pollutant || 'Pollutant'} sub-index`;
    default:
      return 'Air Quality Indicator';
  }
}

/**
 * Computes freshness string relative to server's effective_now, NEVER client Date.now()
 */
export function formatFreshness(
  observationTime: UtcTime | null,
  clock: ClockMetadata
): { label: string; isStale: boolean; minutesDiff: number } {
  if (!observationTime) {
    return { label: 'No recent data', isStale: true, minutesDiff: Infinity };
  }

  const effectiveMs = new Date(clock.effective_now).getTime();
  const obsMs = new Date(observationTime).getTime();
  const diffMinutes = Math.max(0, Math.floor((effectiveMs - obsMs) / (1000 * 60)));

  if (diffMinutes < 1) {
    return { label: 'Just now', isStale: false, minutesDiff: 0 };
  } else if (diffMinutes < 60) {
    return { label: `${diffMinutes}m ago`, isStale: diffMinutes > 45, minutesDiff: diffMinutes };
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return { label: `${hours}h ago`, isStale: true, minutesDiff: diffMinutes };
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return { label: `${days}d ago`, isStale: true, minutesDiff: diffMinutes };
  }
}

/**
 * Format timestamp in both UTC and Asia/Kolkata (IST)
 */
export function formatDualTime(timeStr: UtcTime): { utc: string; ist: string } {
  const d = new Date(timeStr);
  const utc = d.toISOString().replace('.000Z', ' UTC').replace('T', ' ');
  const ist = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d) + ' IST';
  return { utc, ist };
}

/**
 * Coverage display description
 */
export function getCoverageDescription(coverage: Coverage): string {
  switch (coverage.state) {
    case 'current':
      return `Current (${coverage.sample_count} samples from ${coverage.source_count} sources)`;
    case 'sparse':
      return `Sparse coverage (${coverage.sample_count} samples)`;
    case 'stale':
      return 'Stale (no recent observations)';
    case 'modeled_only':
      return 'Numerical model grid context only';
    case 'synthetic_only':
      return 'Synthetic scenario projection only';
    case 'no_data':
    default:
      return 'No recent data';
  }
}

/**
 * Format checkpoint offset in minutes to human label
 */
export function formatCheckpointOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'Completion (T+0m)';
  if (offsetMinutes < 60) return `+${offsetMinutes}m`;
  const hours = offsetMinutes / 60;
  return `+${hours}h (${offsetMinutes}m)`;
}

export interface CheckpointTimelineItem {
  offsetMinutes: number;
  label: string;
  hasProjection: boolean;
  hasEvaluation: boolean;
  status: string;
  isConfounded: boolean;
  isImprovement: boolean;
  isEffectivePast: boolean;
}

/**
 * UI-only revision view model for audit trail inspector
 */
export interface UiInterventionRevision {
  revision_id: string;
  intervention_id: string;
  revision_number: number;
  changed_at: UtcTime;
  changed_by: string;
  reason: string;
  is_superseded: boolean;
}

export type ScenarioGroupKey = 'ALL' | 'SUSTAINED' | 'TEMPORARY' | 'NO_RESPONSE' | 'CONFOUNDED';

export interface ScenarioGroupMeta {
  key: ScenarioGroupKey;
  label: string;
  description: string;
  caseIds: string[];
  color: string;
}

export const SCENARIO_GROUPS: ScenarioGroupMeta[] = [
  {
    key: 'ALL',
    label: 'All Scenarios',
    description: 'All 12 Delhi NCT catalog simulation cases (S01–S12)',
    caseIds: ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12'],
    color: 'slate'
  },
  {
    key: 'SUSTAINED',
    label: 'Sustained Response',
    description: 'Longer-term concentration suppression maintaining measurable differential across checkpoints',
    caseIds: ['S01', 'S02', 'S03'],
    color: 'emerald'
  },
  {
    key: 'TEMPORARY',
    label: 'Temporary Response',
    description: 'Short-duration dust suppression with rapid decay or low dosage sub-threshold effect',
    caseIds: ['S04', 'S05', 'S06'],
    color: 'sky'
  },
  {
    key: 'NO_RESPONSE',
    label: 'No Measurable Response',
    description: 'Targeted mist cannon or unpaved continuous suppression with minimal detectable impact',
    caseIds: ['S07', 'S08', 'S09'],
    color: 'amber'
  },
  {
    key: 'CONFOUNDED',
    label: 'Confounded / Inconclusive',
    description: 'Precipitation, wind shift rotation, or overlapping secondary municipal actions invalidating comparison',
    caseIds: ['S10', 'S11', 'S12'],
    color: 'rose'
  }
];

/**
 * Determine which high-level category a case ID belongs to
 */
export function getScenarioGroupKey(caseId: string): ScenarioGroupKey {
  if (['S01', 'S02', 'S03'].includes(caseId)) return 'SUSTAINED';
  if (['S04', 'S05', 'S06'].includes(caseId)) return 'TEMPORARY';
  if (['S07', 'S08', 'S09'].includes(caseId)) return 'NO_RESPONSE';
  if (['S10', 'S11', 'S12'].includes(caseId)) return 'CONFOUNDED';
  return 'ALL';
}

/**
 * Classify route version ID as SYNTHETIC_CORRIDOR vs OBSERVED_TRACE
 */
export function classifyRouteVersion(routeVersionId: string): {
  type: 'SYNTHETIC_CORRIDOR' | 'OBSERVED_TRACE';
  label: string;
  color: string;
} {
  if (routeVersionId.toLowerCase().includes('observed') || routeVersionId.toLowerCase().includes('trace')) {
    return {
      type: 'OBSERVED_TRACE',
      label: 'Observed GPS Sensor Trace',
      color: 'emerald'
    };
  }
  return {
    type: 'SYNTHETIC_CORRIDOR',
    label: 'Synthetic Corridor Geometry',
    color: 'purple'
  };
}

