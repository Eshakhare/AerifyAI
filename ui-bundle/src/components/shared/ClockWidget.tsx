/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Live Real-Time Ticking IST Clock Widget (Item 7)
 * Displays a live ticking portal feed clock in Indian Standard Time (IST).
 */

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { ClockMetadata } from '../../contracts/types';

interface ClockWidgetProps {
  clock?: ClockMetadata | null;
  className?: string;
  compact?: boolean;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({
  className = '',
  compact = false
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const istTimeString = currentTime.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const istDateString = currentTime.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-xs font-mono text-slate-700 ${className}`}>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="font-semibold text-slate-900">{istTimeString} IST</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-700/80 bg-slate-800/80 p-3 text-xs text-slate-300 shadow-2xs space-y-1.5 ${className}`}
      title="Live Delhi Portal Clock (Indian Standard Time)"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Portal Feed
        </span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-slate-900 text-sky-400 font-semibold border border-slate-700">
          IST
        </span>
      </div>
      <div className="flex items-center justify-between font-mono text-[12px] pt-0.5">
        <span className="text-slate-400">Time:</span>
        <span className="font-bold text-white tracking-wide">{istTimeString}</span>
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
        <span>Date:</span>
        <span className="font-medium text-slate-300">{istDateString}</span>
      </div>
    </div>
  );
};

