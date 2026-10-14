/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - HatchedNoData Component
 * Non-negotiable Domain Rule 3:
 * no_data and stale areas use a diagonal hatch pattern and the text "No recent data".
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface HatchedNoDataProps {
  label?: string;
  sublabel?: string;
  heightClass?: string;
  className?: string;
}

export const HatchedNoData: React.FC<HatchedNoDataProps> = ({
  label = 'No recent data',
  sublabel = 'Measurement threshold not met or observations stale',
  heightClass = 'h-24',
  className = ''
}) => {
  return (
    <div
      role="status"
      aria-label={`${label} - ${sublabel}`}
      className={`relative w-full rounded-lg border border-slate-700/80 overflow-hidden flex items-center justify-center ${heightClass} ${className}`}
    >
      {/* Diagonal Hatch SVG Pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-25 text-slate-500"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="diagonalHatch"
            width="10"
            height="10"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="currentColor"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonalHatch)" />
      </svg>

      {/* Center Label Pill */}
      <div className="relative z-10 bg-slate-900/95 border border-slate-700 px-3 py-1.5 rounded-md shadow-md text-center max-w-xs">
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-300">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{label}</span>
        </div>
        {sublabel && (
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
};
