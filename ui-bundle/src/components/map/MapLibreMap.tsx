/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Contiguous Delhi NCT 11-District Interactive Map (Item 2)
 * Features CartoDB Positron / OpenStreetMap base map tiles (Zero API key required)
 * rendering Delhi NCR surroundings (Yamuna River, Noida, Gurugram, Ghaziabad, expressways)
 * overlaid with the 11 contiguous Delhi revenue district polygons colored by live CPCB AQI.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapAggregate,
  ClockMetadata,
  Legend
} from '../../contracts/types';
import { BAND_COLOR_TOKENS } from '../../ui/viewModels';
import { MapTooltip } from './MapTooltip';

interface MapLibreMapProps {
  districtsGeoJson: any | null;
  aggregates: Record<string, MapAggregate>;
  activeLegend: Legend | null;
  clock: ClockMetadata | null;
  selectedDistrictId: string | null;
  onSelectDistrict: (districtId: string) => void;
  onOpenContextDrawer?: (districtId: string, districtName?: string) => void;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  districtsGeoJson,
  aggregates,
  activeLegend,
  clock,
  selectedDistrictId,
  onSelectDistrict,
  onOpenContextDrawer
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [hoveredFeature, setHoveredFeature] = useState<{
    id: string;
    name: string;
    aggregate: MapAggregate;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);

  const isOverTooltipRef = useRef(false);
  const leaveTimeoutRef = useRef<any>(null);

  const getDistrictColor = (districtId: string): string => {
    const agg = aggregates[districtId];
    if (!agg) return '#cbd5e1';
    const aqi = agg.aqi ?? (agg.metric === 'INDIAN_AQI' && agg.value ? agg.value : null);
    if (aqi !== null) {
      if (aqi <= 50) return '#10b981'; // Good
      if (aqi <= 100) return '#84cc16'; // Satisfactory
      if (aqi <= 200) return '#f59e0b'; // Moderate
      if (aqi <= 300) return '#f97316'; // Poor
      if (aqi <= 400) return '#ef4444'; // Very Poor
      return '#7f1d1d'; // Severe
    }
    if (agg.category && BAND_COLOR_TOKENS[agg.category]) {
      return BAND_COLOR_TOKENS[agg.category].hex;
    }
    return '#f97316';
  };

