/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Multi-Area Clean Air Impact Explorer (Tab 2)
 * Allows citizens and municipal officers to inspect all interventions conducted in specific Delhi localities
 * with clean visual Before vs. After comparison bars and verified air quality delta metrics.
 */

import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';

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
  name: string;
  district: string;
  currentAqi: number;
  aqiBand: 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  aqiBandColor: string;
  dominantSource: string;
  avgAqiDrop: number;
  interventions: AreaIntervention[];
}

export const DELHI_LOCALITIES: LocalityImpactData[] = [
  {
    id: 'anand_vihar',
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
        dateLabel: '08 Oct 2026 · 09:15 – 09:45 IST',
        equipment: '2x MCD Heavy Mist Cannons · 12,000L recycled STP water · 1.2 km corridor',
        preAqi: 242,
        postAqi: 198,
        metricLabel: 'PM10 Mass',
        preConcentration: 181.5,
        postConcentration: 154.2,
        unit: 'µg/m³',
        explanation: 'Statistically verified associative reduction against Rohini reference corridor with calm baseline winds.'
      },
      {
        id: 'av_002',
        title: 'Intensive Night Road Vacuum Sweeping (Ring Road Intersection)',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: '07 Oct 2026 · 23:00 – 01:30 IST',
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
    name: 'Wazirpur',
    district: 'North-West Delhi',
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
        dateLabel: '10 Oct 2026 · 14:00 – 14:45 IST',
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
        dateLabel: '09 Oct 2026 · 10:00 – 16:00 IST',
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
    name: 'Jahangirpuri',
    district: 'North Delhi',
    currentAqi: 388,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Scrap reprocessing buffer, open biomass burning & Outer Ring Road bottlenecks',
    avgAqiDrop: 50.0,
    interventions: [
      {
        id: 'jp_001',
        title: 'High-Reach Anti-Smog Gun Dust Settling (Flyover Ingress)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '11 Oct 2026 · 08:30 – 09:15 IST',
        equipment: '1x High-Reach Anti-Smog Cannon · 10,000L treated water',
        preAqi: 330,
        postAqi: 285,
        metricLabel: 'PM2.5 / PM10',
        explanation: 'Fine droplet suppression dampened suspended roadside dust clouds along the flyover approach.'
      },
      {
        id: 'jp_002',
        title: 'Night Thermal Drone Surveillance & Waste-Burning Interception',
        type: 'CIVIC_PATROL',
        status: 'VERIFIED',
        dateLabel: '10 Oct 2026 · 22:00 – 04:00 IST',
        equipment: '2x DPCC Night Vision Drones · MCD Rapid Action Flying Team',
        preAqi: 395,
        postAqi: 340,
        metricLabel: 'Nighttime Smoke AQI',
        explanation: 'Immediate dousing of 4 localized waste fires prevented severe overnight inversion smoke pooling.'
      }
    ]
  },
  {
    id: 'dwarka',
    name: 'Dwarka',
    district: 'South-West Delhi',
    currentAqi: 235,
    aqiBand: 'Poor',
    aqiBandColor: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    dominantSource: 'Airport transit traffic, highway construction dust & arterial corridors',
    avgAqiDrop: 40.0,
    interventions: [
      {
        id: 'dw_001',
        title: 'Mobile Anti-Smog Cannon (Palam–Dwarka Expressway)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '09 Oct 2026 · 07:00 – 07:45 IST',
        equipment: '1x Vehicle-Mounted Anti-Smog Gun · 8,000L capacity · 2.4 km road stretch',
        preAqi: 285,
        postAqi: 240,
        metricLabel: 'PM2.5 Mass',
        preConcentration: 142.0,
        postConcentration: 118.5,
        unit: 'µg/m³',
        explanation: 'Early morning arterial road misting curbed particulate peaks before peak commuter hours.'
      },
      {
        id: 'dw_002',
        title: 'Sector 9–10 Construction Perimeter Wet Spraying',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '08 Oct 2026 · 11:00 – 12:00 IST',
        equipment: '2x MCD Water Tankers · Wind barrier dust curtain misting',
        preAqi: 260,
        postAqi: 225,
        metricLabel: 'PM10 Mass',
        explanation: 'Suppression of excavation earthworks dust near residential sectors.'
      }
    ]
  },
  {
    id: 'connaught_place',
    name: 'Connaught Place',
    district: 'Central Delhi',
    currentAqi: 195,
    aqiBand: 'Moderate',
    aqiBandColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
    dominantSource: 'High commercial vehicle circulation & arterial transit intersections',
    avgAqiDrop: 31.5,
    interventions: [
      {
        id: 'cp_001',
        title: 'Night Mechanical Vacuum Sweeping (Outer Ring Road)',
        type: 'ROAD_SWEEPING',
        status: 'VERIFIED',
        dateLabel: '10 Oct 2026 · 02:00 – 04:30 IST',
        equipment: '2x High-Efficiency Electric Mechanical Sweepers · Radial road coverage',
        preAqi: 210,
        postAqi: 180,
        metricLabel: 'PM10 Road Dust',
        explanation: 'Complete removal of curb silt along the radial boulevards before morning traffic onset.'
      },
      {
        id: 'cp_002',
        title: 'Inner Circle Electric Vehicle Priority & Pedestrianization Zone',
        type: 'VEHICLE_RESTRICTION',
        status: 'VERIFIED',
        dateLabel: '09 Oct 2026 · 10:00 – 20:00 IST',
        equipment: 'NDMC Traffic Marshals · EV Shuttle Transit Loop',
        preAqi: 225,
        postAqi: 192,
        metricLabel: 'NO2 & Fine PM',
        explanation: 'Diversion of idling taxis and private fuel cars lowered street-level nitrogen oxides and fine particulates.'
      }
    ]
  },
  {
    id: 'okhla',
    name: 'Okhla',
    district: 'South-East Delhi',
    currentAqi: 320,
    aqiBand: 'Very Poor',
    aqiBandColor: 'text-amber-800 bg-amber-50 border-amber-300',
    dominantSource: 'Industrial Phase-II manufacturing, heavy truck transit & waste-to-energy perimeter',
    avgAqiDrop: 44.0,
    interventions: [
      {
        id: 'ok_001',
        title: 'Biochemical Dust Suppressant Spraying (Phase-II Arterials)',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '11 Oct 2026 · 10:00 – 11:00 IST',
        equipment: '1x Polymer Dust Suppressant Tanker · 1.8 km road treatment',
        preAqi: 315,
        postAqi: 270,
        metricLabel: 'PM10 Resuspension',
        explanation: 'Bio-binding spray formed a microscopic crust over roadside silt, reducing truck-generated resuspension by 45%.'
      },
      {
        id: 'ok_002',
        title: 'MCD Perimeter Green Wall & Buffer Washing',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '09 Oct 2026 · 15:00 – 16:00 IST',
        equipment: '2x High-Pressure Jet Washers · Treated recycled water',
        preAqi: 335,
        postAqi: 292,
        metricLabel: 'Coarse Particulates',
        explanation: 'Washed foliage and roadside barrier dust across the Okhla industrial border.'
      }
    ]
  },
  {
    id: 'rohini',
    name: 'Rohini',
    district: 'North-West Delhi',
    currentAqi: 275,
    aqiBand: 'Poor',
    aqiBandColor: 'text-yellow-800 bg-yellow-50 border-yellow-300',
    dominantSource: 'Construction sites, Outer Ring Road heavy traffic & sub-city vehicular flow',
    avgAqiDrop: 38.5,
    interventions: [
      {
        id: 'rh_001',
        title: 'Sector 16 Construction Wet Misting & Buffer Containment',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '10 Oct 2026 · 11:30 – 12:30 IST',
        equipment: '2x MCD Anti-Smog Guns · Boundary misting barriers',
        preAqi: 290,
        postAqi: 248,
        metricLabel: 'PM10 Mass',
        explanation: 'Suppression of open aggregate handling dust clouds near residential sectors.'
      },
      {
        id: 'rh_002',
        title: 'Corridor Baseline Sensor Monitoring & Reference Calibration',
        type: 'WATER_SUPPRESSION',
        status: 'VERIFIED',
        dateLabel: '08 Oct 2026 · 09:15 – 12:15 IST',
        equipment: 'DPCC CAAQMS Sector 16 Station + Mobile Bus Sensor Unit',
        preAqi: 174,
        postAqi: 171,
        metricLabel: 'Reference Baseline',
        explanation: 'Served as contemporaneous reference zone to mathematically verify Anand Vihar mist suppression.'
      }
    ]
  }
];

