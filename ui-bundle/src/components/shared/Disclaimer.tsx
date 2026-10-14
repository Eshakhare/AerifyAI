/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Disclaimer Component
 * Non-negotiable Domain Rules 4, 5, 6:
 * Explicit notices for synthetic scenarios, camera/video illustrative media,
 * and proximity context.
 * Authoritative, high-contrast civic styling for Light UI.
 */

import React from 'react';
import { AlertCircle, Camera, Compass, Info, ShieldAlert } from 'lucide-react';

export type DisclaimerVariant = 'synthetic' | 'media' | 'proximity' | 'station_only' | 'info';

interface DisclaimerProps {
  variant: DisclaimerVariant;
  customText?: string;
  className?: string;
  compact?: boolean;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({
  variant,
  customText,
  className = '',
  compact = false
}) => {
  switch (variant) {
    case 'synthetic':
      return (
        <div
          role="note"
          aria-label="Synthetic Demonstration Notice"
          className={`flex items-start gap-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 shadow-xs ${className}`}
        >
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-amber-950 block mb-0.5">
              Synthetic Demonstration
            </span>
            <span className="text-amber-900 font-medium">
              {customText ||
                'Synthetic demonstration based on historical PM observations and contextual models. Not an empirical measurement.'}
            </span>
          </div>
        </div>
      );

    case 'media':
      return (
        <div
          role="note"
          aria-label="Illustrative Media Notice"
          className={`flex items-start gap-3 p-3.5 rounded-xl border border-sky-300 bg-sky-50/90 text-sky-950 shadow-xs ${className}`}
        >
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800 shrink-0">
            <Camera className="w-4 h-4 shrink-0" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-sky-950 block mb-0.5">
              Illustrative Media Record
            </span>
            <span className="text-sky-900 font-medium">
              {customText || 'Illustrative media only - does not measure AQI or verify impact.'}
            </span>
          </div>
        </div>
      );

    case 'proximity':
      return (
        <div
          role="note"
          aria-label="Proximity Context Disclaimer"
          className={`flex items-start gap-3 p-3.5 rounded-xl border border-slate-300 bg-slate-100/90 text-slate-900 shadow-xs ${className}`}
        >
          <div className="p-1.5 rounded-lg bg-slate-200 text-slate-800 shrink-0">
            <Compass className="w-4 h-4 shrink-0" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-slate-900 block mb-0.5">
              Proximity Context
            </span>
            <span className="text-slate-800 font-medium">
              {customText ||
                'Proximity context only — does not establish emissions causality.'}
            </span>
          </div>
        </div>
      );

    case 'station_only':
      return (
        <div
          role="note"
          aria-label="Official Station AQI Requirement"
          className={`flex items-start gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/90 text-indigo-950 text-xs shadow-xs ${className}`}
        >
          <ShieldAlert className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
          <span className="font-medium">
            {customText ||
              'Official CPCB AQI is reported only for regulatory stations measuring mandatory criteria pollutants.'}
          </span>
        </div>
      );

    case 'info':
    default:
      return (
        <div
          role="note"
          className={`flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs shadow-xs ${className}`}
        >
          <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
          <span className="font-medium text-slate-700">{customText}</span>
        </div>
      );
  }
};
