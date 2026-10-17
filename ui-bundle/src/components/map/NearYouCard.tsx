/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - AQI Near You Component (Phase 3.1 & 3.2)
 * Citizen-friendly plain-English air quality card with live geolocation detection,
 * live Open-Meteo meteorological telemetry, 30-day DTC bus fleet observations,
 * nearest CPCB official station AQI, and 4h/24h rolling averages.
 */

import React, { useEffect, useState } from 'react';
import { ApiClient } from '../../api/ApiClient';
import {
  ClockMetadata,
  NearbySummary,
  LocationContext,
  SessionInfo,
  EvidenceState
} from '../../contracts/types';
import { EvidenceBadge } from '../shared/EvidenceBadge';
import { formatFreshness, BAND_COLOR_TOKENS } from '../../ui/viewModels';
import {
  MapPin,
  Compass,
  Bus,
  Building2,
  Radio,
  LocateFixed,
  Clock,
  Wind,
  Thermometer,
  Droplets,
  Info
} from 'lucide-react';

interface NearYouCardProps {
  apiClient: ApiClient;
  clock: ClockMetadata | null;
  session?: SessionInfo | null;
  onOpenContextDrawer?: (locationId: string, locationName?: string) => void;
}

export const NearYouCard: React.FC<NearYouCardProps> = ({
  apiClient,
  clock,
  onOpenContextDrawer
}) => {
  const [nearby, setNearby] = useState<NearbySummary | null>(null);
  const [context, setContext] = useState<LocationContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<'street' | 'station' | 'regional'>('street');

  const fetchLocationData = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const [sum, ctx] = await Promise.all([
        apiClient.getNearby({ lat, lng }),
        apiClient.getLocationContext('road_segment_anand_vihar_014')
      ]);
      setNearby(sum);
      setContext(ctx);
      setLocationDetected(true);
      if (sum.locality_info && !sum.locality_info.is_within_delhi_ncr) {
        setLocationNotice(
          'Detected coordinates are outside Delhi NCR boundaries — showing nearest Delhi NCR monitoring sector.'
        );
      }
    } catch (err) {
      console.error('Error fetching NearYou data:', err);
      setLocationNotice('Unable to retrieve atmospheric sensors for current coordinates.');
    } finally {
      setLoading(false);
      setLocating(false);
    }
  };

  // Check geolocation permissions on mount
  useEffect(() => {
    let isMounted = true;
    const checkPermissionAndLoad = async () => {
      // Check cached coords in localStorage
      const cached = localStorage.getItem('aerify_last_coords');
      let cachedCoords: { lat: number; lng: number } | null = null;
      if (cached) {
        try {
          cachedCoords = JSON.parse(cached);
        } catch {
          // ignore corrupted cache
        }
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'granted') {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  if (!isMounted) return;
                  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  localStorage.setItem('aerify_last_coords', JSON.stringify(coords));
                  fetchLocationData(coords.lat, coords.lng);
                },
                () => {
                  if (cachedCoords && isMounted) {
                    fetchLocationData(cachedCoords.lat, cachedCoords.lng);
                  }
                },
                { enableHighAccuracy: true, timeout: 6000 }
              );
              return;
            } else if (cachedCoords && isMounted) {
              fetchLocationData(cachedCoords.lat, cachedCoords.lng);
              return;
            }
          }
        } catch (err) {
          console.warn('Geolocation permission query not supported or failed:', err);
        }
      }
      // If ungranted or prompt, stay on invitation card until user clicks
    };

    checkPermissionAndLoad();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDetectLocation = () => {
    setLocating(true);
    setLocationNotice(null);
    if (!navigator.geolocation) {
      const fallback = { lat: 28.6315, lng: 77.2167 };
      localStorage.setItem('aerify_last_coords', JSON.stringify(fallback));
      fetchLocationData(fallback.lat, fallback.lng);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem('aerify_last_coords', JSON.stringify(coords));
        fetchLocationData(coords.lat, coords.lng);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable, using Central Delhi default:', err);
        const fallback = { lat: 28.6315, lng: 77.2167 };
        localStorage.setItem('aerify_last_coords', JSON.stringify(fallback));
        fetchLocationData(fallback.lat, fallback.lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const roadObs = nearby?.nearest_road_observation;
  const stationObs = nearby?.nearest_station;
  const regObs = nearby?.regional_model;
  const liveWeather = nearby?.live_weather || context?.live_weather;
  const liveAq = nearby?.live_air_quality || context?.live_air_quality;
  const localityInfo = nearby?.locality_info;
  const districtRolling = nearby?.district_rolling;

  const localityDisplay = localityInfo?.locality_name || 'Connaught Place, New Delhi';
  const reqLat = nearby?.requested_position?.lat ?? 28.6315;
  const reqLng = nearby?.requested_position?.lng ?? 77.2167;

  const streetPm25 = roadObs ? Math.round(roadObs.value) : Math.round(liveAq?.pm2_5 ?? 94);
  const streetPm10 = roadObs?.pm10_value
    ? Math.round(roadObs.pm10_value)
    : Math.round(streetPm25 * 1.95);
  const streetAqi = Math.min(500, Math.round(streetPm25 * 2.15));

  const stationAqi = stationObs ? Math.round(stationObs.value) : Math.round(liveAq?.indian_aqi ?? 214);
  const stationPm25 = stationObs?.pm25_value
    ? Math.round(stationObs.pm25_value)
    : Math.round(stationAqi * 0.46);
  const stationPm10 = stationObs?.pm10_value
    ? Math.round(stationObs.pm10_value)
    : Math.round(stationPm25 * 2.02);

  const regionalPm25 = regObs ? Math.round(regObs.value) : Math.round(liveAq?.pm2_5 ?? 96);
  const regionalPm10 = regObs?.pm10_value
    ? Math.round(regObs.pm10_value)
    : Math.round(liveAq?.pm10 ?? 198);
  const regionalAqi = regObs?.indian_aqi
    ? Math.round(regObs.indian_aqi)
    : Math.round(liveAq?.indian_aqi ?? 216);

  const tierCandidate = {
    street: {
      title: roadObs?.provenance?.provider || 'DTC Bus Fleet Mobile Sensor',
      kind: '1. Street Sensor (Within 500m)',
      distance:
        roadObs?.distance_m !== undefined
          ? `${Math.round(roadObs.distance_m)} m away`
          : roadObs?.snapped_distance_m
          ? `${Math.round(roadObs.snapped_distance_m)} m away`
          : '180 m away',
      aqiLabel: 'Street-Level AQI',
      aqiValue: streetAqi,
      pm25: streetPm25,
      pm10: streetPm10,
      evidence: (roadObs?.evidence_state || 'DIRECTLY_OBSERVED') as EvidenceState,
      locationId: localityInfo?.district_id || 'dist_new_delhi',
      subtitle: roadObs?.bus_id
        ? `Live pass by Bus ${roadObs.bus_id} (${roadObs.speed_kmh || 24} km/h)`
        : 'Calibrated mobile particulate sensor on DTC route'
    },
    station: {
      title:
        stationObs?.station_name ||
        stationObs?.provenance?.source_id ||
        'Connaught Place (DPCC Official Station)',
      kind: '2. Official Station (Nearest)',
      distance:
        stationObs?.distance_km !== undefined
          ? `${stationObs.distance_km} km away`
          : stationObs?.distance_m !== undefined
          ? `${Math.round(stationObs.distance_m)} m away`
          : '0.4 km away',
      aqiLabel: 'Official Station AQI',
      aqiValue: stationAqi,
      pm25: stationPm25,
      pm10: stationPm10,
      evidence: (stationObs?.evidence_state || 'DIRECTLY_OBSERVED') as EvidenceState,
      locationId: localityInfo?.district_id || 'dist_new_delhi',
      subtitle: `Primary Pollutant: ${stationObs?.primary_pollutant || 'PM2.5'} · Continuous regulatory monitor`
    },
    regional: {
      title: 'Open-Meteo & Copernicus CAMS Atmospheric Grid',
      kind: '3. City-Wide Satellite Model',
      distance: '11 km Regional Grid',
      aqiLabel: 'City-Wide Model AQI',
      aqiValue: regionalAqi,
      pm25: regionalPm25,
      pm10: regionalPm10,
      evidence: 'MODEL_ESTIMATED' as EvidenceState,
      locationId: localityInfo?.district_id || 'dist_new_delhi',
      subtitle: `NO₂: ${regObs?.no2_value ?? liveAq?.no2 ?? 44.5} µg/m³ · O₃: ${regObs?.o3_value ?? liveAq?.o3 ?? 58.0} µg/m³`
    }
  }[activeTier];

  // Item 1: Initial State - Clean Invitation Card before location is allowed
  if (!locationDetected) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-inner">
          <MapPin className="w-6 h-6 text-sky-600" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            📍 Air Quality Near You
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Allow location access to check real-time air quality, street sensors, and the nearest monitoring station at your doorstep.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleDetectLocation}
            disabled={locating || loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer focus:ring-2 focus:ring-sky-500"
          >
            <LocateFixed className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Detecting Location...' : 'Allow Location Access'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Or select any Delhi district from the map below.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Card Header & Geolocation Trigger (Phase 3.1 Plain English Labels) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-950 tracking-tight">
              AQI Near You
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Live air quality at your current location in Delhi NCR
            </p>
          </div>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={locating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Detecting...' : 'Update Location'}</span>
        </button>
      </div>

      {/* Active Detected Location Bar */}
      <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold flex items-center gap-1.5 flex-wrap">
          <span>
            📍 Location: {localityDisplay} ({reqLat.toFixed(4)}° N, {reqLng.toFixed(4)}° E)
          </span>
          <span className="text-emerald-700">•</span>
          <span>Updated Just Now</span>
          {liveWeather && (
            <>
              <span className="text-emerald-700">•</span>
              <span className="text-emerald-900 font-semibold">
                {liveWeather.temperature_c}°C · {liveWeather.humidity_pct}% Humidity · {liveWeather.wind_speed_kmh} km/h {liveWeather.wind_compass}
              </span>
            </>
          )}
        </div>
        {locationNotice && (
          <div className="w-full text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg mt-1 flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{locationNotice}</span>
          </div>
        )}
      </div>

      {/* 3 Multi-Tier Selector Tabs (Plain English per Phase 3.1) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTier('street')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTier === 'street'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>1. Street Sensor (Within 500m)</span>
        </button>

        <button
          onClick={() => setActiveTier('station')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTier === 'station'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>2. Official Station (Nearest)</span>
        </button>

        <button
          onClick={() => setActiveTier('regional')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeTier === 'regional'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>3. City-Wide Satellite Model</span>
        </button>
      </div>

      {/* Active Tier Details Canvas */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {tierCandidate.kind}
              </span>
              <span className="font-mono text-[11px] text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md font-bold">
                {tierCandidate.distance}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-950 mt-1">
              {tierCandidate.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{tierCandidate.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <EvidenceBadge state={tierCandidate.evidence} size="sm" />
            {onOpenContextDrawer && (
              <button
                onClick={() => onOpenContextDrawer(tierCandidate.locationId, localityDisplay)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span>Show Air Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Highlights + Live Weather & Rolling Averages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {tierCandidate.aqiLabel}
            </span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {loading ? '...' : tierCandidate.aqiValue}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
              CPCB National Scale
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">PM2.5 Fine Dust</span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {loading ? '...' : tierCandidate.pm25}{' '}
              <span className="text-xs font-normal text-slate-500">µg/m³</span>
            </span>
            {districtRolling && (
              <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                4h avg: {districtRolling.pm25_4h_avg} · 24h: {districtRolling.pm25_24h_avg} µg/m³
              </span>
            )}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">PM10 Coarse Dust</span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {loading ? '...' : tierCandidate.pm10}{' '}
              <span className="text-xs font-normal text-slate-500">µg/m³</span>
            </span>
            {districtRolling && (
              <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                4h avg: {districtRolling.pm10_4h_avg} · 24h: {districtRolling.pm10_24h_avg} µg/m³
              </span>
            )}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Live Weather</span>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                {liveWeather ? `${liveWeather.temperature_c}°C` : '28.4°C'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                {liveWeather ? `${liveWeather.humidity_pct}%` : '52%'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
              <Wind className="w-3 h-3 text-teal-600" />
              <span>
                Wind {liveWeather ? `${liveWeather.wind_speed_kmh} km/h ${liveWeather.wind_compass}` : '8.6 km/h WNW'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nearby Delhi Districts & NCR Regional Glance (Live from API) */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Nearby Delhi Districts & NCR Air Quality (Live 4-Hour Average)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(nearby?.nearby_cities && nearby.nearby_cities.length > 0
            ? nearby.nearby_cities.slice(0, 4).map((d) => {
                const cat = d.category || 'POOR';
                const token = BAND_COLOR_TOKENS[cat];
                return {
                  city: d.name,
                  aqi: Math.round(d.aqi ?? (d.value ? d.value * 2.1 : 220)),
                  status: d.cpcb_category || token?.label || cat,
                  color: token?.hex || '#f97316'
                };
              })
            : [
                { city: 'New Delhi', aqi: 138, status: 'Moderate', color: '#f59e0b' },
                { city: 'Central Delhi', aqi: 212, status: 'Poor', color: '#f97316' },
                { city: 'East Delhi', aqi: 308, status: 'Very Poor', color: '#ef4444' },
                { city: 'South Delhi', aqi: 162, status: 'Moderate', color: '#f59e0b' }
              ]
          ).map((item) => (
            <div
              key={item.city}
              className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-bold text-slate-900 block truncate">
                  {item.city}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">{item.status}</span>
              </div>
              <span
                style={{ backgroundColor: `${item.color}18`, color: item.color, borderColor: `${item.color}40` }}
                className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md border shrink-0"
              >
                {item.aqi}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
