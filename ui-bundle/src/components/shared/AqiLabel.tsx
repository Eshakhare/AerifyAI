/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - AqiLabel Component
 * Non-negotiable Domain Rule 1:
 * Never call a PM-only value "Official CPCB AQI".
 * Derives title strictly from AqiDerivation.kind:
 * - regulatory_cpcb_aqi -> "Official CPCB AQI"
 * - estimated_local_aqi -> "Estimated Local AQI"
 * - pm_based_air_quality_indicator -> "PM-based Air Quality Indicator"
 * - pollutant_subindex -> "<pollutant> sub-index"
 * If data_sufficiency_status !== 'sufficient', displays insufficiency reason instead of value.
 */

import React from 'react';
import { AlertCircle, ShieldCheck, Gauge } from 'lucide-react';
import { AqiDerivation } from '../../contracts/types';
import { getAqiLabel } from '../../ui/viewModels';

interface AqiLabelProps {
  derivation: AqiDerivation;
  value?: number | null;
  className?: string;
  showCategoryBadge?: boolean;
}

export const AqiLabel: React.FC<AqiLabelProps> = ({
  derivation,
  value = null,
  className = ''
}) => {
  const label = getAqiLabel(derivation);
  const isSufficient = derivation.data_sufficiency_status === 'sufficient';

  const isOfficial = derivation.kind === 'regulatory_cpcb_aqi';

  return (
    <div className={`inline-flex flex-col space-y-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        {isOfficial ? (
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        )}
        <span className="text-xs font-semibold text-slate-200">
          {label}
        </span>
        {isOfficial && (
          <span className="text-[9px] font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 py-0.2 rounded">
            CPCB Station
          </span>
        )}
      </div>

      {!isSufficient ? (
        <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-1 rounded">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-[11px]">
            {derivation.insufficiency_reason || 'Insufficient pollutant parameters for CPCB NAQI calculation'}
          </span>
        </div>
      ) : (
        value !== null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {Math.round(value)}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              Index value
            </span>
          </div>
        )
      )}
    </div>
  );
};
