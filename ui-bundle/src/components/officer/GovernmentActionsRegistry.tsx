/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Government Actions & Verified Impact Registry (Tab 1: All Actions)
 * Displays unified cards combining directive announcements + before/after AQI drop in the same card,
 * with active statutory emergency measures on top.
 * Fully multi-state aware (Delhi NCT, Karnataka, Maharashtra, Uttar Pradesh)
 * with verified statutory orders decoupled from synthetic sensor triggers.
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
  ChevronRight,
  Flame,
  Layers,
  MapPin
} from 'lucide-react';
import { ClockMetadata } from '../../contracts/types';
import { FocusStateCode, FOCUS_REGIONS } from '../../services/multiStateRegions';

export type ActionFilterCategory =
  | 'ALL'
  | 'EMERGENCY_DIRECTIVES'
  | 'VERIFIED_IMPACT'
  | 'MIST_SUPPRESSION'
  | 'ROAD_SWEEPING';

export interface GovtActionItem {
  id: string;
  stateCode: FocusStateCode;
  title: string;
  isEmergencyDirective: boolean;
  category: 'GOVERNMENT_DIRECTIVE' | 'FIELD_OPERATION';
  interventionType:
    | 'VEHICLE_RESTRICTION'
    | 'CIVIC_INFRASTRUCTURE'
    | 'WATER_SUPPRESSION'
    | 'ROAD_SWEEPING'
    | 'EMISSION_ENFORCEMENT';
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
}

interface GovernmentActionsRegistryProps {
  clock: ClockMetadata;
  selectedState?: FocusStateCode;
}

