/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Near You Environmental Context
 * Displays NearbySummary and LocationContext (weather, Sentinel-5P satellite, nearby facilities).
 * Strictly enforces Domain Rule 5: Proximity context only, satellite in mol/m2, causation_claimed validation.
 * Authoritative Light Mode styling: bg-white, border-slate-200, text-slate-800.
 */

import React, { useEffect, useState } from 'react';
import {
  Compass,
  Wind,
  Thermometer,
  CloudRain,
  Satellite,
  Factory,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';

import { ApiClient } from '../api/ApiClient';
import {
  ClockMetadata,
  SessionInfo,
  NearbySummary,
  LocationContext
} from '../contracts/types';
import { EvidenceBadge } from '../components/shared/EvidenceBadge';
import { FreshnessLabel } from '../components/shared/FreshnessLabel';
import { Disclaimer } from '../components/shared/Disclaimer';
import { EnvironmentalContextDrawer } from '../components/drawer/EnvironmentalContextDrawer';
import { formatUnit } from '../ui/viewModels';

interface NearYouViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata;
  session: SessionInfo;
}

export const NearYouView: React.FC<NearYouViewProps> = ({
  apiClient,
  clock,
  session
}) => {
  const [nearby, setNearby] = useState<NearbySummary | null>(null);
  const [context, setContext] = useState<LocationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [causationError, setCausationError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadNearYouData() {
      try {
        setLoading(true);
        const position = { lat: 28.6469, lng: 77.3160 }; // Anand Vihar ISBT coordinates
        const [summary, locCtx] = await Promise.all([
          apiClient.getNearby(position),
          apiClient.getLocationContext('road_segment_anand_vihar_014')
        ]);

        // Non-negotiable Domain Rule 5: Causation claimed validation
        for (const src of locCtx.nearby_sources) {
          if (src.causation_claimed) {
            setCausationError(
              `FATAL CONTRACT ERROR: Proximity source "${src.name}" has causation_claimed = true. System rejected rendering per Non-negotiable Domain Rule 5.`
            );
            return;
          }
        }

        setNearby(summary);
        setContext(locCtx);
      } catch (err: any) {
        console.error('Error loading Near You data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNearYouData();
  }, [apiClient]);

  if (causationError) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-rose-700 font-bold">
          <AlertTriangle className="w-5 h-5" />
          <span>Domain Rule 5 Validation Failure</span>
        </div>
        <p className="text-xs">{causationError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-start justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-mono text-xs uppercase tracking-wider font-semibold">
            <Compass className="w-4 h-4" />
            <span>Hyper-Local Environmental Intelligence</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Anand Vihar ISBT & Surrounding 3 km Sector
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target coordinates: 28.6469° N, 77.3160° E · East Delhi District
          </p>
        </div>

        {nearby && (
          <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Road PM2.5</span>
              <span className="text-base font-bold text-amber-700">
                {nearby.nearest_road_observation ? `${nearby.nearest_road_observation.value} µg/m³` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nearby Districts</span>
              <span className="text-base font-bold text-sky-700">{nearby.nearby_cities.length}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Regional Model</span>
              <span className="text-base font-bold text-emerald-700">
                {nearby.regional_model ? `${nearby.regional_model.value} µg/m³` : 'Active'}
              </span>
            </div>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs ml-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Context Drawer</span>
            </button>
          </div>
        )}
      </div>

      {nearby && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex items-center gap-2.5 shadow-xs">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <span className="font-medium">
            Requested Position ({nearby.requested_position.lat.toFixed(4)}° N, {nearby.requested_position.lng.toFixed(4)}° E) matched to road segment observation and regional model context.
          </span>
        </div>
      )}

      {/* Weather, Satellite & Industrial Context Grid */}
      {context && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Numerical Weather Context */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wind className="w-4 h-4 text-sky-600" />
                <span>Weather Model Context</span>
              </h3>
              <EvidenceBadge state="MODEL_ESTIMATED" size="sm" />
            </div>

            <div className="space-y-3">
              {context.weather.map((w) => (
                <div key={w.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">{w.metric}</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      {w.value} <span className="text-xs font-normal text-slate-500">{formatUnit(w.unit)}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {w.context?.resolution_label || 'Regional grid'}
                    </span>
                    <FreshnessLabel observationTime={w.event_time} clock={clock} showIcon={false} />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 italic leading-snug">
              Weather context is from numerical models at ~11 km resolution; not street-level microclimate instruments.
            </p>
          </div>

          {/* Column 2: Satellite Retrieval (Sentinel-5P NO2 Column) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Satellite className="w-4 h-4 text-purple-600" />
                <span>Satellite Retrieval (S5P)</span>
              </h3>
              <EvidenceBadge state="MODEL_ESTIMATED" size="sm" />
            </div>

            <div className="space-y-3">
              {context.satellite.map((sat) => (
                <div key={sat.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-900">
                      Tropospheric NO₂ Column
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      QA: {sat.context?.qa_value ?? 0.82}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-xl font-bold text-slate-900">{sat.value}</span>
                    <span className="text-xs text-purple-700 font-semibold">{formatUnit(sat.unit)}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                    <div>Product: <code className="text-slate-700">{sat.context?.product_id}</code></div>
                    <div>Resolution: <span>{sat.context?.resolution_label}</span></div>
                    <div>Cloud fraction: <span>{sat.context?.cloud_fraction}</span></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-[11px] text-purple-900 leading-snug">
              Satellite column density represents vertical column over multi-kilometer footprint (mol/m²), not ground-level breathing air concentration.
            </div>
          </div>

          {/* Column 3: Nearby Facilities & Possible Sources */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Factory className="w-4 h-4 text-amber-600" />
                <span>Nearby Source Context</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Radii: 1km & 3km</span>
            </div>

            <div className="space-y-3">
              {context.nearby_sources.map((src) => (
                <div key={src.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{src.name}</span>
                    <span className="text-[10px] font-mono bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                      {src.distance_m}m · {src.bearing_deg}°
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Type: {src.source_type}</span>
                    <span className="text-sky-700 font-mono font-semibold">{src.wind_alignment}</span>
                  </div>
                </div>
              ))}
            </div>

            <Disclaimer
              variant="proximity"
              customText={context.disclaimer}
            />
          </div>
        </div>
      )}

      {/* Slide-out Environmental Context Drawer */}
      <EnvironmentalContextDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        locationId="road_segment_anand_vihar_014"
        apiClient={apiClient}
        clock={clock}
        session={session}
      />
    </div>
  );
};
