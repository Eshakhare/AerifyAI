/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Government Actions & Verified Impact Registry (Tab 1: All Actions)
 * Displays unified cards combining directive announcements + before/after AQI drop in the same card,
 * with active emergency measures on top.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Car,
  Building2,
  Droplets,
  Clock,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  Flame,
  Radio
} from 'lucide-react';
import { ClockMetadata } from '../../contracts/types';

export type ActionFilterCategory = 'ALL' | 'EMERGENCY_DIRECTIVES' | 'VERIFIED_IMPACT' | 'MIST_SUPPRESSION' | 'ROAD_SWEEPING';

export interface GovtActionItem {
  id: string;
  title: string;
  isEmergencyDirective: boolean;
  category: 'GOVERNMENT_DIRECTIVE' | 'FIELD_OPERATION';
  interventionType: 'VEHICLE_RESTRICTION' | 'CIVIC_INFRASTRUCTURE' | 'WATER_SUPPRESSION' | 'ROAD_SWEEPING' | 'EMISSION_ENFORCEMENT';
  status: 'POLICY_ACTIVE' | 'CIVIC_INFRASTRUCTURE' | 'VERIFIED_IMPACT' | 'CONFOUNDED' | 'UNMEASURED';
  badgeLabel: string;
  badgeVariant: 'emerald' | 'amber' | 'slate' | 'sky' | 'purple' | 'rose';
  dateTimeLabel: string;
  locationCorridor: string;
  actionDetails: string;
  equipmentSummary: string;
  preAqi: number;
  postAqi: number | null;
  metricLabel: string;
  preConcentration?: number;
  postConcentration?: number | null;
  deltaLabel: string;
  pctReduction?: string;
  unit: string;
  directiveHighlight?: string;
  stableExplanation?: string;
  isDetailedAuditAvailable?: boolean;
}

interface GovernmentActionsRegistryProps {
  clock: ClockMetadata;
  onInspectInterventionAudit?: (actionId: string) => void;
}