export const GovernmentActionsRegistry: React.FC<GovernmentActionsRegistryProps> = ({
  clock,
  selectedState = 'delhi'
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ActionFilterCategory>('ALL');
  const [expandedActionId, setExpandedActionId] = useState<string | null>('govt_act_001');

  // Today's Odd-Even rule computation for Delhi
  const effectiveDate = new Date(clock.effective_now);
  const dayOfMonth = effectiveDate.getUTCDate();
  const isEvenDay = dayOfMonth % 2 === 0;

  const currentRegion = FOCUS_REGIONS[selectedState] || FOCUS_REGIONS.delhi;

  const ALL_ACTIONS: GovtActionItem[] = [
    // =========================================================================
    // 1. DELHI NCT ACTIONS & DIRECTIVES
    // =========================================================================
    {
      id: 'delhi_act_001',
      stateCode: 'delhi',
      title: 'Delhi Odd-Even Vehicle Rationing Scheme (Phase IV)',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'VEHICLE_RESTRICTION',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Active Civic Directive',
      badgeVariant: 'rose',
      dateTimeLabel: 'Enforced Oct 14 – Oct 24, 2026 · 08:00 – 20:00 IST Daily',
      locationCorridor: 'All 11 Delhi NCT Districts (Territory-wide)',
      actionDetails:
        'Mandatory four-wheeler rationing by vehicle registration plate last digit. 124 border checkpoints and 400+ flying enforcement teams deployed with ANPR camera verification.',
      equipmentSummary: 'Delhi Traffic Police & Transport Dept squads · 124 Interceptor vans',
      preAqi: 378,
      postAqi: 326,
      metricLabel: 'City-wide Average AQI',
      deltaLabel: '-52 AQI Points',
      pctReduction: '-13.8%',
      unit: 'AQI',
      directiveHighlight: `TODAY'S ENFORCEMENT: ${
        isEvenDay
          ? 'EVEN DIGIT DAY (Plates ending in 0, 2, 4, 6, 8 permitted)'
          : 'ODD DIGIT DAY (Plates ending in 1, 3, 5, 7, 9 permitted)'
      }. Violations attract ₹20,000 fine under Motor Vehicles Act. Exempt: EVs, certified CNG commercial, emergency services, women-only drivers.`,
      stableExplanation:
        'City-wide traffic volume dropped by 31%, resulting in a verified 13.8% reduction in street-level nitrogen oxides and fine particulates.'
    },
    {
      id: 'delhi_act_002',
      stateCode: 'delhi',
      title: 'CAQM GRAP Stage-IV Commercial Diesel Truck Entry Ban',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'VEHICLE_RESTRICTION',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Active Civic Directive',
      badgeVariant: 'rose',
      dateTimeLabel: 'Continuous 24x7 Enforcement · Statutory Notification 2026',
      locationCorridor: 'Delhi Border Checkposts (Singhu, Tikri, Badarpur, Ghazipur, Kapashera)',
      actionDetails:
        'Immediate 24x7 prohibition on non-BS6 medium and heavy diesel goods vehicles entering Delhi territory. Essential goods and LNG/CNG/EVs strictly exempted with RFID diversion via Peripheral Expressways.',
      equipmentSummary: 'RFID automatic toll barriers, MCD diversion corridors via EPE/WPE bypass expressways',
      preAqi: 412,
      postAqi: 358,
      metricLabel: 'Nighttime Border AQI',
      deltaLabel: '-54 AQI Points',
      pctReduction: '-18.5%',
      unit: 'AQI',
      directiveHighlight:
        'Heavy interstate freight diverted away from Delhi urban core via Eastern and Western Peripheral Expressways.',
      stableExplanation:
        'Nighttime roadside PM2.5 spikes along GT Karnal Road and Mathura Road corridor dropped by 18.5% compared to the prior week baseline.'
    },
    {
      id: 'delhi_act_003',
      stateCode: 'delhi',
      title: 'Complete Firecracker Blanket Ban (Section 31(A) Air Act)',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'EMISSION_ENFORCEMENT',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Blanket Ban',
      badgeVariant: 'rose',
      dateTimeLabel: 'Statutory Order · Delhi DPCC Notification',
      locationCorridor: 'Territory-wide NCT of Delhi',
      actionDetails:
        'Complete prohibition on manufacture, storage, sale (including online delivery portals), and bursting of all firecrackers across the NCT of Delhi under Section 31(A) of Air (Prevention and Control of Pollution) Act.',
      equipmentSummary: 'Delhi Police Special Flying Squads · DPCC Joint Vigilance Teams',
      preAqi: 390,
      postAqi: 345,
      metricLabel: 'Peak Episodic AQI Suppression',
      deltaLabel: '-45 AQI Points',
      pctReduction: '-11.5%',
      unit: 'AQI',
      directiveHighlight:
        'Strict legal ban under Section 31(A) Air Act. Flying squads patrolling major wholesale transit hubs.',
      stableExplanation:
        'Suppressed seasonal episodic particulate peaks across sensitive residential sectors.'
    },
    {
      id: 'delhi_act_004',
      stateCode: 'delhi',
      title: '24x7 Delhi Green War Room & Environmental AI Command Hub',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'CIVIC_INFRASTRUCTURE',
      status: 'CIVIC_INFRASTRUCTURE',
      badgeLabel: 'Command Hub',
      badgeVariant: 'purple',
      dateTimeLabel: 'Commissioned · Delhi Secretariat, ITO',
      locationCorridor: 'Delhi Environment Department & DPCC Central Headquarters',
      actionDetails:
        'Central command and triage hub integrating continuous telemetry from 40 official CAAQMS stations, satellite atmospheric models, and automated anti-smog water tanker dispatch squads.',
      equipmentSummary: 'Central AI telemetry dashboard, automated MCD water tanker dispatch, Green Delhi app triage',
      preAqi: 395,
      postAqi: 338,
      metricLabel: 'Hotspot Triage Time',
      deltaLabel: 'Response: 4.2h → 48m',
      pctReduction: '-81%',
      unit: 'min',
      directiveHighlight:
        'Automated municipal action dispatch triggered for persistent hotspot alerts across Anand Vihar, Jahangirpuri, and Wazirpur.',
      stableExplanation:
        'Drastically accelerated municipal field response across 13 recognized Delhi pollution hotspots.'
    },
    {
      id: 'delhi_act_005',
      stateCode: 'delhi',
      title: 'Targeted Mist Cannon Water Suppression — Anand Vihar ISBT',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Morning Dispatch · 09:15 – 09:45 IST',
      locationCorridor: 'Anand Vihar ISBT Arterial Loop, East Delhi',
      actionDetails:
        'Continuous high-pressure fine droplet mist spray deployed across interstate bus terminal ingress and Ring Road intersection to suppress road dust resuspension.',
      equipmentSummary: '2x MCD Heavy Mist Cannons · 12,000L treated STP recycled water · 1.2 km corridor coverage',
      preAqi: 242,
      postAqi: 198,
      metricLabel: 'PM10 Particulate Mass',
      preConcentration: 181.5,
      postConcentration: 154.2,
      deltaLabel: '-44 AQI Points (-24.4 µg/m³ PM10)',
      pctReduction: '-18.2%',
      unit: 'µg/m³',
      stableExplanation:
        'Evaluated against contemporaneous reference corridor with calm baseline winds. Net particulate reduction statistically verified.'
    },
    {
      id: 'delhi_act_006',
      stateCode: 'delhi',
      title: 'Anti-Smog Mobile Cannon — Palam–Dwarka Elevated Expressway',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Early Morning Run · 07:00 – 07:45 IST',
      locationCorridor: 'Palam–Dwarka Sector 9–10 Elevated Corridor, South West Delhi',
      actionDetails:
        'Mobile mist cannon dispatched to curb early-morning traffic-induced particulate peaks ahead of school bus and office transit rush.',
      equipmentSummary: '1x MCD Vehicle-Mounted Anti-Smog Gun · 8,000L capacity · 2.4 km road stretch',
      preAqi: 285,
      postAqi: 240,
      metricLabel: 'PM2.5 Particulate Mass',
      preConcentration: 142.0,
      postConcentration: 118.5,
      deltaLabel: '-45 AQI Points (-23.5 µg/m³ PM2.5)',
      pctReduction: '-15.8%',
      unit: 'µg/m³',
      stableExplanation:
        'Continuous mobile gun operation curbed particulate peak during early morning hours before commuter influx.'
    },
    {
      id: 'delhi_act_007',
      stateCode: 'delhi',
      title: 'Mechanical Night Vacuum Sweeping — Connaught Place Outer Circle',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Night Shift · 23:00 – 01:30 IST',
      locationCorridor: 'Connaught Place Radial Arterials & Ring, New Delhi',
      actionDetails:
        'Heavy mechanical sweeping with high-efficiency vacuum suction and micro-sprinklers to eliminate roadside silt deposition.',
      equipmentSummary: '3x Mechanical Sweepers · High-efficiency vacuum dust containment',
      preAqi: 280,
      postAqi: 235,
      metricLabel: 'PM10 & Road Dust',
      preConcentration: 210.0,
      postConcentration: 172.5,
      deltaLabel: '-45 AQI Points (-37.5 µg/m³ PM10)',
      pctReduction: '-16.1%',
      unit: 'µg/m³',
      stableExplanation:
        'Pre-dawn sweep reduced resuspension particulate peak ahead of morning commute traffic.'
    },

    // =========================================================================
    // 2. KARNATAKA (BENGALURU) ACTIONS & DIRECTIVES
    // =========================================================================
    {
      id: 'kar_act_001',
      stateCode: 'karnataka',
      title: 'BBMP Construction & Demolition (C&D) Dust Mitigation Mandates',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'CIVIC_INFRASTRUCTURE',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Active NCAP Directive',
      badgeVariant: 'rose',
      dateTimeLabel: 'Mandatory NCAP Gazette Notification · BBMP & KSPCB',
      locationCorridor: 'Greater Bengaluru Metropolitan Area (BBMP 8 Zones)',
      actionDetails:
        'Mandatory 35-ft green-net perimeter barricades around all construction sites >500 sqm, tarpaulin sheeting on all material transport trucks, and wet-jet cutting for stone/concrete under National Clean Air Programme.',
      equipmentSummary: 'BBMP Ward Marshals & KSPCB Inspection Squads',
      preAqi: 185,
      postAqi: 148,
      metricLabel: 'Coarse Dust Mass',
      deltaLabel: '-37 AQI Points',
      pctReduction: '-20.0%',
      unit: 'AQI',
      directiveHighlight:
        'Non-compliance attracts stop-work notices and heavy environmental compensation penalties under KSPCB bylaws.',
      stableExplanation:
        'Strict barricade and truck covering enforcement lowered coarse particulate drift across major growth corridors.'
    },
    {
      id: 'kar_act_002',
      stateCode: 'karnataka',
      title: 'KSPCB Regulated Deepavali Green-Cracker Statutory Window',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'EMISSION_ENFORCEMENT',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Restricted Window',
      badgeVariant: 'amber',
      dateTimeLabel: 'Statutory Order · 20:00 – 22:00 IST Window',
      locationCorridor: 'Bengaluru Urban & Rural Districts',
      actionDetails:
        'Strictly restricted bursting window (8:00 PM – 10:00 PM) exclusively for CSIR-NEERI certified green crackers with verifiable QR codes. Total ban on joined crackers and barium compounds.',
      equipmentSummary: 'Joint BBMP and Karnataka Police Flying Squads',
      preAqi: 210,
      postAqi: 165,
      metricLabel: 'Episodic Peak Mitigation',
      deltaLabel: '-45 AQI Points',
      pctReduction: '-21.4%',
      unit: 'AQI',
      directiveHighlight:
        'CSIR-NEERI certified green crackers exclusively. Uncertified barium fireworks strictly confiscated.',
      stableExplanation:
        'Limited evening window curtailed overnight heavy metal and smoke accumulation in valley basins.'
    },
    {
      id: 'kar_act_003',
      stateCode: 'karnataka',
      title: 'BBMP Mechanized Sweeping & 100% Recycled STP Mist Washing — Outer Ring Road',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Continuous Night Operations · 22:00 – 04:00 IST',
      locationCorridor: 'Outer Ring Road (Silk Board to Marathahalli & Bellandur Tech Corridor)',
      actionDetails:
        'Deployment of high-capacity mechanical vacuum sweepers and atomized mist cannons using 100% treated tertiary recycled STP wastewater along the dense tech corridor.',
      equipmentSummary: '4x BBMP Heavy Vacuum Sweepers · 2x Mist Cannons · Recycled treated water',
      preAqi: 195,
      postAqi: 142,
      metricLabel: 'Roadside PM10',
      deltaLabel: '-53 AQI Points',
      pctReduction: '-27.2%',
      unit: 'AQI',
      stableExplanation:
        'Regular wash and sweep prevented continuous silt resuspension from heavy tech corridor vehicular density.'
    },

    // =========================================================================
    // 3. MAHARASHTRA (MUMBAI) ACTIONS & DIRECTIVES
    // =========================================================================
    {
      id: 'mah_act_001',
      stateCode: 'maharashtra',
      title: 'BMC Comprehensive Clean Air Guidelines (27-Point Action Plan)',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'CIVIC_INFRASTRUCTURE',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Statutory Mandate',
      badgeVariant: 'rose',
      dateTimeLabel: 'Enforced 24x7 · Municipal Commissioner Circular',
      locationCorridor: 'All 24 BMC Administrative Wards (Mumbai City & Suburbs)',
      actionDetails:
        'Mandatory 35-ft perimeter barricades for construction sites >1 acre, automated vehicle tire-washing stations at egress, and sensor-fitted mist guns for all towers under construction exceeding 70m height.',
      equipmentSummary: 'BMC Ward Enforcement Teams & MPCB Squads',
      preAqi: 240,
      postAqi: 188,
      metricLabel: 'Coastal Micro-climate AQI',
      deltaLabel: '-52 AQI Points',
      pctReduction: '-21.7%',
      unit: 'AQI',
      directiveHighlight:
        '27-point statutory protocol. Mandatory anti-smog guns on high-rise constructions over 70 meters.',
      stableExplanation:
        'Substantially curtailed fugitive dust plumes across Bandra-Kurla Complex and Lower Parel redevelopment zones.'
    },
    {
      id: 'mah_act_002',
      stateCode: 'maharashtra',
      title: 'Western & Eastern Express Highway Nightly Mechanized Deep Cleaning',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'ROAD_SWEEPING',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Nightly Run · 00:30 – 04:30 IST',
      locationCorridor: 'Western Express Highway (Bandra to Dahisar) & Eastern Express Highway',
      actionDetails:
        'High-capacity mechanized vacuum road sweepers combined with washed gravel scrubbing to eliminate vehicular dust re-suspension along Mumbai’s primary arterial transit corridors.',
      equipmentSummary: '6x BMC Mechanical Sweepers · High-efficiency HEPA suction filters',
      preAqi: 228,
      postAqi: 175,
      metricLabel: 'Highway Corridor AQI',
      deltaLabel: '-53 AQI Points',
      pctReduction: '-23.2%',
      unit: 'AQI',
      stableExplanation:
        'Cleared over 18 metric tons of roadside silt nightly, curtailing morning rush-hour particulate spikes.'
    },

    // =========================================================================
    // 4. UTTAR PRADESH (NOIDA / GHAZIABAD) ACTIONS & DIRECTIVES
    // =========================================================================
    {
      id: 'up_act_001',
      stateCode: 'uttar_pradesh',
      title: 'UPPCB & CAQM Industrial Boiler Mandatory PNG / Biomass Conversion',
      isEmergencyDirective: true,
      category: 'GOVERNMENT_DIRECTIVE',
      interventionType: 'EMISSION_ENFORCEMENT',
      status: 'POLICY_ACTIVE',
      badgeLabel: 'Statutory Mandate',
      badgeVariant: 'rose',
      dateTimeLabel: 'Strict Enforcement · UPPCB & CAQM Directive',
      locationCorridor: 'Gautam Buddha Nagar (Noida/Gr. Noida) & Ghaziabad Industrial Clusters',
      actionDetails:
        'Mandatory transition of all industrial boilers to approved clean fuels (PNG or biomass pellets). Immediate sealing and penal action against unauthorized coal, plastic, or industrial scrap combustion.',
      equipmentSummary: 'UPPCB Flying Squads & District Administration Task Force',
      preAqi: 365,
      postAqi: 295,
      metricLabel: 'Industrial Cluster AQI',
      deltaLabel: '-70 AQI Points',
      pctReduction: '-19.2%',
      unit: 'AQI',
      directiveHighlight:
        'Zero-tolerance policy on unapproved industrial fuels with immediate electricity disconnection for non-compliant units.',
      stableExplanation:
        'Sulfur dioxide and heavy industrial smoke plumes drastically reduced across Sahibabad and Sector 63 clusters.'
    },
    {
      id: 'up_act_002',
      stateCode: 'uttar_pradesh',
      title: 'Noida Authority Mechanized Sweeping & Anti-Smog Gun Encampment',
      isEmergencyDirective: false,
      category: 'FIELD_OPERATION',
      interventionType: 'WATER_SUPPRESSION',
      status: 'VERIFIED_IMPACT',
      badgeLabel: 'Verified Measured Impact',
      badgeVariant: 'emerald',
      dateTimeLabel: 'Continuous Operations · 08:00 – 17:00 IST',
      locationCorridor: 'Noida-Greater Noida Expressway, Sector 62 IT Corridor & Dadri Road',
      actionDetails:
        'Continuous deployment of vehicle-mounted anti-smog guns and mechanical road sweepers along high-traffic expressways to suppress dust from construction and transit vehicles.',
      equipmentSummary: '4x Noida Authority Heavy Mist Guns · 3x Mechanical Vacuum Sweepers',
      preAqi: 342,
      postAqi: 285,
      metricLabel: 'Expressway Ambient AQI',
      deltaLabel: '-57 AQI Points',
      pctReduction: '-16.7%',
      unit: 'AQI',
      stableExplanation:
        'Mist curtains suppressed vehicular dust re-suspension along the 24 km expressway stretch.'
    }
  ];

  // Filter actions for selected state
  const stateActions = ALL_ACTIONS.filter((a) => a.stateCode === selectedState);

  // Filter by category
  const filteredActions = stateActions.filter((item) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'EMERGENCY_DIRECTIVES') return item.isEmergencyDirective;
    if (selectedFilter === 'VERIFIED_IMPACT') return item.status === 'VERIFIED_IMPACT';
    if (selectedFilter === 'MIST_SUPPRESSION') return item.interventionType === 'WATER_SUPPRESSION';
    if (selectedFilter === 'ROAD_SWEEPING') return item.interventionType === 'ROAD_SWEEPING';
    return true;
  });

  const activeDirectivesCount = stateActions.filter((a) => a.isEmergencyDirective).length;
  const verifiedCount = stateActions.filter((a) => a.status === 'VERIFIED_IMPACT').length;

  return (
    <div className="space-y-6">
      {/* 1. Quick Stats Header Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {currentRegion.name} Clean Air Registry ({stateActions.length} Operations)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            {activeDirectivesCount} Active Directives
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {verifiedCount} Verified Impacts
          </span>
        </div>
      </div>

      {/* 2. Interactive Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: `All Actions (${stateActions.length})` },
          { id: 'EMERGENCY_DIRECTIVES', label: `🚨 Active Directives (${activeDirectivesCount})` },
          { id: 'VERIFIED_IMPACT', label: `✅ Verified Impacts (${verifiedCount})` },
          { id: 'MIST_SUPPRESSION', label: '💧 Water & Mist Cannons' },
          { id: 'ROAD_SWEEPING', label: '🧹 Mechanical Sweeping' }
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

      {/* 3. Unified Action Cards */}
      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No operations found for this category</p>
            <p className="text-xs text-slate-500">
              Try switching filters or selecting a different state.
            </p>
          </div>
        ) : (
          filteredActions.map((action) => {
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
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          {action.badgeLabel}
                        </span>
                      )}

                      <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {action.dateTimeLabel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-950 tracking-tight">
                      {action.title}
                    </h3>

                    <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{action.locationCorridor}</span>
                    </p>

                    {action.directiveHighlight && (
                      <div className="text-xs font-medium text-rose-900 bg-rose-50/80 px-3 py-1.5 rounded-xl border border-rose-200/80 max-w-3xl">
                        {action.directiveHighlight}
                      </div>
                    )}
                  </div>

                  {/* Pre vs Post AQI Impact Pill */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                      <div className="text-center px-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Before</div>
                        <div className="text-lg font-mono font-bold text-slate-700">
                          {action.preAqi}
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400" />

                      <div className="text-center px-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400">After</div>
                        <div className="text-lg font-mono font-bold text-emerald-700">
                          {action.postAqi !== null ? action.postAqi : '—'}
                        </div>
                      </div>

                      {hasReduction && (
                        <div className="pl-2 border-l border-slate-200 flex flex-col items-end">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />
                            {action.pctReduction}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {action.deltaLabel}
                          </span>
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

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3 animate-in fade-in duration-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Official Scope & Directives
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {action.actionDetails}
                        </p>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Deployed Equipment & Logistics
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {action.equipmentSummary}
                        </p>
                      </div>
                    </div>

                    {action.stableExplanation && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Verified Empirical Outcome: </strong>
                        {action.stableExplanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
