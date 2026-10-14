/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Zone Polygon Mini Map & Cryptographic Hash Verifier
 * Renders embedded action and reference GeoJSON polygons with local SHA-256
 * geometry_hash verification matching server compact JSON.
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, MapPin, Layers, CheckCircle2, Lock } from 'lucide-react';
import { ZoneVersion } from '../../contracts/types';
import { computeGeometryHash } from '../../contracts/validator';

interface ZonePolygonMiniMapProps {
  actionZone: ZoneVersion | null;
  referenceZone: ZoneVersion | null;
  className?: string;
}

export const ZonePolygonMiniMap: React.FC<ZonePolygonMiniMapProps> = ({
  actionZone,
  referenceZone,
  className = ''
}) => {
  const [actionHashStatus, setActionHashStatus] = useState<{
    computed: string;
    matches: boolean;
  } | null>(null);

  const [referenceHashStatus, setReferenceHashStatus] = useState<{
    computed: string;
    matches: boolean;
  } | null>(null);

  useEffect(() => {
    async function verifyHashes() {
      if (actionZone?.geometry?.data) {
        const hash = await computeGeometryHash(actionZone.geometry.data);
        setActionHashStatus({
          computed: hash,
          matches: hash === actionZone.geometry_hash
        });
      } else {
        setActionHashStatus(null);
      }

      if (referenceZone?.geometry?.data) {
        const hash = await computeGeometryHash(referenceZone.geometry.data);
        setReferenceHashStatus({
          computed: hash,
          matches: hash === referenceZone.geometry_hash
        });
      } else {
        setReferenceHashStatus(null);
      }
    }

    verifyHashes();
  }, [actionZone, referenceZone]);

  // Compute dynamic bounding box for SVG projection
  const allPoints: [number, number][] = [];
  if (actionZone?.geometry?.data?.coordinates?.[0]) {
    allPoints.push(...actionZone.geometry.data.coordinates[0]);
  }
  if (referenceZone?.geometry?.data?.coordinates?.[0]) {
    allPoints.push(...referenceZone.geometry.data.coordinates[0]);
  }

  const minLng = allPoints.length > 0 ? Math.min(...allPoints.map(p => p[0])) - 0.015 : 77.02;
  const maxLng = allPoints.length > 0 ? Math.max(...allPoints.map(p => p[0])) + 0.015 : 77.34;
  const minLat = allPoints.length > 0 ? Math.min(...allPoints.map(p => p[1])) - 0.015 : 28.56;
  const maxLat = allPoints.length > 0 ? Math.max(...allPoints.map(p => p[1])) + 0.015 : 28.66;

  const projectPoint = (lng: number, lat: number, width = 600, height = 320) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 40) + 20;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * (height - 40) + 20;
    return [x, y];
  };

  const toSvgPoints = (coordinates: [number, number][][]) => {
    if (!coordinates || !coordinates[0]) return '';
    return coordinates[0]
      .map(([lng, lat]) => projectPoint(lng, lat).join(','))
      .join(' ');
  };

  return (
    <div className={`bg-slate-950 border border-slate-800 rounded-xl p-4.5 space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white text-xs">
            Dual-Zone Spatial Geometry & Pretrend Reference Match
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          EPSG:4326 · GeoJSON Polygons
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-72 rounded-lg bg-slate-900/90 border border-slate-800 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 600 320" className="w-full h-full">
          {/* Subtle Grid */}
          <defs>
            <pattern id="miniGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="600" height="320" fill="#090d16" />
          <rect width="600" height="320" fill="url(#miniGrid)" opacity="0.4" />

          {/* Reference Zone Polygon */}
          {referenceZone?.geometry?.data?.coordinates && (
            <g className="transition-all">
              <polygon
                points={toSvgPoints(referenceZone.geometry.data.coordinates)}
                fill="#8b5cf6"
                fillOpacity="0.25"
                stroke="#a78bfa"
                strokeWidth="2"
                strokeDasharray="4,3"
              />
              {referenceZone.geometry.data.coordinates[0]?.[0] && (
                <text
                  x={projectPoint(referenceZone.geometry.data.coordinates[0][0][0], referenceZone.geometry.data.coordinates[0][0][1])[0] + 5}
                  y={projectPoint(referenceZone.geometry.data.coordinates[0][0][0], referenceZone.geometry.data.coordinates[0][0][1])[1] - 8}
                  fill="#c4b5fd"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Reference: {referenceZone.name}
                </text>
              )}
            </g>
          )}

          {/* Action Zone Polygon */}
          {actionZone?.geometry?.data?.coordinates && (
            <g className="transition-all">
              <polygon
                points={toSvgPoints(actionZone.geometry.data.coordinates)}
                fill="#06b6d4"
                fillOpacity="0.35"
                stroke="#22d3ee"
                strokeWidth="2.5"
              />
              {actionZone.geometry.data.coordinates[0]?.[0] && (
                <text
                  x={projectPoint(actionZone.geometry.data.coordinates[0][0][0], actionZone.geometry.data.coordinates[0][0][1])[0] + 5}
                  y={projectPoint(actionZone.geometry.data.coordinates[0][0][0], actionZone.geometry.data.coordinates[0][0][1])[1] - 8}
                  fill="#67e8f9"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Action Zone: {actionZone.name}
                </text>
              )}
            </g>
          )}
        </svg>

        {/* Legend Overlay on Map */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 border border-slate-800 rounded-md p-2 flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 border border-cyan-300" />
            <span className="text-slate-300">Action Zone (Treated)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-300" />
            <span className="text-slate-300">Reference Zone (Pretrend Control)</span>
          </div>
        </div>
      </div>

      {/* Cryptographic SHA-256 Geometry Hash Verification Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
        {/* Action Zone Hash Card */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Action Zone Hash:</span>
            {actionHashStatus ? (
              actionHashStatus.matches ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  SHA-256 Verified
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Hash Mismatch
                </span>
              )
            ) : (
              <span className="text-[10px] text-slate-500">Checking...</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 break-all bg-slate-950 p-1.5 rounded border border-slate-850">
            {actionZone?.geometry_hash || 'No action zone loaded'}
          </div>
        </div>

        {/* Reference Zone Hash Card */}
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Reference Zone Hash:</span>
            {referenceHashStatus ? (
              referenceHashStatus.matches ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  SHA-256 Verified
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Hash Mismatch
                </span>
              )
            ) : (
              <span className="text-[10px] text-slate-500">Checking...</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 break-all bg-slate-950 p-1.5 rounded border border-slate-850">
            {referenceZone?.geometry_hash || 'No reference zone loaded'}
          </div>
        </div>
      </div>
    </div>
  );
};
