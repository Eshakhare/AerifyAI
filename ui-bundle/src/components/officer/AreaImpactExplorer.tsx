/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Multi-Area Clean Air Impact Explorer (Tab 2)
 * Allows citizens and municipal officers to inspect all interventions conducted in specific localities
 * with clean visual Before vs. After comparison bars and verified air quality delta metrics.
 * Supports Multi-Select Area Filter Dropdown, applied tag bar with (X) remove buttons,
 * and multi-state data filtering across Delhi NCT, Karnataka, Maharashtra, and Uttar Pradesh.
 */

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  TrendingDown,
  Droplets,
  Wind,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Car,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  Filter,
  ChevronDown
} from 'lucide-react';
import { FocusStateCode, FOCUS_REGIONS } from '../../services/multiStateRegions';

export interface AreaIntervention {
  id: string;
  title: string;
  type: 'WATER_SUPPRESSION' | 'ROAD_SWEEPING' | 'VEHICLE_RESTRICTION' | 'CIVIC_PATROL';
  status: 'VERIFIED' | 'CONFOUNDED' | 'UNMEASURED';
  dateLabel: string;
  equipment: string;
  preAqi: number;
  postAqi: number | null;
  metricLabel: string;
  preConcentration?: number;
  postConcentration?: number | null;
  unit?: string;
  explanation?: string;
}

export interface LocalityImpactData {
  id: string;
  stateCode: FocusStateCode;
  name: string;
  district: string;
  currentAqi: number;
  aqiBand: 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  aqiBandColor: string;
  dominantSource: string;
  avgAqiDrop: number;
  interventions: AreaIntervention[];
}