export const AreaImpactExplorer: React.FC = () => {
  const [selectedAreaId, setSelectedAreaId] = useState<string>('anand_vihar');

  const selectedArea = DELHI_LOCALITIES.find((a) => a.id === selectedAreaId) || DELHI_LOCALITIES[0];

  return (
    <div className="space-y-6">
      {/* 1. Header Overview & Area Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Delhi Area Clean Air Impact Explorer</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any Delhi locality to review clean air interventions and before vs. after sensor results.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>7 Monitored Localities</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold">14 Field Audits</span>
          </div>
        </div>

        {/* Locality Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {DELHI_LOCALITIES.map((area) => {
            const isSelected = area.id === selectedAreaId;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{area.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                    isSelected
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {area.currentAqi} AQI
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Locality Snapshot Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
                {selectedArea.district}
              </span>
              <span className="text-xs text-slate-400">Locality Clean Air Profile</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{selectedArea.name}</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              <strong>Dominant Local Emission Source:</strong> {selectedArea.dominantSource}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 backdrop-blur-xs shrink-0">
            <div className="text-center px-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Current AQI</div>
              <div className="text-2xl font-black font-mono text-amber-400">{selectedArea.currentAqi}</div>
              <div className="text-[10px] font-bold text-amber-300">{selectedArea.aqiBand}</div>
            </div>

            <div className="w-px h-10 bg-slate-700"></div>

            <div className="text-center px-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Avg AQI Reduction</div>
              <div className="text-2xl font-black font-mono text-emerald-400">-{selectedArea.avgAqiDrop}</div>
              <div className="text-[10px] font-bold text-emerald-300">Measured Delta</div>
            </div>

            <div className="w-px h-10 bg-slate-700"></div>

            <div className="text-center px-2">
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Actions Logged</div>
              <div className="text-2xl font-black font-mono text-sky-400">{selectedArea.interventions.length}</div>
              <div className="text-[10px] font-bold text-sky-300">Field Audits</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interventions in Selected Locality with Visual Before vs. After Bars */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>Interventions & Measured Sensor Deltas in {selectedArea.name}</span>
          </h4>
          <span className="text-[11px] font-medium text-slate-500">
            Sensor-verified pre vs. post monitoring windows
          </span>
        </div>

        {selectedArea.interventions.map((item, idx) => {
          const delta = item.postAqi !== null ? item.preAqi - item.postAqi : null;
          const pctDrop = item.postAqi !== null ? ((delta! / item.preAqi) * 100).toFixed(1) : null;

          // Max scaling AQI scale (450 cap for visual bar)
          const prePercent = Math.min(100, Math.round((item.preAqi / 450) * 100));
          const postPercent = item.postAqi !== null ? Math.min(100, Math.round((item.postAqi / 450) * 100)) : 0;

          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Action Title and Badge Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {item.status === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Measured Impact
                      </span>
                    )}
                    {item.status === 'CONFOUNDED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        Confounded by Rain
                      </span>
                    )}
                    {item.status === 'UNMEASURED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        Sensor Data Gap
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 font-medium">
                      {item.dateLabel}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-500">{item.equipment}</p>
                </div>

                {/* Net Impact Delta Pill */}
                {delta !== null ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Net Improvement</div>
                    <div className="text-base font-black font-mono text-emerald-800 flex items-center gap-1 justify-end">
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                      <span>-{delta} AQI</span>
                      <span className="text-xs font-semibold text-emerald-600">(-{pctDrop}%)</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center shrink-0">
                    <div className="text-xs font-bold text-slate-500">Inconclusive</div>
                  </div>
                )}
              </div>

              {/* Visual Before vs. After Comparison Bar Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Before vs. After Air Quality Comparison</span>
                  <span className="font-mono text-slate-500">Scale: 0 to 450 AQI</span>
                </div>

                {/* Pre-Action Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Before Action</span>
                    <span className="font-mono font-bold text-rose-700">
                      {item.preAqi} AQI {item.preConcentration ? `(${item.preConcentration} ${item.unit})` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${prePercent}%` }}
                    />
                  </div>
                </div>

                {/* Post-Action Bar */}
                {item.postAqi !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">After Action</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {item.postAqi} AQI {item.postConcentration ? `(${item.postConcentration} ${item.unit})` : ''}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${postPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    Post-action measurement unavailable or withheld due to atmospheric conditions.
                  </div>
                )}
              </div>

              {/* Scientific Note / Explanation */}
              {item.explanation && (
                <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{item.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
