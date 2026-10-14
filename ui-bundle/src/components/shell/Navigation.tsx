/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Shell Navigation Bar
 * Navigation across: Map, Near You, Scenarios, Officer Actions, Observed Evaluations.
 */

import React from 'react';
import {
  Map,
  Compass,
  Layers,
  Wrench,
  LineChart,
  Lock,
  Component
} from 'lucide-react';
import { SessionInfo } from '../../contracts/types';

export type NavTab = 'map' | 'near-you' | 'scenarios' | 'officer-actions' | 'evaluations' | 'dev-components';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: SessionInfo | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  session
}) => {
  const isOfficerOrSupervisor = session?.role === 'OFFICER' || session?.role === 'SUPERVISOR';

  const tabs: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeClass?: string;
    restricted?: boolean;
  }> = [
    {
      id: 'map',
      label: 'Delhi Map',
      icon: <Map className="w-4 h-4" />
    },
    {
      id: 'near-you',
      label: 'Near You',
      icon: <Compass className="w-4 h-4" />
    },
    {
      id: 'scenarios',
      label: 'Scenarios',
      icon: <Layers className="w-4 h-4" />,
      badge: '12 Catalog',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300'
    },
    {
      id: 'officer-actions',
      label: 'Officer Actions',
      icon: <Wrench className="w-4 h-4" />,
      restricted: !isOfficerOrSupervisor
    },
    {
      id: 'evaluations',
      label: 'Observed Evaluations',
      icon: <LineChart className="w-4 h-4" />
    },
    {
      id: 'dev-components',
      label: 'UI Badges & Storybook',
      icon: <Component className="w-4 h-4" />,
      badge: 'Dev',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-300'
    }
  ];

  return (
    <nav className="border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-sky-50 text-sky-800 border border-sky-200 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${tab.badgeClass}`}>
                  {tab.badge}
                </span>
              )}
              {tab.restricted && (
                <span title="Restricted to Officer/Supervisor">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