export const MULTI_STATE_LOCALITIES: LocalityImpactData[] = [
  // =========================================================================
  // 1. DELHI LOCALITIES
  // =========================================================================
  {
    id: 'anand_vihar',
    stateCode: 'delhi',
    name: 'Anand Vihar',
    district: 'East Delhi',
    currentAqi: 342,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Interstate diesel bus idling & unpaved road dust resuspension',
    avgAqiDrop: 44.5,
    interventions: [
      {
        id: 'av_001',
        title: 'Targeted Mist Cannon Water Suppression (ISBT Arterial Loop)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Morning Run · 09:15 – 09:45 IST',
        equipment: '2x MCD Heavy Mist Cannons · 12,000L recycled STP water · 1.2 km corridor',
        preAqi: 242,
        postAqi: 198,
        metricLabel: 'PM10 Mass',
        preConcentration: 181.5,
        postConcentration: 154.2,
        unit: 'µg/m³',
        explanation: 'Statistically verified associative reduction against contemporaneous reference baseline.'
      },
      {
        id: 'av_002',
        title: 'Intensive Night Road Vacuum Sweeping (Ring Road Intersection)',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: 'Night Shift · 23:00 – 01:30 IST',
        equipment: '3x Mechanical Sweepers · High-efficiency vacuum dust containment',
        preAqi: 280,
        postAqi: 235,
        metricLabel: 'PM10 & Road Dust',
        preConcentration: 210.0,
        postConcentration: 172.5,
        unit: 'µg/m³',
        explanation: 'Pre-dawn sweep reduced resuspension particulate peak ahead of morning commute traffic.'
      }
    ]
  },
  {
    id: 'wazirpur',
    stateCode: 'delhi',
    name: 'Wazirpur',
    district: 'North West Delhi',
    currentAqi: 365,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Industrial metal finishing clusters, diesel generators & Ring Road freight',
    avgAqiDrop: 55.0,
    interventions: [
      {
        id: 'wz_001',
        title: 'Mechanical Road Sweeping & Washing (Industrial Ring Road)',
        type: 'ROAD_SWEEPING',
        status: 'CONFOUNDED',
        dateLabel: 'Midday Run · 14:00 – 14:45 IST',
        equipment: '3x Mechanical Sweepers & 1x Water Sprinkler tanker · 3.1 km corridor',
        preAqi: 310,
        postAqi: 218,
        metricLabel: 'PM10 Mass',
        explanation: 'Rainfall of 1.4 mm/h occurred during measurement window. Natural precipitation washout masked local street sweeping effects.'
      },
      {
        id: 'wz_002',
        title: 'Industrial Diesel Generator Staggering & Enforcement Patrol',
        type: 'CIVIC_PATROL',
        status: 'VERIFIED',
        dateLabel: 'Daytime Patrol · 10:00 – 16:00 IST',
        equipment: 'DPCC Flying Squad & MCD Inspection Teams · Grid power priority verification',
        preAqi: 385,
        postAqi: 330,
        metricLabel: 'City Grid AQI',
        explanation: 'Enforcement of zero DG set operation during peak grid availability resulted in measurable NOx and PM drops.'
      }
    ]
  },
  {
    id: 'jahangirpuri',
    stateCode: 'delhi',
    name: 'Jahangirpuri',
    district: 'North Delhi',
    currentAqi: 388,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Scrap reprocessing buffer, open biomass burning & Outer Ring Road bottlenecks',
    avgAqiDrop: 45.0,
    interventions: [
      {
        id: 'jp_001',
        title: 'Anti-Smog Gun Dust Settling (Flyover Ingress & Outer Ring Road)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Morning Dispatch · 08:30 – 09:15 IST',
        equipment: '1x High-Reach Anti-Smog Cannon · 10,000L treated water',
        preAqi: 330,
        postAqi: 285,
        metricLabel: 'PM10 Mass',
        explanation: 'High-reach mist curtain effectively bounded elevated ramp silt resuspension.'
      }
    ]
  },
  {
    id: 'dwarka',
    stateCode: 'delhi',
    name: 'Dwarka / Palam',
    district: 'South West Delhi',
    currentAqi: 285,
    aqiBand: 'Poor',
    aqiBandColor: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    dominantSource: 'Airport corridor mixed traffic & sub-city arterial construction dust',
    avgAqiDrop: 45.0,
    interventions: [
      {
        id: 'dw_001',
        title: 'Anti-Smog Mobile Cannon (Palam–Dwarka Sector 9–10 Elevated Highway)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Early Morning Run · 07:00 – 07:45 IST',
        equipment: '1x MCD Anti-Smog Gun · 8,000L capacity',
        preAqi: 285,
        postAqi: 240,
        metricLabel: 'PM2.5 Mass',
        preConcentration: 142.0,
        postConcentration: 118.5,
        unit: 'µg/m³',
        explanation: 'Curbed rush-hour particulate peak along the primary residential arterial.'
      }
    ]
  },
  {
    id: 'connaught_place',
    stateCode: 'delhi',
    name: 'Connaught Place',
    district: 'New Delhi',
    currentAqi: 215,
    aqiBand: 'Poor',
    aqiBandColor: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    dominantSource: 'Commercial vehicular congestion & radial arterial transit',
    avgAqiDrop: 45.0,
    interventions: [
      {
        id: 'cp_001',
        title: 'Night Mechanical Sweeping & Washing (Outer Circle & Radial Roads)',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: 'Pre-Dawn Shift · 04:30 – 05:45 IST',
        equipment: '2x Electric Mechanical Sweepers',
        preAqi: 235,
        postAqi: 190,
        metricLabel: 'Road Silt & PM10',
        explanation: 'Dust extraction completed across all 8 radial corridors prior to morning traffic.'
      }
    ]
  },

  // =========================================================================
  // 2. KARNATAKA (BENGALURU) LOCALITIES
  // =========================================================================
  {
    id: 'btm_layout',
    stateCode: 'karnataka',
    name: 'BTM Layout & Silk Board',
    district: 'Bengaluru South',
    currentAqi: 165,
    aqiBand: 'Moderate',
    aqiBandColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    dominantSource: 'Central Silk Board junction idling & Outer Ring Road flyover dust',
    avgAqiDrop: 42.0,
    interventions: [
      {
        id: 'btm_001',
        title: 'Outer Ring Road Recycled STP Water Mist Suppression',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Night Shift · 22:00 – 01:00 IST',
        equipment: '2x Mist Cannons · 100% Recycled Tertiary STP Water',
        preAqi: 185,
        postAqi: 143,
        metricLabel: 'Roadside PM10',
        explanation: 'Atomized mist curtains knocked down traffic-generated particulate resuspension.'
      }
    ]
  },
  {
    id: 'peenya',
    stateCode: 'karnataka',
    name: 'Peenya Industrial Area',
    district: 'Bengaluru North',
    currentAqi: 198,
    aqiBand: 'Moderate',
    aqiBandColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    dominantSource: 'Heavy fabrication, truck transit & unpaved industrial verges',
    avgAqiDrop: 46.0,
    interventions: [
      {
        id: 'pny_001',
        title: 'Peenya Phase 1-2 Mechanical Vacuum Road Sweeping',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: 'Nightly Run · 23:30 – 03:00 IST',
        equipment: '2x Heavy Industrial Mechanical Sweepers',
        preAqi: 205,
        postAqi: 159,
        metricLabel: 'Industrial Dust & PM10',
        explanation: 'Eliminated heavy metal dust and silt accumulation from manufacturing transit routes.'
      }
    ]
  },

  // =========================================================================
  // 3. MAHARASHTRA (MUMBAI) LOCALITIES
  // =========================================================================
  {
    id: 'bkc_mumbai',
    stateCode: 'maharashtra',
    name: 'Bandra-Kurla Complex (BKC)',
    district: 'Mumbai Suburban',
    currentAqi: 178,
    aqiBand: 'Moderate',
    aqiBandColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    dominantSource: 'Metro construction plumes, commercial high-rise towers & expressway links',
    avgAqiDrop: 48.0,
    interventions: [
      {
        id: 'bkc_001',
        title: 'BMC Comprehensive High-Rise Mist Misting & Barrier Washing',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Day Operations · 11:00 – 14:00 IST',
        equipment: '3x High-Pressure Mist Guns · Recycled wash water',
        preAqi: 215,
        postAqi: 167,
        metricLabel: 'Construction Fugitive Dust',
        explanation: 'Enforced 35-ft barricade wetting and road misting along the financial district spine.'
      }
    ]
  },
  {
    id: 'andheri_kurla',
    stateCode: 'maharashtra',
    name: 'Andheri-Kurla Road',
    district: 'Mumbai Suburban',
    currentAqi: 210,
    aqiBand: 'Poor',
    aqiBandColor: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    dominantSource: 'Dense auto-rickshaw traffic, airport freight & road re-suspension',
    avgAqiDrop: 44.0,
    interventions: [
      {
        id: 'ak_001',
        title: 'Western Express Highway Connecting Corridor Mechanical Sweep',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: 'Night Shift · 01:00 – 04:00 IST',
        equipment: '3x BMC Mechanical Sweepers with HEPA containment',
        preAqi: 232,
        postAqi: 188,
        metricLabel: 'Roadside Silt Mass',
        explanation: 'Swept over 6 metric tons of particulate matter before morning transit influx.'
      }
    ]
  },

  // =========================================================================
  // 4. UTTAR PRADESH (NOIDA / GHAZIABAD) LOCALITIES
  // =========================================================================
  {
    id: 'noida_sec62',
    stateCode: 'uttar_pradesh',
    name: 'Noida Sector 62',
    district: 'Gautam Buddha Nagar',
    currentAqi: 310,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'IT hub vehicular rush, unpaved verge dust & NH-24 freight spillover',
    avgAqiDrop: 52.0,
    interventions: [
      {
        id: 'noi_001',
        title: 'Noida Authority Anti-Smog Gun Encampment & Road Sprinkling',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: 'Continuous Patrol · 09:00 – 16:00 IST',
        equipment: '2x Vehicle-Mounted Anti-Smog Guns · 10,000L capacity',
        preAqi: 325,
        postAqi: 273,
        metricLabel: 'Arterial PM10 Mass',
        explanation: 'Suppressed dust re-suspension along major office commute arteries.'
      }
    ]
  },
  {
    id: 'vasundhara_gzb',
    stateCode: 'uttar_pradesh',
    name: 'Vasundhara Sector 16',
    district: 'Ghaziabad',
    currentAqi: 335,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Sahibabad industrial drift, boiler emissions & Link Road bottlenecks',
    avgAqiDrop: 56.0,
    interventions: [
      {
        id: 'vas_001',
        title: 'UPPCB Industrial Boiler PNG Transition & Road Washing',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: 'Night Shift · 22:30 – 02:00 IST',
        equipment: 'GNN High-Pressure Sprinklers & Sweeper Trucks',
        preAqi: 345,
        postAqi: 289,
        metricLabel: 'Industrial Buffer AQI',
        explanation: 'Combined industrial fuel compliance checks with intensive road wetting.'
      }
    ]
  }
];

