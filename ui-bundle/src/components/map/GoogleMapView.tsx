/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Google Maps Platform 11-District Interactive Map
 * Uses @vis.gl/react-google-maps to render the 11 contiguous Delhi Revenue Districts
 * with live CPCB AQI color styling via map.data.addGeoJson(), hover tooltips,
 * and Satellite/Terrain base map toggles.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  MapControl,
  ControlPosition
} from '@vis.gl/react-google-maps';
import {
  MapAggregate,
  ClockMetadata,
  Legend
} from '../../contracts/types';
import { BAND_COLOR_TOKENS } from '../../ui/viewModels';
import { MapTooltip } from './MapTooltip';
import { Layers, Mountain, Eye, ShieldCheck } from 'lucide-react';

interface GoogleMapViewProps {
  districtsGeoJson: any | null;
  aggregates: Record<string, MapAggregate>;
  activeLegend: Legend | null;
  clock: ClockMetadata | null;
  selectedDistrictId: string | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  onSelectDistrict: (districtId: string) => void;
  onOpenContextDrawer?: (districtId: string, districtName?: string) => void;
}

const getDistrictColor = (districtId: string, aggregates: Record<string, MapAggregate>): string => {
  const agg = aggregates[districtId];
  if (!agg) return '#cbd5e1';
  const aqi = agg.aqi ?? (agg.metric === 'INDIAN_AQI' && agg.value ? agg.value : null);
  if (aqi !== null) {
    if (aqi <= 50) return '#10b981'; // Good (0-50)
    if (aqi <= 100) return '#84cc16'; // Satisfactory (51-100)
    if (aqi <= 200) return '#f59e0b'; // Moderate (101-200)
    if (aqi <= 300) return '#f97316'; // Poor (201-300)
    if (aqi <= 400) return '#ef4444'; // Very Poor (301-400)
    return '#7f1d1d'; // Severe (401-500)
  }
  if (agg.category && BAND_COLOR_TOKENS[agg.category]) {
    return BAND_COLOR_TOKENS[agg.category].hex;
  }
  return '#f97316';
};

