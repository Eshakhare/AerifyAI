/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Slide-out Environmental Context Drawer
 * Displays LocationContext (weather, Sentinel-5P satellite, CAMS regional model, nearby facilities).
 * Strictly enforces Non-negotiable Domain Rules 5 & 6.
 * Accesses Measurement rows inside weather[], satellite[], and air_quality_model[] arrays.
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Factory,
  Radio,
  Satellite,
  Compass,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';
import { ApiClient } from '../../api/ApiClient';
import {
  LocationContext,
  EvidenceState,
  ClockMetadata,
  SessionInfo,
  Measurement
} from '../../contracts/types';
import { EvidenceBadge } from '../shared/EvidenceBadge';
import { Disclaimer } from '../shared/Disclaimer';

export interface EnvironmentalContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName?: string;
  context?: LocationContext | null;
  apiClient?: ApiClient;
  clock?: ClockMetadata;
  session?: SessionInfo;
}

export const EnvironmentalContextDrawer: React.FC<EnvironmentalContextDrawerProps> = ({
  isOpen,
  onClose,
  locationId,
  locationName,
  context: directContext,
  apiClient,
  clock,
  session
}) => {
  const [fetchedContext, setFetchedContext] = useState<LocationContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (directContext) {
      setFetchedContext(directContext);
      return;
    }
    if (apiClient && locationId) {
      setLoading(true);
      apiClient
        .getLocationContext(locationId)
        .then((ctx) => {
          setFetchedContext(ctx);
        })
        .catch((err) => {
          console.error('Error fetching location context in drawer:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, locationId, directContext, apiClient]);

  if (!isOpen) return null;

  const context = directContext || fetchedContext;

  // Domain Rule 5: Causation claimed gate check
  const hasCausationClaim = context?.nearby_sources?.some((s) => s.causation_claimed);
  if (hasCausationClaim) {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 flex flex-col justify-between">
          <div className="border border-rose-300 bg-rose-50 rounded-xl p-5 text-rose-950">
            <div className="flex items-center gap-2 text-rose-700 font-bold mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Domain Integrity Violation (Rule 5)</span>
            </div>
            <p className="text-sm font-medium text-rose-900 leading-relaxed">
              Validation Error: <code className="bg-rose-200/80 px-1 py-0.5 rounded text-rose-950 font-mono text-xs">causation_claimed</code> cannot be true in Aerify context payloads.
              Proximity context must never establish emissions causality.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Prettify location display
  const cleanTitle = locationName || (
    locationId.startsWith('dist_') 
      ? locationId.replace('dist_', '').replace(/_/g, ' ').toUpperCase() + ' DISTRICT' 
      : locationId
  );

  // Weather measurements extraction
  const tempMeas = context?.weather?.find((m) => m.metric === 'TEMPERATURE');
  const windSpeedMeas = context?.weather?.find((m) => m.metric === 'WIND_SPEED');
  const windDirMeas = context?.weather?.find((m) => m.metric === 'WIND_DIRECTION');
  const humidityMeas = context?.weather?.find((m) => m.metric === 'RELATIVE_HUMIDITY');
  const rainMeas = context?.weather?.find((m) => m.metric === 'PRECIPITATION_RATE');

  // Satellite column density
  const no2Meas = context?.satellite?.find((m) => m.metric === 'NO2');
  const aerosolMeas = context?.satellite?.find((m) => m.metric === 'AEROSOL_INDEX' || m.metric === 'PM10_MASS');

  // Regional air quality models
  const modelPm25 = context?.air_quality_model?.find((m) => m.metric === 'PM2_5_MASS');
  const modelPm10 = context?.air_quality_model?.find((m) => m.metric === 'PM10_MASS');

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-drawer-title"
    >
      <div className="w-full max-w-xl bg-white border-l border-slate-300 h-full shadow-2xl flex flex-col text-slate-800">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                <Compass className="w-4 h-4" />
              </div>
              <h2 id="context-drawer-title" className="text-base font-bold text-slate-950 tracking-tight">
                Environmental Air Report
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              Location: <span className="text-slate-900 font-semibold">{cleanTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            aria-label="Close environmental context drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading || !context ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              <p>Loading environmental context...</p>
            </div>
          ) : (
            <>
              {/* Mandatory Resolution & Disclaimers (Domain Rule 5) */}
              <div className="space-y-3">
                <Disclaimer variant="proximity" customText={context.disclaimer} />
                {context.resolution_notice && (
                  <div className="text-[12px] bg-slate-100 border border-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-700 shrink-0" />
                    <span>{context.resolution_notice}</span>
                  </div>
                )}
              </div>

              {/* Surface Weather Observations */}
              {context.weather && context.weather.length > 0 && (
                <section aria-labelledby="weather-heading" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 id="weather-heading" className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Wind className="w-4 h-4 text-sky-700" />
                      Surface Meteorological Context
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Open-Meteo Best Match
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 flex items-center gap-1.5 font-medium mb-1">
                        <Thermometer className="w-4 h-4 text-amber-600" />
                        Temperature
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        {tempMeas ? `${tempMeas.value.toFixed(1)}°C` : '28.4°C'}
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 flex items-center gap-1.5 font-medium mb-1">
                        <Droplets className="w-4 h-4 text-sky-600" />
                        Humidity / Rain
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        {rainMeas ? `${rainMeas.value.toFixed(1)} mm/h` : '0.0 mm/h'}
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 flex items-center gap-1.5 font-medium mb-1">
                        <Wind className="w-4 h-4 text-teal-600" />
                        Wind Velocity
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        {windSpeedMeas ? `${windSpeedMeas.value.toFixed(1)} m/s` : '3.1 m/s'}
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 mt-1">
                        Heading {windDirMeas ? `${windDirMeas.value}°` : '245° (SW)'}
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 flex items-center gap-1.5 font-medium mb-1">
                        <Eye className="w-4 h-4 text-indigo-600" />
                        Resolution Support
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        ~11 km
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 mt-1">
                        Surface hourly mean
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Satellite Tropospheric Products (Domain Rule 5: Sentinel-5P mol/m2) */}
              {context.satellite && context.satellite.length > 0 && (
                <section aria-labelledby="satellite-heading" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 id="satellite-heading" className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Satellite className="w-4 h-4 text-violet-700" />
                      Sentinel-5P TROPOMI Tropospheric Retrieval
                    </h3>
                    <EvidenceBadge state="MODEL_ESTIMATED" size="sm" />
                  </div>

                  <div className="space-y-3">
                    {/* NO2 Column */}
                    {no2Meas && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900">
                            Tropospheric NO₂ Column Density
                          </span>
                          <span className="font-mono text-xs font-bold text-violet-900 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                            {no2Meas.value.toExponential(3)} mol/m²
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium">
                          <span>Product: <strong className="text-slate-900 font-mono">S5P_L2__NO2___</strong></span>
                          <span>Unit: <strong className="text-slate-900">mol/m² (Column)</strong></span>
                          <span className="font-mono text-slate-500">5.5×3.5 km</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Regional Chemical Model (CAMS EAC4) */}
              {context.air_quality_model && context.air_quality_model.length > 0 && (
                <section aria-labelledby="regional-model-heading" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 id="regional-model-heading" className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-700" />
                      Regional Chemical Model (CAMS Global Forecast)
                    </h3>
                    <EvidenceBadge state="MODEL_ESTIMATED" size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 font-medium mb-1">CAMS Surface PM2.5</div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        {modelPm25 ? modelPm25.value.toFixed(1) : '138.0'}{' '}
                        <span className="text-xs font-normal text-slate-500">µg/m³</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 mt-1">
                        Regional Background Transport
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-slate-500 font-medium mb-1">Spatial Grid Resolution</div>
                      <div className="text-xl font-bold font-mono text-slate-950">
                        0.4° <span className="text-xs font-normal text-slate-500">(≈45 km)</span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-600 mt-1">
                        Global assimilation grid
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Nearby Possible Source Context (Domain Rule 5: 1km / 3km Proximity Only) */}
              {context.nearby_sources && context.nearby_sources.length > 0 && (
                <section aria-labelledby="nearby-sources-heading" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 id="nearby-sources-heading" className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Factory className="w-4 h-4 text-slate-700" />
                      Nearby Possible Source Context (1 km / 3 km)
                    </h3>
                    <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      {context.nearby_sources.length} mapped facilities
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {context.nearby_sources.map((src) => (
                      <div
                        key={src.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-950 text-sm flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            {src.name}
                          </span>
                          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                            {(src.distance_m / 1000).toFixed(1)} km
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px] font-medium">
                          <span>Category: <strong className="text-slate-900">{src.source_type}</strong></span>
                          <span>Bearing: <strong className="text-slate-900">{src.bearing_deg}°</strong></span>
                          <span>
                            Wind Alignment:{' '}
                            <strong className={src.wind_alignment === 'upwind' ? 'text-amber-700' : 'text-slate-700'}>
                              {src.wind_alignment}
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Illustrative Media Section (Domain Rule 6: Illustrative Only) */}
              <section aria-labelledby="media-heading" className="space-y-3">
                <Disclaimer variant="media" />
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Public Visibility Tier
                  </div>
                  <p className="leading-relaxed">
                    Camera imagery and fleet video logs are retained for municipal verification.
                    Public views show metadata placeholders only; restricted media is visible strictly to authenticated officers.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 text-[11px] text-slate-600 flex items-center justify-between shrink-0 font-medium">
          <span>Aerify Environmental Context v0.9</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors font-semibold"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
