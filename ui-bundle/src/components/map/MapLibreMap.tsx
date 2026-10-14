/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Map Component (MapLibre with SVG High-Accuracy Spatial Renderer)
 * Renders 11 Delhi Revenue Districts with zero-flicker hover bridge, pinned card support,
 * and high-contrast styling.
 */

import React, { useRef, useState } from 'react';
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
  onOpenContextDrawer?: (districtId: string) => void;
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
  const [hoveredFeature, setHoveredFeature] = useState<{
    id: string;
    name: string;
    aggregate: MapAggregate;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinned, setIsPinned] = useState(false);

  // Safety timer to prevent instant card disappearance when moving cursor from district to card
  const leaveTimeoutRef = useRef<any>(null);
  const isOverTooltipRef = useRef(false);

  const getDistrictColor = (districtId: string): string => {
    const agg = aggregates[districtId];
    if (!agg || !agg.category) return '#cbd5e1';
    const token = BAND_COLOR_TOKENS[agg.category];
    return token?.hex || '#94a3b8';
  };

  const handleDistrictMouseEnter = (
    e: React.MouseEvent<SVGPolygonElement>,
    feature: any,
    aggregate: MapAggregate
  ) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    if (isPinned && hoveredFeature?.id === feature.id) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Position card comfortably offset to the right or left of cursor
      const cardWidth = 320;
      const cardHeight = 260;

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
      setHoveredFeature({
        id: feature.id,
        name: feature.properties?.name || feature.id,
        aggregate
      });
    }
  };

  const handleDistrictMouseLeave = () => {
    if (isPinned) return;
    leaveTimeoutRef.current = setTimeout(() => {
      if (!isOverTooltipRef.current) {
        setHoveredFeature(null);
      }
    }, 400); // 400ms grace window for user to cross hover gap into the card
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

  const handleDistrictClick = (districtId: string) => {
    setIsPinned(false);
    onSelectDistrict(districtId);
  };

  // Convert GeoJSON bounding box to SVG viewBox coordinates
  // Delhi approx bounding box: [76.84, 28.40, 77.35, 28.88]
  const minLng = 76.84;
  const maxLng = 77.36;
  const minLat = 28.40;
  const maxLat = 28.89;

  const projectPoint = (lng: number, lat: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 50;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 700 + 50;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner flex items-center justify-center select-none"
    >
      {/* Background Grid Pattern & Ambient Civic Rings */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* SVG Vector Map Rendering */}
      {districtsGeoJson && (
        <svg
          viewBox="0 0 800 800"
          className="w-full h-full max-w-[650px] max-h-[650px] p-2 drop-shadow-2xl transition-all"
        >
          <defs>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.4" />
            </filter>
          </defs>

          {districtsGeoJson.features.map((feature: any) => {
            const districtId = feature.id;
            const agg = aggregates[districtId];
            const isSelected = selectedDistrictId === districtId;
            const isHovered = hoveredFeature?.id === districtId;
            const fillColor = getDistrictColor(districtId);

            // Coordinates are polygon rings
            const coordinates = feature.geometry.coordinates[0];
            const pointsString = coordinates
              .map(([lng, lat]: [number, number]) => projectPoint(lng, lat))
              .join(' ');

            return (
              <g key={districtId} className="cursor-pointer group">
                <polygon
                  points={pointsString}
                  fill={fillColor}
                  fillOpacity={isSelected ? 0.95 : isHovered ? 0.9 : 0.8}
                  stroke={isSelected ? '#38bdf8' : isHovered ? '#ffffff' : '#0f172a'}
                  strokeWidth={isSelected ? '3.5' : isHovered ? '2.5' : '1.5'}
                  strokeLinejoin="round"
                  className="transition-all duration-150"
                  onMouseEnter={(e) => agg && handleDistrictMouseEnter(e, feature, agg)}
                  onMouseLeave={handleDistrictMouseLeave}
                  onClick={() => handleDistrictClick(districtId)}
                />
                {/* District Label in Center */}
                {feature.properties?.name && (
                  <text
                    x={
                      coordinates.reduce(
                        (acc: number, p: any) =>
                          acc + ((p[0] - minLng) / (maxLng - minLng)) * 700 + 50,
                        0
                      ) / coordinates.length
                    }
                    y={
                      coordinates.reduce(
                        (acc: number, p: any) =>
                          acc + ((maxLat - p[1]) / (maxLat - minLat)) * 700 + 50,
                        0
                      ) / coordinates.length
                    }
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    pointerEvents="none"
                    className="drop-shadow-md select-none tracking-tight"
                  >
                    {feature.properties.name.replace(' Delhi', '')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

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
            onOpenContextDrawer ? () => onOpenContextDrawer(hoveredFeature.id) : undefined
          }
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}

      {/* Map Attribution & Authority Tag */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-medium flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Delhi NCT Revenue Boundaries · Server MapAggregate Bands</span>
      </div>
    </div>
  );
};
