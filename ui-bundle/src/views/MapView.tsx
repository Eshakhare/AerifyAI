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
import { BAND_COLOR_TOKENS } from '../ui/viewModels';
import {
  Compass,
  Layers,
  MapPin,
  Info,
  Activity,
  AlertTriangle,
  Building,
  ShieldCheck
} from 'lucide-react';

interface MapViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata | null;
  session: SessionInfo | null;
  activeDistrictId: string | null;
  onSelectDistrict: (districtId: string | null) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  apiClient,
  clock,
  session,
  activeDistrictId,
  onSelectDistrict
}) => {
  const [districtsGeoJson, setDistrictsGeoJson] = useState<any | null>(null);
  const [aggregates, setAggregates] = useState<Record<string, MapAggregate>>({});
  const [activeLegend, setActiveLegend] = useState<Legend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLocationId, setDrawerLocationId] = useState<string>('delhi_nct');
  const [drawerLocationName, setDrawerLocationName] = useState<string>('National Capital Territory of Delhi');
  const [drawerContext, setDrawerContext] = useState<LocationContext | null>(null);

  useEffect(() => {
    async function loadMapData() {
      try {
        setLoading(true);
        // Load city aggregates & legend
        const [aggsList, legends] = await Promise.all([
          apiClient.getCityOverview('INDIAN_AQI'),
          apiClient.getLegends('INDIAN_AQI')
        ]);

        const aggsMap: Record<string, MapAggregate> = {};
        const features: any[] = [];

        aggsList.forEach((agg) => {
          aggsMap[agg.id] = agg;
          if (agg.geometry) {
            features.push({
              type: 'Feature',
              id: agg.id,
              properties: { name: agg.name },
              geometry: agg.geometry
            });
          }
        });

        setAggregates(aggsMap);
        setDistrictsGeoJson({
          type: 'FeatureCollection',
          features
        });

        if (legends && legends.length > 0) {
          setActiveLegend(legends[0]);
        }
      } catch (err: any) {
        console.error('Error loading MapView data:', err);
        setError(err.message || 'Failed to load Delhi map layers');
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, [apiClient]);

  const handleOpenDrawer = async (locationId: string, locationName?: string) => {
    try {
      setDrawerLocationId(locationId);
      setDrawerLocationName(
        locationName ||
          (locationId.startsWith('dist_')
            ? locationId.replace('dist_', '').replace(/_/g, ' ').toUpperCase() + ' DISTRICT'
            : locationId)
      );
      setDrawerOpen(true);
      const ctx = await apiClient.getLocationContext(locationId);
      setDrawerContext(ctx);
    } catch (err) {
      console.error('Error fetching location context:', err);
    }
  };

  const selectedAgg = activeDistrictId ? aggregates[activeDistrictId] : null;
  const selectedFeature = districtsGeoJson?.features.find((f: any) => f.id === activeDistrictId);
  const selectedName = selectedFeature?.properties?.name || activeDistrictId || '';

  return (
    <div className="space-y-6">
      {/* 1. TOP SECTION: Hyper-Local "AQI Near You" Air Card */}
      <NearYouCard
        apiClient={apiClient}
        clock={clock}
        session={session}
        onOpenContextDrawer={(locId, locName) => handleOpenDrawer(locId, locName || 'Monitored Sector')}
      />

      {/* 2. BOTTOM SECTION: District Detail View OR Delhi 11-District Map */}
      {activeDistrictId ? (
        <DistrictDetailView
          districtId={activeDistrictId}
          districtName={selectedName}
          aggregate={selectedAgg}
          activeLegend={activeLegend}
          clock={clock}
          apiClient={apiClient}
          onBack={() => onSelectDistrict(null)}
          onOpenReport={() => handleOpenDrawer(activeDistrictId, selectedName)}
        />
      ) : (
        <div className="space-y-4">
          {/* Section Header */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                  <Compass className="w-4 h-4" />
                </div>
                <h2 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Delhi NCT 11-District Live Air Quality Map
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hover over any revenue district to inspect live CPCB AQI, PM2.5, PM10, and weather. Click a district to open its 4h/24h breakdown.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenDrawer('delhi_nct', 'National Capital Territory of Delhi')}
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
              <p className="text-xs font-semibold">Loading Delhi GIS layers & sensor aggregates...</p>
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
        apiClient={apiClient}
        clock={clock || undefined}
        session={session || undefined}
      />
    </div>
  );
};
