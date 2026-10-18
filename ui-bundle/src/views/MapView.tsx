/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Unified Air Quality Dashboard (MapView)
 * Integrates:
 * 1. Top Section: "Near You" Hyper-Local Air Card (GPS detect, Bus Sensor, Station AQI, NCR Glance)
 * 2. Bottom Section: 11-District Delhi Map with zero-flicker hover card & transition to DistrictDetailView
 */

import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/ApiClient';
import {
  MapAggregate,
  ClockMetadata,
  Legend,
  LocationContext,
  SessionInfo
} from '../contracts/types';
import { GoogleMapView } from '../components/map/GoogleMapView';
import { DistrictDetailView } from '../components/map/DistrictDetailView';
import { NearYouCard } from '../components/map/NearYouCard';
import { EnvironmentalContextDrawer } from '../components/drawer/EnvironmentalContextDrawer';
import { VisitedPlacesCivicActions } from '../components/dashboard/VisitedPlacesCivicActions';
import {
  FOCUS_REGIONS,
  ALL_INDIAN_STATES,
  getStateDistrictsGeoJson,
  getStateAggregates,
  getStateRegion,
  FocusStateCode
} from '../services/multiStateRegions';
import { fetchStateDistrictsLiveTelemetry } from '../services/googleEnvironmentalService';
import { BAND_COLOR_TOKENS } from '../ui/viewModels';
import {
  Compass,
  Layers,
  MapPin,
  Info,
  Activity,
  AlertTriangle,
  Building,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface MapViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata | null;
  session: SessionInfo | null;
  googleUser?: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null;
  onGoogleSignIn?: () => void;
  activeDistrictId: string | null;
  onSelectDistrict: (districtId: string | null) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  apiClient,
  clock,
  session,
  googleUser,
  onGoogleSignIn,
  activeDistrictId,
  onSelectDistrict
}) => {
  const [selectedState, setSelectedState] = useState<FocusStateCode>('delhi');
  const [detectedState, setDetectedState] = useState<FocusStateCode | null>(null);
  const [hasUserManuallySelectedState, setHasUserManuallySelectedState] = useState(false);

  const [districtsGeoJson, setDistrictsGeoJson] = useState<any | null>(null);
  const [aggregates, setAggregates] = useState<Record<string, MapAggregate>>({});
  const [activeLegend, setActiveLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLocationId, setDrawerLocationId] = useState<string>('delhi_nct');
  const [drawerLocationName, setDrawerLocationName] = useState<string>('National Capital Territory of Delhi');
  const [drawerCoords, setDrawerCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [drawerContext, setDrawerContext] = useState<LocationContext | null>(null);

  // Load legend on mount
  useEffect(() => {
    async function loadLegend() {
      try {
        const legends = await apiClient.getLegends('INDIAN_AQI');
        if (legends && legends.length > 0) {
          setActiveLegend(legends[0]);
        }
      } catch (e) {
        console.warn('Failed to load legends:', e);
      }
    }
    loadLegend();
  }, [apiClient]);

  // Load authentic district GIS layers & stream live Google AQI telemetry
  useEffect(() => {
    let isCancelled = false;

    async function loadStateMapData() {
      try {
        setLoading(true);
        setError(null);

        const region = getStateRegion(selectedState);
        const initialDistrictsGeoJson = getStateDistrictsGeoJson(selectedState);
        const initialAggregates = getStateAggregates(selectedState);

        setDistrictsGeoJson(initialDistrictsGeoJson);
        setAggregates(initialAggregates);
        setLoading(false);

        // Fetch real live Google AQI telemetry for each district centroid
        fetchStateDistrictsLiveTelemetry(region.districts, (batchAggs) => {
          if (isCancelled) return;
          setAggregates((prev) => {
            const next = { ...prev, ...batchAggs };
            setDistrictsGeoJson(getStateDistrictsGeoJson(selectedState, next));
            return next;
          });
        }).catch((err) => {
          console.warn('Live district telemetry streaming notice:', err);
        });
      } catch (err: any) {
        console.error('Error loading state map layers:', err);
        setError(err.message || 'Failed to load spatial layers');
        setLoading(false);
      }
    }

    loadStateMapData();

    return () => {
      isCancelled = true;
    };
  }, [selectedState]);

  const handleStateChange = (newCode: FocusStateCode) => {
    setHasUserManuallySelectedState(true);
    setSelectedState(newCode);
    onSelectDistrict(null);
  };

  const handleResetToMyLocation = () => {
    const targetState = detectedState || 'delhi';
    setHasUserManuallySelectedState(false);
    setSelectedState(targetState);
    onSelectDistrict(null);
  };

  const handleOpenDrawer = async (locationId: string, locationName?: string, coords?: { lat: number; lng: number }) => {
    try {
      setDrawerLocationId(locationId);
      const name =
        locationName ||
        (locationId.startsWith('dist_')
          ? locationId.replace('dist_', '').replace(/_/g, ' ').toUpperCase() + ' DISTRICT'
          : locationId);
      setDrawerLocationName(name);

      let resolvedCoords = coords;
      if (!resolvedCoords) {
        const found = currentRegion?.districts.find(
          (d) => d.id === locationId || (name && d.name.toLowerCase() === name.toLowerCase())
        );
        if (found?.center) {
          resolvedCoords = found.center;
        } else if (locationId.endsWith('_state')) {
          resolvedCoords = currentRegion?.center;
        }
      }
      setDrawerCoords(resolvedCoords);
      setDrawerOpen(true);
      const ctx = await apiClient.getLocationContext(locationId);
      setDrawerContext(ctx);
    } catch (err) {
      console.error('Error fetching location context:', err);
    }
  };

  const currentRegion = FOCUS_REGIONS[selectedState];
  const selectedAgg = activeDistrictId ? aggregates[activeDistrictId] : null;
  const selectedFeature = districtsGeoJson?.features.find((f: any) => f.id === activeDistrictId);
  const selectedName = selectedFeature?.properties?.name || activeDistrictId || '';

  return (
    <div className="space-y-6">
      {/* 1. TOP SECTION: Hyper-Local "AQI Near You" Air Card (GPS detected) */}
      <NearYouCard
        apiClient={apiClient}
        clock={clock}
        session={session}
        onDetectedState={(code) => {
          if (!detectedState) {
            setDetectedState(code);
            if (!hasUserManuallySelectedState) {
              setSelectedState(code);
            }
          }
        }}
        onOpenContextDrawer={(locId, locName) => handleOpenDrawer(locId, locName || 'Monitored Sector')}
      />

      {/* 2. BOTTOM SECTION: District Detail View OR State District Map */}
      {activeDistrictId ? (
        <DistrictDetailView
          districtId={activeDistrictId}
          districtName={selectedName}
          aggregate={selectedAgg}
          activeLegend={activeLegend}
          clock={clock}
          apiClient={apiClient}
          stateCode={selectedState}
          stateName={currentRegion.name}
          onBack={() => onSelectDistrict(null)}
          onOpenReport={(coords) => handleOpenDrawer(activeDistrictId, selectedName, coords)}
        />
      ) : (
        <div className="space-y-4">
          {/* Section Header with State Selector Dropdown & Reset to My Location */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                  <Compass className="w-4 h-4" />
                </div>
                <h2 className="text-base font-extrabold text-slate-950 tracking-tight">
                  {currentRegion.name} Live Air Quality Map
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hover over any revenue district in {currentRegion.name} to inspect live CPCB AQI, PM2.5, PM10, and weather. Click a district to open its historical trend.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* State Selector Dropdown */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <label htmlFor="state-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  State:
                </label>
                <select
                  id="state-select"
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value as FocusStateCode)}
                  aria-label="Select State"
                  className="text-xs font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
                >
                  {ALL_INDIAN_STATES.map((st) => {
                    const distCount = getStateRegion(st.code).districts.length;
                    return (
                      <option key={st.code} value={st.code}>
                        {st.name} ({distCount} {distCount === 1 ? 'district' : 'districts'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reset to My Location Button */}
              <button
                onClick={handleResetToMyLocation}
                title="Reset to your detected location"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Reset to My Location</span>
              </button>

              <button
                onClick={() => handleOpenDrawer(`${selectedState}_state`, currentRegion.name, currentRegion.center)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Show Air Report</span>
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas */}
          {loading ? (
            <div className="h-[520px] rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Activity className="w-7 h-7 text-sky-600 animate-spin" />
              <p className="text-xs font-semibold">Loading {currentRegion.name} GIS layers & sensor aggregates...</p>
            </div>
          ) : error ? (
            <div className="h-[520px] rounded-2xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center p-6 text-rose-800 text-center gap-2">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
              <p className="text-sm font-bold">Failed to load spatial map layers</p>
              <p className="text-xs text-rose-600 max-w-md">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <GoogleMapView
                districtsGeoJson={districtsGeoJson}
                aggregates={aggregates}
                activeLegend={activeLegend}
                clock={clock}
                selectedDistrictId={activeDistrictId}
                center={currentRegion.center}
                zoom={currentRegion.zoom}
                onSelectDistrict={(id) => onSelectDistrict(id)}
                onOpenContextDrawer={(id, name) => handleOpenDrawer(id, name)}
              />

              {/* Categorical Bands Legend (Domain Rule 8) */}
              {activeLegend && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {activeLegend.notice || 'Standard CPCB Category Bands'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {activeLegend.source_citation || 'CPCB National Air Quality Index'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {activeLegend.bands.map((band) => {
                      const token = BAND_COLOR_TOKENS[band.id];
                      const hex = token?.hex || '#94a3b8';
                      return (
                        <div
                          key={band.id}
                          className="p-2 rounded-xl border border-slate-200/90 text-center space-y-0.5"
                          style={{ backgroundColor: `${hex}10` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full mx-auto"
                            style={{ backgroundColor: hex }}
                          />
                          <div className="text-[11px] font-bold text-slate-900">{band.label}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {band.lower_bound ?? 0}–{band.upper_bound ?? '500+'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Citizen Visited Places & Civic Actions (Phase 2 Task 3) */}
              <VisitedPlacesCivicActions
                apiClient={apiClient}
                session={session}
                googleUser={googleUser}
                onGoogleSignIn={onGoogleSignIn}
                onOpenContextDrawer={(id, name) => handleOpenDrawer(id, name)}
              />
            </div>
          )}
        </div>
      )}

      {/* Slide-out Environmental Air Report Drawer */}
      <EnvironmentalContextDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        context={drawerContext}
        locationId={drawerLocationId}
        locationName={drawerLocationName}
        coords={drawerCoords}
        stateCode={selectedState}
        stateName={currentRegion.name}
        apiClient={apiClient}
        clock={clock || undefined}
        session={session || undefined}
      />
    </div>
  );
};