export const GovernmentActionsRegistry: React.FC<GovernmentActionsRegistryProps> = ({
  clock,
  onInspectInterventionAudit
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ActionFilterCategory>('ALL');
  const [expandedActionId, setExpandedActionId] = useState<string | null>('govt_act_001');

  // Today's Odd-Even rule computation
  const effectiveDate = new Date(clock.effective_now);
  const dayOfMonth = effectiveDate.getUTCDate();
  const isEvenDay = dayOfMonth % 2 === 0;

  const actionsList: GovtActionItem[] = [
    // --- PINNED ACTIVE EMERGENCY MEASURES ON TOP ---
    {
      id: 'govt_act_001',
      title: 'Delhi Odd-Even Vehicle Rationing Scheme (Phase IV)',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'VEHICLE_RESTRICTION',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Active Civic Directive',
      badgeVariant: 'rose',
      dateTimeLabel: 'Enforced Oct 14 – Oct 24, 2026 · 08:00 – 20:00 IST Daily',
      locationCorridor: 'All 11 Delhi NCT Districts (Territory-wide)',
      actionDetails: 'Mandatory four-wheeler rationing by vehicle registration plate last digit. 124 border checkpoints and 400+ flying enforcement teams deployed with ANPR camera verification.',
      equipmentSummary: 'Delhi Traffic Police & Transport Dept squads · 124 Interceptor vans',
      preAqi: 378,
      postAqi: 326,
      metricLabel: 'City-wide Average AQI',
      deltaLabel: '-52 AQI Points',
      pctReduction: '-13.8%',
      unit: 'AQI',
      directiveHighlight: `TODAY'S ENFORCEMENT: ${isEvenDay ? 'EVEN DIGIT DAY (Plates ending in 0, 2, 4, 6, 8 permitted)' : 'ODD DIGIT DAY (Plates ending in 1, 3, 5, 7, 9 permitted)'}. Violations attract ₹20,000 fine under Motor Vehicles Act. Exempt: EVs, certified CNG commercial, emergency services, women-only drivers.`,
      stableExplanation: 'City-wide traffic volume dropped by 31%, resulting in a verified 13.8% reduction in street-level nitrogen oxides and fine particulates.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_002',
      title: 'GRAP Stage-IV Commercial Diesel Truck Entry Ban',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'VEHICLE_RESTRICTION',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Active Civic Directive',
      badgeVariant: 'rose',
      dateTimeLabel: 'Continuous 24x7 Enforcement · Effective 12 Oct 2026',
      locationCorridor: 'Delhi Border Checkposts (Singhu, Tikri, Badarpur, Ghazipur, Kapashera)',
      actionDetails: 'Immediate ban on entry of non-BS6 medium and heavy diesel goods vehicles into Delhi territory. Only trucks carrying essential commodities or running on LNG/CNG/EV permitted.',
      equipmentSummary: 'RFID automatic toll barriers, MCD diversion corridors via EPE/WPE bypass expressways',
      preAqi: 412,
      postAqi: 358,
      metricLabel: 'Nighttime Border AQI',
      deltaLabel: '-54 AQI Points',
      pctReduction: '-18.5%',
      unit: 'AQI',
      directiveHighlight: 'Heavy interstate freight diverted away from Delhi urban core via Eastern and Western Peripheral Expressways.',
      stableExplanation: 'Nighttime roadside PM2.5 spikes along GT Karnal Road and Mathura Road corridor dropped by 18.5% compared to the prior week baseline.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_003',
      title: '24x7 Delhi Green War Room & AI Environmental Command Center',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'CIVIC_INFRASTRUCTURE',
      status: 'CIVIC_INFRASTRUCTURE',
      badgeLabel: 'Operational Command Hub',
      badgeVariant: 'purple',
      dateTimeLabel: 'Commissioned 05 Oct 2026 · Delhi Secretariat, ITO',
      locationCorridor: 'Delhi Environment Department & DPCC Central Headquarters',
      actionDetails: 'Central command and triage hub integrating live telemetry from 40 official monitoring stations, 52 DTC mobile bus sensor units, and 13 live drone feeds over critical pollution hotspots.',
      equipmentSummary: 'Central AI telemetry dashboard, automated MCD water tanker dispatch, Green Delhi app triage',
      preAqi: 395,
      postAqi: 338,
      metricLabel: 'Hotspot Triage Time',
      deltaLabel: 'Response: 4.2h → 48m',
      pctReduction: '-81%',
      unit: 'min',
      directiveHighlight: 'Automated dispatch triggers within 30 minutes of any sensor detecting persistent PM10 > 250 µg/m³ or PM2.5 > 150 µg/m³.',
      stableExplanation: 'Drastically accelerated municipal field response across Anand Vihar, Jahangirpuri, and Wazirpur industrial clusters.',
      isDetailedAuditAvailable: false
    },

    // --- FIELD ACTIONS & LOCAL INTERVENTIONS ---
    {
      id: 'govt_act_004',
      title: 'Targeted Mist Cannon Water Suppression — Anand Vihar ISBT',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: '08 Oct 2026 · 09:15 – 09:45 IST',
      locationCorridor: 'Anand Vihar ISBT Arterial Loop (Corridor #014), East Delhi',
      actionDetails: 'Continuous high-pressure fine droplet mist spray deployed across the interstate bus terminal ingress and Ring Road intersection to suppress road re-suspension.',
      equipmentSummary: '2x MCD Heavy Mist Cannons · 12,000L treated STP recycled water · 1.2 km corridor coverage',
      preAqi: 242,
      postAqi: 198,
      metricLabel: 'PM10 Particulate Mass',
      preConcentration: 181.5,
      postConcentration: 154.2,
      deltaLabel: '-44 AQI Points (-24.4 µg/m³ PM10)',
      pctReduction: '-18.2%',
      unit: 'µg/m³',
      stableExplanation: 'Evaluated against contemporaneous Rohini reference corridor with calm baseline winds. Net particulate reduction statistically verified.',
      isDetailedAuditAvailable: true
    },
    {
      id: 'govt_act_005',
      title: 'Anti-Smog Mobile Cannon — Palam–Dwarka Expressway',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: '09 Oct 2026 · 07:00 – 07:45 IST',
      locationCorridor: 'Palam–Dwarka Sector 9–10 Elevated Corridor, South-West Delhi',
      actionDetails: 'Mobile mist cannon dispatched to curb early-morning traffic-induced particulate peaks ahead of school bus and office transit rush.',
      equipmentSummary: '1x MCD Vehicle-Mounted Anti-Smog Gun · 8,000L capacity · 2.4 km road stretch',
      preAqi: 285,
      postAqi: 240,
      metricLabel: 'PM2.5 Particulate Mass',
      preConcentration: 142.0,
      postConcentration: 118.5,
      deltaLabel: '-45 AQI Points (-23.5 µg/m³ PM2.5)',
      pctReduction: '-15.8%',
      unit: 'µg/m³',
      stableExplanation: 'Continuous mobile gun operation curbed particulate peak during early morning hours before commuter influx.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_006',
      title: 'Anti-Smog Gun Dust Settling — Jahangirpuri Flyover',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: '11 Oct 2026 · 08:30 – 09:15 IST',
      locationCorridor: 'Jahangirpuri Flyover Ingress & Outer Ring Road, North Delhi',
      actionDetails: 'High-reach mist cannon focused on flyover approach ramps to suppress suspended silt generated by heavy freight vehicles.',
      equipmentSummary: '1x High-Reach Anti-Smog Cannon · 10,000L treated water',
      preAqi: 330,
      postAqi: 285,
      metricLabel: 'PM10 Mass',
      deltaLabel: '-45 AQI Points',
      pctReduction: '-13.6%',
      unit: 'AQI',
      stableExplanation: 'Fine droplet mist formed effective dust containment barrier along elevated ramps.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_007',
      title: 'Biochemical Dust Suppressant Spraying — Okhla Phase-II',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: '11 Oct 2026 · 10:00 – 11:00 IST',
      locationCorridor: 'Okhla Phase-II Industrial Arterials, South-East Delhi',
      actionDetails: 'Application of eco-friendly biochemical dust suppressant liquid over unpaved road shoulders and transit loops.',
      equipmentSummary: '1x MCD Chemical Suppressant Tanker · 1.8 km road treatment',
      preAqi: 315,
      postAqi: 270,
      metricLabel: 'Road Dust Resuspension',
      deltaLabel: '-45 AQI Points',
      pctReduction: '-14.3%',
      unit: 'AQI',
      stableExplanation: 'Polymer binder formed resilient crust suppressing truck-induced silt resuspension for over 6 hours.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_008',
      title: 'Night Vacuum Sweeping — Connaught Place Outer Ring',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: '10 Oct 2026 · 02:00 – 04:30 IST',
      locationCorridor: 'Connaught Place Outer Ring Road & Radial Avenues, Central Delhi',
      actionDetails: 'Pre-dawn mechanical vacuum sweeping removing curb silt and debris before diurnal commercial traffic.',
      equipmentSummary: '2x High-Efficiency Electric Mechanical Sweepers',
      preAqi: 210,
      postAqi: 180,
      metricLabel: 'PM10 Mass',
      deltaLabel: '-30 AQI Points',
      pctReduction: '-14.3%',
      unit: 'AQI',
      stableExplanation: 'Clean asphalt surface prevented morning wind-whipped dust turbulence.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_009',
      title: 'Mechanical Road Sweeping & Washing — Wazirpur Industrial Area',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'CONFOUNDED',
      badgeLabel: 'Confounded (Rainfall Event)',
      badgeVariant: 'amber',
      dateTimeLabel: '10 Oct 2026 · 14:00 – 14:45 IST',
      locationCorridor: 'Wazirpur Industrial Ring Road, North-West Delhi',
      actionDetails: 'Intensive mechanized sweeping and dust vacuuming conducted along metalwork cluster access roads.',
      equipmentSummary: '3x Mechanical Sweepers & 1x Water Sprinkler tanker · 3.1 km corridor',
      preAqi: 310,
      postAqi: 218,
      metricLabel: 'PM10 Mass',
      deltaLabel: 'Attribution Inconclusive',
      unit: 'µg/m³',
      stableExplanation: 'Rainfall of 1.4 mm/h occurred at 14:20 IST during the post-action measurement window. Natural atmospheric precipitation washout masked localized street sweeping effects. Held as Confounded under standard evaluation rules.',
      isDetailedAuditAvailable: false
    },
    {
      id: 'govt_act_010',
      title: 'Construction Corridor Dust Control — Narela Industrial Zone',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'UNMEASURED',
      badgeLabel: 'Unmeasured (Data Gap)',
      badgeVariant: 'slate',
      dateTimeLabel: '11 Oct 2026 · 06:30 – 07:15 IST',
      locationCorridor: 'Narela Phase-II Industrial Roads, North Delhi',
      actionDetails: 'Boundary misting and perimeter wet sweeping near construction and raw material storage yards.',
      equipmentSummary: '2x MCD Water Tankers with broad spray bars',
      preAqi: 295,
      postAqi: null,
      metricLabel: 'PM2.5 / PM10',
      deltaLabel: 'Sensor Coverage Gap',
      unit: 'µg/m³',
      stableExplanation: 'Insufficient Sensor Coverage: No mobile sensor buses or stationary monitoring stations recorded telemetry within 1.5 km of this corridor during the evaluation window. Held as Unmeasured to avoid false attribution.',
      isDetailedAuditAvailable: false
    }
  ];

  const filteredActions = actionsList.filter((item) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'EMERGENCY_DIRECTIVES') return item.isEmergencyDirective;
    if (selectedFilter === 'VERIFIED_IMPACT') return item.status === 'VERIFIED_IMPACT';
    if (selectedFilter === 'MIST_SUPPRESSION') return item.interventionType === 'WATER_SUPPRESSION';
    if (selectedFilter === 'ROAD_SWEEPING') return item.interventionType === 'ROAD_SWEEPING';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats Header Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Delhi Clean Air Action Registry ({filteredActions.length} Actions)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            2 Active Directives
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            6 Verified Impacts
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            1 Confounded
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            1 Data Gap
          </span>
        </div>
      </div>

      {/* 2. Interactive Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All Actions (10)' },
          { id: 'EMERGENCY_DIRECTIVES', label: '🚨 Active Civic Directives (3)' },
          { id: 'VERIFIED_IMPACT', label: '✅ Verified Field Impacts (6)' },
          { id: 'MIST_SUPPRESSION', label: '💧 Water & Mist Cannons (4)' },
          { id: 'ROAD_SWEEPING', label: '🧹 Mechanical Sweeping (2)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as ActionFilterCategory)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedFilter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Unified Action Cards (Directives + Before/After AQI in same card, active emergency measures on top) */}
      <div className="space-y-4">
        {filteredActions.map((action) => {
          const isExpanded = expandedActionId === action.id;
          const hasReduction = action.postAqi !== null && action.postAqi < action.preAqi;
          const deltaAqi = action.postAqi !== null ? action.preAqi - action.postAqi : null;

          return (
            <div
              key={action.id}
              className={`bg-white border rounded-2xl transition-all shadow-xs overflow-hidden ${
                action.isEmergencyDirective
                  ? 'border-rose-200 ring-1 ring-rose-100 hover:border-rose-300'
                  : action.status === 'VERIFIED_IMPACT'
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : action.status === 'CONFOUNDED'
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header / Summary Bar */}
              <div
                onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge */}
                    {action.isEmergencyDirective ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <Flame className="w-3.5 h-3.5 text-rose-600" />
                        {action.badgeLabel}
                      </span>
                    ) : action.status === 'VERIFIED_IMPACT' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {action.badgeLabel}
                      </span>
                    ) : action.status === 'CONFOUNDED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        {action.badgeLabel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                        {action.badgeLabel}
                      </span>
                    )}

                    {/* Date/Time */}
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {action.dateTimeLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-950 tracking-tight flex items-center gap-2">
                    {action.title}
                  </h3>

                  <p className="text-xs text-slate-600 font-medium">
                    📍 {action.locationCorridor}
                  </p>

                  {/* Directive highlight pill if emergency directive */}
                  {action.directiveHighlight && (
                    <div className="text-xs font-medium text-rose-900 bg-rose-50/80 px-3 py-1.5 rounded-xl border border-rose-200/80 max-w-3xl">
                      {action.directiveHighlight}
                    </div>
                  )}
                </div>

                {/* Pre vs Post AQI Impact Pill (Combined in the same card) */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                    {/* Before AQI */}
                    <div className="text-center px-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Before</div>
                      <div className="text-base font-black font-mono text-slate-900">
                        {action.preAqi} <span className="text-[10px] font-normal text-slate-500">AQI</span>
                      </div>
                      {action.preConcentration && (
                        <div className="text-[10px] font-mono text-slate-500">
                          {action.preConcentration} {action.unit}
                        </div>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                    {/* After AQI */}
                    <div className="text-center px-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">After</div>
                      {action.postAqi !== null ? (
                        <>
                          <div className={`text-base font-black font-mono ${hasReduction ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {action.postAqi} <span className="text-[10px] font-normal text-slate-500">AQI</span>
                          </div>
                          {action.pctReduction && (
                            <div className="text-[10px] font-mono text-emerald-600 font-bold">
                              {action.pctReduction}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs font-bold text-slate-500 italic">
                          Unmeasured
                        </div>
                      )}
                    </div>

                    {/* Net Delta Badge */}
                    {deltaAqi !== null && (
                      <div className="hidden sm:block border-l border-slate-200 pl-3 text-right">
                        <div className="text-[10px] uppercase font-bold text-emerald-700">Net Drop</div>
                        <div className="text-sm font-black font-mono text-emerald-700 flex items-center gap-0.5 justify-end">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>-{deltaAqi}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronRight
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded Card Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 bg-slate-50/40">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Left: Action & Directive Specs */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Droplets className="w-4 h-4 text-sky-600" />
                        <span>Action & Equipment Details</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {action.actionDetails}
                      </p>
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                        <strong>Deployment:</strong> {action.equipmentSummary}
                      </div>
                    </div>

                    {/* Right: Measured Impact & Explanation */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Verified Air Impact & Scientific Context</span>
                      </div>

                      {action.deltaLabel && (
                        <div className="flex items-center justify-between text-xs font-bold pb-1">
                          <span className="text-slate-600">Measured Delta:</span>
                          <span className="text-emerald-700 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {action.deltaLabel}
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {action.stableExplanation}
                      </p>

                      {action.isDetailedAuditAvailable && onInspectInterventionAudit && (
                        <div className="pt-2">
                          <button
                            onClick={() => onInspectInterventionAudit(action.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <span>Inspect Sensor Audit Timeline</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