interface AreaImpactExplorerProps {
  selectedState?: FocusStateCode;
}

export const AreaImpactExplorer: React.FC<AreaImpactExplorerProps> = ({
  selectedState = 'delhi'
}) => {
  const currentRegion = FOCUS_REGIONS[selectedState] || FOCUS_REGIONS.delhi;

  // Localities for this state that have recorded action data
  const stateLocalities = useMemo(() => {
    return MULTI_STATE_LOCALITIES.filter((a) => a.stateCode === selectedState);
  }, [selectedState]);

  // Selected area IDs (multi-select filter)
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(() => {
    const defaultIds = MULTI_STATE_LOCALITIES.filter((a) => a.stateCode === selectedState).map(
      (a) => a.id
    );
    return defaultIds.slice(0, 2);
  });

  // Keep selectedAreaIds in sync when state changes
  React.useEffect(() => {
    const validIds = MULTI_STATE_LOCALITIES.filter((a) => a.stateCode === selectedState).map(
      (a) => a.id
    );
    setSelectedAreaIds(validIds.slice(0, 2));
  }, [selectedState]);

  // Handle toggle in dropdown
  const handleToggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      if (prev.includes(areaId)) {
        return prev.filter((id) => id !== areaId);
      } else {
        return [...prev, areaId];
      }
    });
  };

  const handleRemoveArea = (areaId: string) => {
    setSelectedAreaIds((prev) => prev.filter((id) => id !== areaId));
  };

  const handleClearAll = () => {
    setSelectedAreaIds([]);
  };

  const handleSelectAll = () => {
    setSelectedAreaIds(stateLocalities.map((a) => a.id));
  };

  // Filtered list of areas to render
  const displayedLocalities = useMemo(() => {
    if (selectedAreaIds.length === 0) {
      // If none selected, display all available areas for this state
      return stateLocalities;
    }
    return stateLocalities.filter((a) => selectedAreaIds.includes(a.id));
  }, [stateLocalities, selectedAreaIds]);

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Multi-Select Area Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{currentRegion.name} Area Clean Air Impact Explorer</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select specific localities in {currentRegion.shortName} to inspect clean air interventions and Before vs. After results.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>{stateLocalities.length} Monitored Localities</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold">
              {stateLocalities.reduce((acc, curr) => acc + curr.interventions.length, 0)} Field Audits
            </span>
          </div>
        </div>

        {/* Multi-Select Area Filter Dropdown & Applied Tags Bar (Section 8.3) */}
        {stateLocalities.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Dropdown Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Filter Areas:
                </span>
                <select
                  aria-label="Filter Monitored Localities"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleToggleArea(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer outline-none hover:bg-slate-100 transition"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + Add / Remove Locality...
                  </option>
                  {stateLocalities.map((area) => (
                    <option key={area.id} value={area.id}>
                      {selectedAreaIds.includes(area.id) ? '✓ ' : '   '}
                      {area.name} ({area.district})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Actions: Clear All / Select All */}
              <div className="flex items-center gap-2 text-xs">
                {selectedAreaIds.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={handleSelectAll}
                  className="text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Select All
                </button>
              </div>
            </div>

            {/* Applied Tag Bar with (X) remove buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selectedAreaIds.length === 0 ? (
                <span className="text-xs text-slate-500 italic">
                  Showing all localities for {currentRegion.shortName}. Use the dropdown above to filter specific areas.
                </span>
              ) : (
                selectedAreaIds.map((id) => {
                  const area = stateLocalities.find((a) => a.id === id);
                  if (!area) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 animate-in fade-in duration-100"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>{area.name}</span>
                      <button
                        onClick={() => handleRemoveArea(id)}
                        className="hover:bg-emerald-200/60 p-0.5 rounded-full transition cursor-pointer"
                        title={`Remove ${area.name}`}
                      >
                        <X className="w-3 h-3 text-emerald-700" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Locality Cards with Before vs. After Bars */}
      {displayedLocalities.length === 0 ? (
        /* Empty State Message (Section 8.3) */
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">
            No government clean air actions recorded for {currentRegion.name} in the current registry.
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try switching states or clearing area filters to explore active clean air operations and verified impact data.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedLocalities.map((area) => (
            <div
              key={area.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5"
            >
              {/* Locality Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-extrabold text-slate-950 tracking-tight">
                      {area.name}
                    </h4>
                    <span className="text-xs font-mono text-slate-500">· {area.district}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Dominant Source: <strong className="text-slate-800">{area.dominantSource}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Average Verified Impact
                    </span>
                    <span className="text-lg font-extrabold font-mono text-emerald-700">
                      -{area.avgAqiDrop} AQI
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${area.aqiBandColor}`}
                  >
                    {area.aqiBand} ({area.currentAqi} AQI)
                  </span>
                </div>
              </div>

              {/* Interventions for this Locality */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recorded Operations ({area.interventions.length})
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {area.interventions.map((action) => {
                    const hasReduction = action.postAqi !== null && action.postAqi < action.preAqi;
                    const deltaAqi = action.postAqi !== null ? action.preAqi - action.postAqi : null;
                    const maxBarVal = Math.max(action.preAqi, 350);

                    return (
                      <div
                        key={action.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                              {action.status === 'VERIFIED'
                                ? 'Verified Measured Impact'
                                : action.status === 'CONFOUNDED'
                                ? 'Confounded by Weather'
                                : 'Unmeasured Window'}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 mt-0.5">
                              {action.title}
                            </h5>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {action.dateLabel} · {action.equipment}
                            </span>
                          </div>

                          {hasReduction && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                              -{deltaAqi} AQI Points
                            </span>
                          )}
                        </div>

                        {/* Before vs After Visual Comparison Bars */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/70">
                          {/* Before Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-600">Before Action</span>
                              <span className="font-mono font-bold text-slate-800">
                                {action.preAqi} AQI
                                {action.preConcentration && (
                                  <span className="text-slate-500 font-normal ml-1">
                                    ({action.preConcentration} {action.unit})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                style={{
                                  width: `${Math.min(100, (action.preAqi / maxBarVal) * 100)}%`
                                }}
                                className="h-full bg-amber-500 rounded-full"
                              />
                            </div>
                          </div>

                          {/* After Bar */}
                          {action.postAqi !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-600">
                                  After Action (Verified)
                                </span>
                                <span className="font-mono font-bold text-emerald-700">
                                  {action.postAqi} AQI
                                  {action.postConcentration && (
                                    <span className="text-emerald-600 font-normal ml-1">
                                      ({action.postConcentration} {action.unit})
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  style={{
                                    width: `${Math.min(100, (action.postAqi / maxBarVal) * 100)}%`
                                  }}
                                  className="h-full bg-emerald-600 rounded-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {action.explanation && (
                          <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                            {action.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
