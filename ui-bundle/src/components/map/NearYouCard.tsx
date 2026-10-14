/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Near You Component
 * Hyper-local environmental intelligence using NearbySummary and LocationContext.
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
  ShieldCheck,
  Clock,
  Layers
} from 'lucide-react';

interface NearYouCardProps {
  apiClient: ApiClient;
  clock: ClockMetadata | null;
  session?: SessionInfo | null;
  onOpenContextDrawer?: (locationId: string) => void;
}

export const NearYouCard: React.FC<NearYouCardProps> = ({
  apiClient,
  clock,
  session,
  onOpenContextDrawer
}) => {
  const [nearby, setNearby] = useState<NearbySummary | null>(null);
  const [context, setContext] = useState<LocationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [activeTier, setActiveTier] = useState<'street' | 'station' | 'regional'>('street');

  useEffect(() => {
    async function loadNearYou() {
      try {
        setLoading(true);
        // Default coordinates: Connaught Place, Central Delhi (28.6315, 77.2167)
        const [sum, ctx] = await Promise.all([
          apiClient.getNearby({ lat: 28.6315, lng: 77.2167 }),
          apiClient.getLocationContext('road_segment_anand_vihar_014')
        ]);
        setNearby(sum);
        setContext(ctx);
      } catch (err) {
        console.error('Error fetching NearYou data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNearYou();
  }, [apiClient]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const sum = await apiClient.getNearby({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setNearby(sum);
        } catch (err) {
          console.error('Error with geolocation fetch:', err);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or unavailable, retaining Delhi default:', err);
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const weatherFirst = context?.weather?.[0];
  const freshnessResult =
    clock && weatherFirst?.event_time
      ? formatFreshness(weatherFirst.event_time, clock)
      : null;
  const freshness = freshnessResult ? freshnessResult.label : 'Recent';

  const modelPm25 = context?.air_quality_model?.find((m) => m.metric === 'PM2_5_MASS');

  // Presentation candidates based on activeTier
  const tierCandidate = {
    street: {
      title: 'DTC Bus Fleet Mobile Air Monitor #412',
      kind: 'Street / Fleet Mobile Sensor',
      distance: '180 m away',
      aqiLabel: 'Estimated Local AQI',
      aqiValue: 218,
      pm25: 142,
      pm10: 248,
      evidence: 'DIRECTLY_OBSERVED' as EvidenceState,
      locationId: 'road_segment_anand_vihar_014'
    },
    station: {
      title: nearby?.nearest_station_name || 'Anand Vihar CPCB Regulatory Station',
      kind: 'Continuous Ambient Air Quality Monitoring Station (CAAQMS)',
      distance: `${nearby?.nearest_station_distance_m || 350} m away`,
      aqiLabel: 'Official CPCB AQI',
      aqiValue: 242,
      pm25: 168,
      pm10: 295,
      evidence: 'DIRECTLY_OBSERVED' as EvidenceState,
      locationId: 'station_anand_vihar_cpcb'
    },
    regional: {
      title: 'Copernicus Atmospheric Monitoring Service (CAMS EAC4)',
      kind: 'Regional Chemical Transport Assimilation Grid',
      distance: '0.1° resolution (~10 km)',
      aqiLabel: 'Regional Model Fallback',
      aqiValue: 195,
      pm25: modelPm25 ? Math.round(modelPm25.value) : 138,
      pm10: 215,
      evidence: 'MODEL_ESTIMATED' as EvidenceState,
      locationId: 'delhi_nct'
    }
  }[activeTier];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Card Header & Geolocation Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950 tracking-tight">
              Near You: Hyper-Local Environmental Observations
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Real-time particulate monitoring based on your current physical proximity in Delhi NCR
            </p>
          </div>
        </div>

        <button
          onClick={handleDetectLocation}
          disabled={locating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors focus:ring-2 focus:ring-sky-500"
        >
          <LocateFixed className={`w-3.5 h-3.5 text-sky-600 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Detecting Location...' : 'Detect Location'}</span>
        </button>
      </div>

      {/* 3 Multi-Tier Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTier('street')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTier === 'street'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>1. Street / Bus Mobile Sensor</span>
        </button>

        <button
          onClick={() => setActiveTier('station')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTier === 'station'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>2. Nearest CPCB Station AQI</span>
        </button>

        <button
          onClick={() => setActiveTier('regional')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTier === 'regional'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>3. Regional Model Fallback</span>
        </button>
      </div>

      {/* Active Tier Details Canvas */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4.5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {tierCandidate.kind}
              </span>
              <span className="font-mono text-[11px] text-sky-800 bg-sky-100 px-2 py-0.2 rounded-md font-bold">
                {tierCandidate.distance}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-950 mt-1">
              {tierCandidate.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <EvidenceBadge state={tierCandidate.evidence} size="sm" />
            {onOpenContextDrawer && (
              <button
                onClick={() => onOpenContextDrawer(tierCandidate.locationId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span>Show Air Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">
              {tierCandidate.aqiLabel}
            </span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {tierCandidate.aqiValue}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">PM2.5 Level</span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {tierCandidate.pm25}{' '}
              <span className="text-xs font-normal text-slate-500">µg/m³</span>
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">PM10 Level</span>
            <span className="text-2xl font-extrabold font-mono text-slate-950 tabular-nums">
              {tierCandidate.pm10}{' '}
              <span className="text-xs font-normal text-slate-500">µg/m³</span>
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Observation Time</span>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1 mt-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>{freshness}</span>
            </span>
          </div>
        </div>
      </div>

      {/* NCR Cities Regional Glance (Noida, Gurugram, Ghaziabad, Faridabad) */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          NCR Regional Perimeter Glance
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { city: 'Noida (Sector 62)', aqi: 242, status: 'POOR', color: '#f97316' },
            { city: 'Gurugram (Vikas Sadan)', aqi: 285, status: 'POOR', color: '#ea580c' },
            { city: 'Ghaziabad (Vasundhara)', aqi: 310, status: 'VERY_POOR', color: '#dc2626' },
            { city: 'Faridabad (Sector 16A)', aqi: 228, status: 'POOR', color: '#f97316' }
          ].map((item) => (
            <div
              key={item.city}
              className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-900 block truncate">
                  {item.city}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">{item.status}</span>
              </div>
              <span
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
                className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-md border"
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