interface DistrictLayerProps {
  enrichedGeoJson: any;
  aggregates: Record<string, MapAggregate>;
  selectedDistrictId: string | null;
  onSelectDistrict: (id: string) => void;
  onHoverFeature: (feat: { id: string; name: string; aggregate: MapAggregate } | null, pos?: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const DistrictDataLayer: React.FC<DistrictLayerProps> = ({
  enrichedGeoJson,
  aggregates,
  selectedDistrictId,
  onSelectDistrict,
  onHoverFeature,
  containerRef
}) => {
  const map = useMap();

  useEffect(() => {
    const gMaps = (window as any).google?.maps;
    if (!map || !enrichedGeoJson || !gMaps?.event) return;

    // Remove any previously added features to prevent duplication
    map.data.forEach((feature: any) => {
      map.data.remove(feature);
    });

    try {
      map.data.addGeoJson(enrichedGeoJson);
    } catch (err) {
      console.warn('Error adding GeoJSON to Google Maps data layer:', err);
    }

    map.data.setStyle((feature: any) => {
      const id = feature.getId() as string;
      const isSelected = selectedDistrictId === id;
      const fillColor = feature.getProperty('fillColor') || '#f97316';

      return {
        fillColor,
        fillOpacity: isSelected ? 0.82 : 0.62,
        strokeColor: isSelected ? '#0f172a' : '#1e293b',
        strokeWeight: isSelected ? 3.5 : 1.5,
        zIndex: isSelected ? 10 : 1
      };
    });

    const mouseOverListener = map.data.addListener('mouseover', (event: any) => {
      const id = event.feature.getId() as string;
      const agg = aggregates[id];
      if (agg) {
        let x = 30;
        let y = 30;
        if (event.domEvent && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cardWidth = 340;
          const cardHeight = 310;

          // Place card to the right of cursor; if out of bounds, place to the left
          let targetX = event.domEvent.clientX - rect.left + 20;
          if (targetX + cardWidth > rect.width - 15) {
            targetX = event.domEvent.clientX - rect.left - cardWidth - 20;
          }
          x = Math.max(15, Math.min(rect.width - cardWidth, targetX));

          let targetY = event.domEvent.clientY - rect.top - 30;
          if (targetY + cardHeight > rect.height - 15) {
            targetY = rect.height - cardHeight - 15;
          }
          y = Math.max(15, targetY);
        }
        onHoverFeature(
          {
            id,
            name: event.feature.getProperty('name') || agg.name || id,
            aggregate: agg
          },
          { x, y }
        );
      }
    });

    const mouseOutListener = map.data.addListener('mouseout', () => {
      onHoverFeature(null);
    });

    const clickListener = map.data.addListener('click', (event: any) => {
      const id = event.feature.getId() as string;
      if (id) {
        onSelectDistrict(id);
      }
    });

    return () => {
      const currentGMaps = (window as any).google?.maps;
      if (currentGMaps?.event) {
        currentGMaps.event.removeListener(mouseOverListener);
        currentGMaps.event.removeListener(mouseOutListener);
        currentGMaps.event.removeListener(clickListener);
      }
    };
  }, [map, enrichedGeoJson, aggregates, selectedDistrictId, onSelectDistrict, onHoverFeature, containerRef]);

  return null;
};

const MapCameraHandler: React.FC<{ center?: { lat: number; lng: number }; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
      if (zoom) map.setZoom(zoom);
    }
  }, [map, center?.lat, center?.lng, zoom]);
  return null;
};

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  districtsGeoJson,
  aggregates,
  activeLegend,
  clock,
  selectedDistrictId,
  center,
  zoom,
  onSelectDistrict,
  onOpenContextDrawer
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapType, setMapType] = useState<string>('roadmap');
  const [hoveredFeature, setHoveredFeature] = useState<{
    id: string;
    name: string;
    aggregate: MapAggregate;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isPinned, setIsPinned] = useState(false);

  const isOverTooltipRef = useRef(false);
  const isPinnedRef = useRef(false);
  const hoverDismissTimerRef = useRef<any>(null);

  useEffect(() => {
    isPinnedRef.current = isPinned;
  }, [isPinned]);

  const handleHoverFeature = (
    feat: { id: string; name: string; aggregate: MapAggregate } | null,
    pos?: { x: number; y: number }
  ) => {
    if (feat) {
      if (hoverDismissTimerRef.current) {
        clearTimeout(hoverDismissTimerRef.current);
        hoverDismissTimerRef.current = null;
      }
      if (!isPinnedRef.current) {
        setHoveredFeature(feat);
        if (pos) setTooltipPos(pos);
      }
    } else {
      // 350ms grace period so cursor can travel freely onto the tooltip without flicker
      if (hoverDismissTimerRef.current) clearTimeout(hoverDismissTimerRef.current);
      hoverDismissTimerRef.current = setTimeout(() => {
        if (!isOverTooltipRef.current && !isPinnedRef.current) {
          setHoveredFeature(null);
        }
      }, 350);
    }
  };

  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  // Build GeoJSON with color styling and labels
  const enrichedGeoJson = useMemo(() => {
    if (!districtsGeoJson?.features) return null;
    return {
      type: 'FeatureCollection',
      features: districtsGeoJson.features.map((f: any) => {
        const id = f.id || f.properties?.id;
        const agg = aggregates[id];
        const aqi = Math.round(
          agg?.aqi ?? (agg?.value !== null && agg?.value !== undefined ? agg.value : 210)
        );
        return {
          ...f,
          id,
          properties: {
            ...f.properties,
            id,
            name: f.properties?.name || agg?.name || id,
            fillColor: getDistrictColor(id, aggregates),
            aqi,
            label: `${(f.properties?.name || agg?.name || id).replace(' Delhi', '')}\nAQI ${aqi}`
          }
        };
      })
    };
  }, [districtsGeoJson, aggregates]);


  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50"
    >
      <APIProvider apiKey={apiKey}>
        <Map
          id="delhi-nct-map"
          defaultCenter={center || { lat: 28.6139, lng: 77.2090 }}
          defaultZoom={zoom || 10.2}
          mapTypeId={mapType}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_git_agentskills_v1']}
        >
          <MapCameraHandler center={center} zoom={zoom} />

          {/* District Boundary & AQI Data Layer */}
          <DistrictDataLayer
            enrichedGeoJson={enrichedGeoJson}
            aggregates={aggregates}
            selectedDistrictId={selectedDistrictId}
            onSelectDistrict={onSelectDistrict}
            onHoverFeature={handleHoverFeature}
            containerRef={containerRef}
          />

          {/* Top-Right Basemap Mode Switcher */}
          <MapControl position={ControlPosition.TOP_RIGHT}>
            <div className="m-3 flex items-center bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl shadow-xs p-1 gap-1">
              <button
                type="button"
                onClick={() => setMapType('roadmap' as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  mapType === ('roadmap' as any)
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Roadmap</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite' as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  mapType === ('satellite' as any)
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Satellite</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType('terrain' as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  mapType === ('terrain' as any)
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Mountain className="w-3.5 h-3.5" />
                <span>Terrain</span>
              </button>
            </div>
          </MapControl>
        </Map>
      </APIProvider>

      {/* Hover Inspection Tooltip */}
      {hoveredFeature && (
        <MapTooltip
          aggregate={hoveredFeature.aggregate}
          featureName={hoveredFeature.name}
          clock={clock}
          activeLegend={activeLegend}
          position={tooltipPos}
          isPinned={isPinned}
          onExploreDistrict={() => onSelectDistrict(hoveredFeature.id)}
          onOpenContext={() => onOpenContextDrawer?.(hoveredFeature.id, hoveredFeature.name)}
          onTogglePin={() => setIsPinned(!isPinned)}
          onMouseEnter={() => {
            isOverTooltipRef.current = true;
            if (hoverDismissTimerRef.current) {
              clearTimeout(hoverDismissTimerRef.current);
              hoverDismissTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isOverTooltipRef.current = false;
            if (!isPinnedRef.current) {
              if (hoverDismissTimerRef.current) clearTimeout(hoverDismissTimerRef.current);
              hoverDismissTimerRef.current = setTimeout(() => {
                if (!isOverTooltipRef.current && !isPinnedRef.current) {
                  setHoveredFeature(null);
                }
              }, 350);
            }
          }}
        />
      )}

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-xl p-2.5 shadow-sm text-xs space-y-1.5 pointer-events-auto">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider">
            CPCB Air Quality Index
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>Good</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]"></span>Satisfactory</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>Moderate</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>Poor</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>Very Poor</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#7f1d1d]"></span>Severe</span>
        </div>
      </div>
    </div>
  );
};
