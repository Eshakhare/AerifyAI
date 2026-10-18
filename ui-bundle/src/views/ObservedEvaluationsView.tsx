/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Govt Actions & Verified Impact View (Revision 0.14)
 * Displays:
 * - Header: Synchronized State Selector Dropdown across 4 Focus States
 * - Tab 1: All Actions (Unified cards combining statutory directives + verified impact)
 * - Tab 2: Area Impact (Multi-Area Clean Air Impact Explorer with Multi-Select Area Filter Dropdown)
 * Purged "Detailed Sensor Audit" tab completely.
 */

import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

import { ApiClient } from '../api/ApiClient';
import {
  ClockMetadata,
  SessionInfo
} from '../contracts/types';
import { FocusStateCode, FOCUS_REGIONS, ALL_INDIAN_STATES } from '../services/multiStateRegions';
import { Disclaimer } from '../components/shared/Disclaimer';
import { GovernmentActionsRegistry } from '../components/officer/GovernmentActionsRegistry';
import { AreaImpactExplorer } from '../components/officer/AreaImpactExplorer';

interface ObservedEvaluationsViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata;
  session: SessionInfo;
}

export const ObservedEvaluationsView: React.FC<ObservedEvaluationsViewProps> = ({
  clock
}) => {
  const [activeTab, setActiveTab] = useState<'all_actions' | 'area_impact'>('all_actions');
  const [selectedState, setSelectedState] = useState<FocusStateCode>('delhi');

  const currentRegion = FOCUS_REGIONS[selectedState] || FOCUS_REGIONS.delhi;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner with State Selector Dropdown */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 p-5 rounded-2xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-900 text-xs uppercase tracking-wider font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Government Clean Air Initiatives & Verified Field Impact</span>
          </div>

          {/* Synchronized State Selector Dropdown */}
          <div className="flex items-center gap-2 bg-white/90 border border-emerald-200 rounded-xl px-3 py-1.5 shadow-xs">
            <label htmlFor="govt-state-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              State:
            </label>
            <select
              id="govt-state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value as FocusStateCode)}
              aria-label="Select State"
              className="text-xs font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer"
            >
              {ALL_INDIAN_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {currentRegion.name} Anti-Pollution Actions & Verified Field Impact
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed max-w-4xl font-medium mt-1">
            Track official government anti-pollution directives, vehicular restrictions, and verified changes in air quality across {currentRegion.shortName}.
          </p>
        </div>
      </div>

      {/* Main View Navigation Tabs (Only Tab 1 & Tab 2 - Sensor Audit purged as per Section 8.3) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all_actions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all_actions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Actions</span>
        </button>

        <button
          onClick={() => setActiveTab('area_impact')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'area_impact'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Area Impact</span>
        </button>
      </div>

      {/* TAB 1: All Actions (Multi-State Directives + Pre/Post Impact Cards) */}
      {activeTab === 'all_actions' && (
        <GovernmentActionsRegistry clock={clock} selectedState={selectedState} />
      )}

      {/* TAB 2: Multi-Area Clean Air Impact Explorer */}
      {activeTab === 'area_impact' && (
        <AreaImpactExplorer selectedState={selectedState} />
      )}

      {/* Methodology Disclaimer */}
      <Disclaimer
        variant="proximity"
        customText="Field evaluations compare air quality before and after municipal actions against contemporaneous reference areas to track verified improvements."
      />
    </div>
  );
};