  // Build GeoJSON with computed properties
  const enrichedGeoJson = React.useMemo(() => {
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
            fillColor: getDistrictColor(id),
            aqi,
            label: `${(f.properties?.name || agg?.name || id).replace(' Delhi', '')}\nAQI ${aqi}`
          }
        };
      })
    };
  }, [districtsGeoJson, aggregates]);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-positron': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
        },
        layers: [
          {
            id: 'carto-positron-tiles',
            type: 'raster',
            source: 'carto-positron',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [77.1025, 28.6448], // Delhi NCT Center
      zoom: 9.8,
      minZoom: 8.5,
      maxZoom: 14
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      updateDistrictLayers(map, enrichedGeoJson);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON source when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded() && enrichedGeoJson) {
      updateDistrictLayers(map, enrichedGeoJson);
    }
  }, [enrichedGeoJson, selectedDistrictId]);

  const updateDistrictLayers = (map: maplibregl.Map, geojson: any) => {
    if (!geojson) return;

    const source = map.getSource('delhi-districts') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource('delhi-districts', {
        type: 'geojson',
        data: geojson
      });

      // Fill polygon layer with CPCB color
      map.addLayer({
        id: 'districts-fill',
        type: 'fill',
        source: 'delhi-districts',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.76
        }
      });

      // Polygon boundary borders
      map.addLayer({
        id: 'districts-outline',
        type: 'line',
        source: 'delhi-districts',
        paint: {
          'line-color': '#1e293b',
          'line-width': 1.8,
          'line-opacity': 0.85
        }
      });

      // Selected district highlight ring
      map.addLayer({
        id: 'districts-selected',
        type: 'line',
        source: 'delhi-districts',
        paint: {
          'line-color': '#0284c7',
          'line-width': 3.5,
          'line-opacity': 1
        },
        filter: ['==', ['get', 'id'], selectedDistrictId || '']
      });

      // District label symbols inside polygons
      map.addLayer({
        id: 'districts-labels',
        type: 'symbol',
        source: 'delhi-districts',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
          'text-line-height': 1.2
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      // Hover and Click events
      map.on('mousemove', 'districts-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';

        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
          leaveTimeoutRef.current = null;
        }

        const feature = e.features[0];
        const distId = feature.properties?.id;
        const agg = aggregates[distId];

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const mouseX = e.point.x;
          const mouseY = e.point.y;

          const cardWidth = 330;
          const cardHeight = 290;

          let posX = mouseX + 24;
          if (posX + cardWidth > rect.width - 16) {
            posX = mouseX - cardWidth - 24;
          }
          posX = Math.max(16, posX);

          let posY = mouseY - 40;
          if (posY + cardHeight > rect.height - 16) {
            posY = rect.height - cardHeight - 16;
          }
          posY = Math.max(16, posY);

          setTooltipPos({ x: posX, y: posY });
          if (agg) {
            setHoveredFeature({
              id: distId,
              name: feature.properties?.name || agg.name || distId,
              aggregate: agg
            });
          }
        }
      });

      map.on('mouseleave', 'districts-fill', () => {
        map.getCanvas().style.cursor = '';
        if (isPinned) return;
        leaveTimeoutRef.current = setTimeout(() => {
          if (!isOverTooltipRef.current) {
            setHoveredFeature(null);
          }
        }, 400);
      });

      map.on('click', 'districts-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const distId = e.features[0].properties?.id;
        if (distId) {
          setIsPinned(false);
          onSelectDistrict(distId);
        }
      });
    }

    // Update filter for selected district
    if (map.getLayer('districts-selected')) {
      map.setFilter('districts-selected', ['==', ['get', 'id'], selectedDistrictId || '']);
    }
  };

  const handleTooltipMouseEnter = () => {
    isOverTooltipRef.current = true;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    isOverTooltipRef.current = false;
    if (!isPinned) {
      leaveTimeoutRef.current = setTimeout(() => {
        setHoveredFeature(null);
      }, 300);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[580px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm flex items-center justify-center select-none"
    >
      {/* MapLibre WebGL Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Left Header Overlay */}
      <div className="absolute top-3.5 left-4 z-10 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-sm pointer-events-none space-y-0.5">
        <div className="font-bold text-slate-950 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Delhi NCR Air Quality Map (11 Revenue Districts)</span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          Surroundings: Yamuna River · Noida · Gurugram · Ghaziabad · Expressways
        </div>
      </div>

      {/* Floating Interactive Hover Tooltip */}
      {hoveredFeature && (
        <MapTooltip
          aggregate={hoveredFeature.aggregate}
          featureName={hoveredFeature.name}
          clock={clock}
          activeLegend={activeLegend}
          position={tooltipPos}
          isPinned={isPinned}
          onTogglePin={() => setIsPinned(!isPinned)}
          onExploreDistrict={() => onSelectDistrict(hoveredFeature.id)}
          onOpenContext={
            onOpenContextDrawer
              ? () => onOpenContextDrawer(hoveredFeature.id, hoveredFeature.name)
              : undefined
          }
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}

      {/* Bottom Map Attribution & CPCB Legend Strip */}
      <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-medium shadow-xs">
          <span>Live DTC Bus Telemetry · 40 CPCB Stations · CartoDB OpenStreetMap Base</span>
        </div>

        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] text-slate-800 font-semibold shadow-xs flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" /> Good (0–50)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#84cc16]" /> Satisfactory (51–100)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" /> Moderate (101–200)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f97316]" /> Poor (201–300)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444]" /> Very Poor (301–400)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#7f1d1d]" /> Severe (401+)
          </span>
        </div>
      </div>
    </div>
  );
};
