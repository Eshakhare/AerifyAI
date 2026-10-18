/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Unified Left Navigation Sidebar
 * Full-height sticky sidebar layout spanning top-to-bottom over the header.
 * Enforces Role-based item visibility, official MCD branding, platform version,
 * and authoritative dual clock.
 */

import React from 'react';
import {
  Map,
  FlaskConical,
  BarChart3,
  Shield,
  Code2,
  Building2,
  Compass,
  X,
  FileCheck2,
  CalendarDays,
  Radio,
  SlidersHorizontal
} from 'lucide-react';
import { ClockMetadata, SessionInfo } from '../../contracts/types';
import { ClockWidget } from '../shared/ClockWidget';

export type NavTab =
  | 'dashboard'
  | 'simulations'
  | 'evaluations'
  | 'officer-portal'
  | 'dev-showcase';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  session: SessionInfo | null;
  clock: ClockMetadata | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isDevModeEnabled: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  clock,
  isOpenMobile,
  onCloseMobile,
  isDevModeEnabled
}) => {
  const isOfficerOrSupervisor =
    session?.role === 'OFFICER' || session?.role === 'SUPERVISOR';

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Air Quality Dashboard',
      description: 'Near You & Delhi Map',
      icon: Map,
      visible: true
    },
    {
      id: 'evaluations' as NavTab,
      label: 'Govt Actions & Impact',
      description: 'Clean Air Directives & Measured Results',
      icon: BarChart3,
      visible: true
    },
    {
      id: 'officer-portal' as NavTab,
      label: 'Municipal Action Center',
      description: 'Field Operations & Dispatch',
      icon: Shield,
      visible: isOfficerOrSupervisor
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none border-r border-slate-800">
      {/* Brand & Authority Header */}
      <div className="p-5 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-lg">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-tight flex items-center gap-2">
                <span>Aerify AI</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Delhi Clean Air Intelligence
              </p>
            </div>
          </div>
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* MCD Active Demo Mode Pill */}
        <div className="mt-3.5 px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center gap-2 text-[11px] text-sky-300 font-semibold">
          <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">Delhi Municipal Corp (MCD) Demo</span>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Civic Navigation
        </div>

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group focus:ring-2 focus:ring-sky-500 focus:outline-hidden ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-tight truncate leading-snug">
                    {item.label}
                  </div>
                  <div
                    className={`text-[11px] font-medium truncate mt-0.5 ${
                      isActive ? 'text-sky-100' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
      </div>

      {/* Authoritative Dual Clock & Authority Footer */}
      <div className="p-4 border-t border-slate-800 shrink-0 space-y-3 bg-slate-950/60">
        <ClockWidget clock={clock} />

        <div className="space-y-1 text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span>Aerify Delhi Civic Portal</span>
          </div>
          <div className="leading-snug">
            Govt of NCT of Delhi / Municipal Clean Air Partnership
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Full Height) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay Sidebar Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
