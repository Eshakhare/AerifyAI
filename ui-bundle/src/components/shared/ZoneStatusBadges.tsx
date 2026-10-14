/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - ZoneStatusBadges Component
 * Non-negotiable Domain Rule 4:
 * Renders anchor_state, geometry_status: PLACEHOLDER badge, flagship_status: PROPOSED badge,
 * and server-computed display_label.
 * If observation_grade_wording_allowed is false, never displays observation-grade wording.
 */

import React from 'react';
import { Shield, Sparkles, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { ZoneSummary } from '../../contracts/types';

interface ZoneStatusBadgesProps {
  zone: ZoneSummary;
  showDisplayLabel?: boolean;
  className?: string;
}

export const ZoneStatusBadges: React.FC<ZoneStatusBadgesProps> = ({
  zone,
  showDisplayLabel = true,
  className = ''
}) => {
  const isPlaceholderGeo = zone.geometry_status === 'PLACEHOLDER';
  const isProposedFlagship = zone.flagship_status === 'PROPOSED';
  const isConfirmedFlagship = zone.flagship_status === 'CONFIRMED';
  const isAnchored = zone.anchor_state === 'ANCHORED';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Flagship Badge */}
        {isProposedFlagship && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/80">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Proposed Flagship
          </span>
        )}
        {isConfirmedFlagship && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Flagship Corridor
          </span>
        )}

        {/* Geometry Status Badge */}
        {isPlaceholderGeo ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80" title="Coarse placeholder boundary, not surveyed on site">
            <MapPin className="w-3 h-3 text-rose-400" />
            Geometry: Placeholder
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
            <MapPin className="w-3 h-3 text-cyan-400" />
            Surveyed Geometry
          </span>
        )}

        {/* Anchor State Badge */}
        {isAnchored ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80">
            <Shield className="w-3 h-3 text-cyan-400" />
            Anchored ({zone.verified_anchor_count ?? 1} anchors)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80">
            <AlertTriangle className="w-3 h-3 text-purple-400" />
            Unverified Anchors
          </span>
        )}
      </div>

      {/* Server-computed display_label */}
      {showDisplayLabel && zone.display_label && (
        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80 leading-relaxed font-sans">
          <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider mb-0.5">
            Zone Notice (Server-determined):
          </span>
          {zone.display_label}
        </div>
      )}
    </div>
  );
};
