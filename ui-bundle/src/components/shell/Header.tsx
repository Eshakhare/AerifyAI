/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Top Header Bar
 * Spans adjacent to the full-height left navigation sidebar.
 * Displays contextual breadcrumbs and a unified authentication trigger / user profile menu.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  User,
  LogOut,
  CheckCircle2,
  Shield,
  Building2,
  LogIn
} from 'lucide-react';
import { SessionInfo, Role, AuthUser } from '../../contracts/types';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  activeDistrictName?: string | null;
  session: SessionInfo | null;
  authUser?: AuthUser | null;
  googleUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onOpenAuthModal: () => void;
  onGoogleSignIn?: () => void;
  onGoogleSignOut?: () => void;
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
  authUser,
  googleUser,
  onOpenAuthModal,
  onToggleMobileMenu,
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

  // Determine current active user info
  const effectiveUser = authUser || (googleUser ? {
    uid: 'google_user',
    email: googleUser.email || null,
    displayName: googleUser.displayName || 'Delhi Citizen',
    photoURL: googleUser.photoURL || null,
    role: session?.role || 'PUBLIC',
    provider: 'google' as const
  } : null);

  // User is considered logged in if effectiveUser exists OR session has an elevated role (OFFICER / SUPERVISOR)
  const isLoggedIn = Boolean(
    effectiveUser ||
    (session && session.role !== 'PUBLIC')
  );

  const userRole: Role = effectiveUser?.role || session?.role || 'PUBLIC';
  const displayName = effectiveUser?.displayName || (
    userRole === 'SUPERVISOR'
      ? 'Dr. Sunita Rao'
      : userRole === 'OFFICER'
      ? 'Esha Khare'
      : session?.display_name || 'Delhi Citizen'
  );
  const email = effectiveUser?.email || (
    userRole === 'SUPERVISOR'
      ? 'supervisor@dpcc.delhi.gov.in'
      : userRole === 'OFFICER'
      ? 'esha.khare@mcd.delhi.gov.in'
      : 'citizen@delhi.in'
  );
  const photoURL = effectiveUser?.photoURL;

  const getRoleBadge = () => {
    if (userRole === 'SUPERVISOR') {
      return {
        label: 'DPCC Supervisor',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dotClass: 'bg-indigo-600',
        avatarBg: 'bg-indigo-600'
      };
    }
    if (userRole === 'OFFICER') {
      return {
        label: 'MCD Field Officer',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-600',
        avatarBg: 'bg-sky-600'
      };
    }
    return {
      label: 'Verified Citizen',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dotClass: 'bg-emerald-600',
      avatarBg: 'bg-emerald-600'
    };
  };

  const roleMeta = getRoleBadge();

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
      <div className="flex items-center gap-2.5">
        {isLoggedIn ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-lg ${roleMeta.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {displayName}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {roleMeta.label}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 space-y-3 z-50 text-slate-800 animate-in fade-in duration-100">
                <div className="pb-1 border-b border-slate-100">
                  <div className="text-xs font-extrabold text-slate-950 flex items-center gap-1.5">
                    <span>{displayName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono truncate">
                    {email}
                  </div>
                  <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleMeta.badgeClass}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified {roleMeta.label}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-sky-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
