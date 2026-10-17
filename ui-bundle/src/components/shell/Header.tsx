/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Top Header Bar
 * Spans adjacent to the full-height left navigation sidebar.
 * Displays contextual breadcrumbs, municipal officer authentication trigger,
 * and user profile menu with demo role switching.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { SessionInfo, Role } from '../../contracts/types';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  activeDistrictName?: string | null;
  session: SessionInfo | null;
  onOpenAuthModal: () => void;
  onRoleChange: (newRole: Role) => void;
  onToggleMobileMenu: () => void;
  isDevModeEnabled: boolean;
  onToggleDevMode: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeDistrictName,
  session,
  onOpenAuthModal,
  onRoleChange,
  onToggleMobileMenu,
  isDevModeEnabled,
  onToggleDevMode,
  onSignOut
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format dynamic breadcrumb label
  const getBreadcrumbLabel = (): { root: string; sub?: string } => {
    switch (currentTab) {
      case 'dashboard':
        return {
          root: 'Air Quality Dashboard',
          sub: activeDistrictName ? `${activeDistrictName} District` : undefined
        };
      case 'evaluations':
        return { root: 'Govt Actions & Impact', sub: 'Clean Air Directives & Measured Results' };
      case 'simulations':
        return { root: 'Action Simulations', sub: 'Targeted Clean Air Suggestions' };
      case 'officer-portal':
        return { root: 'Municipal Action Center', sub: 'Field Operations & Dispatch' };
      case 'dev-showcase':
        return { root: 'Dev Component Showcase', sub: 'UI Primitives & Badges' };
      default:
        return { root: 'Aerify Delhi Civic Portal' };
    }
  };

  const breadcrumbs = getBreadcrumbLabel();
  const isOfficerOrSupervisor =
    session?.role === 'OFFICER' || session?.role === 'SUPERVISOR';

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger + Contextual Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:ring-2 focus:ring-sky-500"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-900 tracking-tight text-sm">
            {breadcrumbs.root}
          </span>
          {breadcrumbs.sub && (
            <>
              <span className="text-slate-300 font-semibold">/</span>
              <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                {breadcrumbs.sub}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Authentication or User Profile Menu */}
      <div className="flex items-center gap-3">
        {!isOfficerOrSupervisor ? (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-sky-500"
          >
            <Shield className="w-4 h-4 text-sky-400" />
            <span>Municipal Officer Sign In</span>
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-sky-500"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {session.role === 'SUPERVISOR' ? 'S' : 'O'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {session.role === 'SUPERVISOR' ? 'Dr. Sunita Rao' : 'Esha Khare'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {session.role === 'SUPERVISOR'
                    ? 'DPCC Environmental Supervisor'
                    : 'MCD Central Zone Officer'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 space-y-3 z-50 text-slate-800 animate-in fade-in duration-100">
                {/* User Details */}
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="text-xs font-extrabold text-slate-950">
                    {session.role === 'SUPERVISOR' ? 'Dr. Sunita Rao' : 'Esha Khare'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {session.role === 'SUPERVISOR'
                      ? 'DPCC Environmental Science Division'
                      : 'MCD Central Zone Municipal Operations'}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                    <CheckCircle2 className="w-3 h-3 text-sky-600" />
                    <span>Active Role: {session.role}</span>
                  </div>
                </div>

                {/* Interactive Demo Role Switcher */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Demo Role Switcher
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      onClick={() => {
                        onRoleChange('PUBLIC');
                        setProfileOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        session.role === 'PUBLIC'
                          ? 'bg-slate-100 text-slate-950 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Public Citizen</span>
                      {session.role === 'PUBLIC' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onRoleChange('OFFICER');
                        setProfileOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        session.role === 'OFFICER'
                          ? 'bg-sky-50 text-sky-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Municipal Officer (MCD)</span>
                      {session.role === 'OFFICER' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                    </button>

                    <button
                      onClick={() => {
                        onRoleChange('SUPERVISOR');
                        setProfileOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        session.role === 'SUPERVISOR'
                          ? 'bg-indigo-50 text-indigo-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Environmental Supervisor</span>
                      {session.role === 'SUPERVISOR' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                {/* Dev Mode UI Toggle */}
                <div className="border-t border-slate-100 pt-2.5">
                  <label className="flex items-center justify-between cursor-pointer text-xs font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dev Component Showcase</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isDevModeEnabled}
                      onChange={onToggleDevMode}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                    />
                  </label>
                </div>

                {/* Sign Out Action */}
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => {
                      onSignOut();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out (Return to Citizen View)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
