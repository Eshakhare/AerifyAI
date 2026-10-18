/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Delhi Environmental Intelligence & Municipal Action Platform
 * Full-height left navigation sidebar layout, contextual header, and role-based applet workspace.
 */

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Lock } from 'lucide-react';

import { defaultApiClient, ApiClient } from './api';
import {
  ClockMetadata,
  SessionInfo,
  Role,
  AuthUser
} from './contracts/types';
import { Sidebar, NavTab } from './components/shell/Sidebar';
import { Header } from './components/shell/Header';
import { AuthModal } from './components/shell/AuthModal';
import {
  signOutFirebaseClient,
  signInWithFirebaseGoogle,
  isFirebaseClientConfigured,
  onFirebaseAuthStateChanged
} from './auth/firebase';

import { MapView } from './views/MapView';
import { ScenariosView } from './views/ScenariosView';
import { OfficerActionsView } from './views/OfficerActionsView';
import { ObservedEvaluationsView } from './views/ObservedEvaluationsView';
import { DevComponentsView } from './views/DevComponentsView';

export default function App() {
  const [apiClient] = useState<ApiClient>(defaultApiClient);
  const [clock, setClock] = useState<ClockMetadata | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [activeDistrictId, setActiveDistrictId] = useState<string | null>(null);

  // Authenticated user state
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('aerify_auth_user') || localStorage.getItem('aerify_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shell State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDevModeEnabled, setIsDevModeEnabled] = useState(false);

  const refreshSession = async () => {
    try {
      const meData = await apiClient.getMe();
      setSession(meData);
    } catch (err: any) {
      console.error('Error refreshing session:', err);
    }
  };

  useEffect(() => {
    async function initApp() {
      try {
        setLoading(true);

        // If a previously saved session exists, configure client before fetching /me
        if (authUser && authUser.role && authUser.role !== 'PUBLIC') {
          if (apiClient.setFixtureRole) {
            apiClient.setFixtureRole(authUser.role);
          }
        } else {
          if (apiClient.setFixtureRole) {
            apiClient.setFixtureRole('PUBLIC');
          }
        }

        const [meData, clockData] = await Promise.all([
          apiClient.getMe(),
          apiClient.getClock()
        ]);
        setSession(meData);
        setClock(clockData);
      } catch (err: any) {
        console.error('Aerify Platform Initialization Error:', err);
        setError(err.message || 'Failed to initialize applet');
      } finally {
        setLoading(false);
      }
    }
    initApp();

    // Listen to Firebase auth state changes in the background
    const unsubscribe = onFirebaseAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        const token = await fbUser.getIdToken().catch(() => undefined);
        let role: Role = 'PUBLIC';
        const normEmail = (fbUser.email || '').toLowerCase();
        if (normEmail.includes('dpcc') || normEmail.includes('supervisor')) {
          role = 'SUPERVISOR';
        } else if (normEmail.includes('mcd') || normEmail.includes('officer')) {
          role = 'OFFICER';
        }

        const resolvedUser: AuthUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName:
            fbUser.displayName ||
            (role === 'PUBLIC'
              ? 'Delhi Citizen'
              : role === 'SUPERVISOR'
              ? 'Dr. Sunita Rao'
              : 'Esha Khare'),
          photoURL: fbUser.photoURL,
          role,
          provider: fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'password'
        };

        setAuthUser(resolvedUser);
        localStorage.setItem('aerify_auth_user', JSON.stringify(resolvedUser));
        localStorage.setItem('aerify_google_user', JSON.stringify(resolvedUser));

        if (apiClient.loginWithCloudSql) {
          apiClient
            .loginWithCloudSql({
              email: fbUser.email || undefined,
              firebase_uid: fbUser.uid,
              display_name: fbUser.displayName || undefined,
              id_token: token,
              requested_role: role
            })
            .then((newSession) => {
              if (newSession) setSession(newSession);
            })
            .catch(() => {});
        } else if (apiClient.setFixtureRole) {
          apiClient.setFixtureRole(role);
          refreshSession();
        }
      }
    });

    return () => unsubscribe();
  }, [apiClient]);

  const handleLoginSuccess = async (user: AuthUser, updatedSession?: SessionInfo) => {
    setAuthUser(user);
    if (updatedSession) {
      setSession(updatedSession);
    } else {
      await refreshSession();
    }
  };

  const handleGoogleSignInDirect = async () => {
    if (isFirebaseClientConfigured()) {
      try {
        const fbRes = await signInWithFirebaseGoogle();
        let finalRole: Role = 'PUBLIC';
        const normEmail = (fbRes.email || '').toLowerCase();
        if (normEmail.includes('dpcc') || normEmail.includes('supervisor')) {
          finalRole = 'SUPERVISOR';
        } else if (normEmail.includes('mcd') || normEmail.includes('officer')) {
          finalRole = 'OFFICER';
        }

        let updatedSession: SessionInfo | undefined;
        if (apiClient.loginWithCloudSql) {
          try {
            updatedSession = await apiClient.loginWithCloudSql({
              email: fbRes.email || undefined,
              firebase_uid: fbRes.uid,
              display_name: fbRes.displayName || undefined,
              id_token: fbRes.idToken,
              requested_role: finalRole
            });
            if (updatedSession) setSession(updatedSession);
          } catch (e) {
            console.warn('Backend login error:', e);
          }
        } else if (apiClient.setFixtureRole) {
          apiClient.setFixtureRole(finalRole);
          await refreshSession();
        }

        const user: AuthUser = {
          uid: fbRes.uid,
          email: fbRes.email,
          displayName: fbRes.displayName || 'Delhi Citizen',
          photoURL: fbRes.photoURL,
          role: finalRole,
          provider: 'google'
        };
        setAuthUser(user);
        localStorage.setItem('aerify_auth_user', JSON.stringify(user));
        localStorage.setItem('aerify_google_user', JSON.stringify(user));
      } catch (err: any) {
        if (
          err?.code !== 'auth/popup-closed-by-user' &&
          err?.code !== 'auth/cancelled-popup-request'
        ) {
          console.error('Direct Google Sign In error:', err);
          setIsAuthModalOpen(true);
        }
      }
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleRoleChange = async (newRole: Role, updatedSession?: SessionInfo) => {
    if (updatedSession) {
      setSession(updatedSession);
    } else if (apiClient.loginWithCloudSql) {
      try {
        const emailForRole =
          newRole === 'SUPERVISOR'
            ? 'supervisor@dpcc.delhi.gov.in'
            : newRole === 'OFFICER'
            ? 'esha.khare@mcd.delhi.gov.in'
            : 'citizen@delhi.in';
        const resolved = await apiClient.loginWithCloudSql({
          email: emailForRole,
          requested_role: newRole
        });
        setSession(resolved);
      } catch {
        if (apiClient.setFixtureRole) {
          apiClient.setFixtureRole(newRole);
          await refreshSession();
        }
      }
    } else if (apiClient.setFixtureRole) {
      apiClient.setFixtureRole(newRole);
      await refreshSession();
    }
    if (newRole === 'PUBLIC' && (currentTab === 'officer-portal' || currentTab === 'simulations')) {
      setCurrentTab('dashboard');
    }
  };

  const handleSignOut = async () => {
    await signOutFirebaseClient();
    setAuthUser(null);
    localStorage.removeItem('aerify_auth_user');
    localStorage.removeItem('aerify_google_user');
    if (apiClient.setFixtureRole) {
      apiClient.setFixtureRole('PUBLIC');
    }
    await refreshSession();
    if (currentTab === 'officer-portal' || currentTab === 'simulations') {
      setCurrentTab('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex font-sans selection:bg-sky-500/20 selection:text-sky-900">
      {/* 1. Full-Height Sticky Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'dashboard') {
            setActiveDistrictId(null);
          }
        }}
        session={session}
        clock={clock}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isDevModeEnabled={isDevModeEnabled}
      />

      {/* 2. Main Canvas (Adjacent to Sidebar) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <Header
          currentTab={currentTab}
          activeDistrictName={activeDistrictId ? activeDistrictId.replace('dist_', '').replace(/_/g, ' ') : null}
          session={session}
          authUser={authUser}
          googleUser={authUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onRoleChange={handleRoleChange}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          isDevModeEnabled={isDevModeEnabled}
          onToggleDevMode={() => setIsDevModeEnabled(!isDevModeEnabled)}
          onSignOut={handleSignOut}
          onGoogleSignIn={handleGoogleSignInDirect}
        />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
          {loading && (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <Activity className="w-8 h-8 text-sky-600 animate-spin" />
              <p className="text-sm font-semibold">Connecting to Delhi Environmental Intelligence...</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-sm shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Aerify Platform Initialization Error</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && clock && session && (
            <>
              {currentTab === 'dashboard' && (
                <MapView
                  apiClient={apiClient}
                  clock={clock}
                  session={session}
                  googleUser={authUser}
                  onGoogleSignIn={handleGoogleSignInDirect}
                  activeDistrictId={activeDistrictId}
                  onSelectDistrict={setActiveDistrictId}
                />
              )}

              {currentTab === 'simulations' && (
                session.role === 'OFFICER' || session.role === 'SUPERVISOR' ? (
                  <ScenariosView apiClient={apiClient} clock={clock} session={session} />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg mx-auto text-center shadow-xs space-y-4 my-12">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">
                        Municipal Officer Access Required
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Action Impact Simulations (S01–S12) are restricted to Delhi Municipal Corporation (MCD) officers and DPCC supervisors for counterfactual policy evaluation and intervention rehearsal.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Sign In as Municipal Officer
                      </button>
                    </div>
                  </div>
                )
              )}

              {currentTab === 'evaluations' && (
                <ObservedEvaluationsView apiClient={apiClient} clock={clock} session={session} />
              )}

              {currentTab === 'officer-portal' && (
                <OfficerActionsView
                  apiClient={apiClient}
                  clock={clock}
                  session={session}
                  onRefreshSession={refreshSession}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                />
              )}

              {currentTab === 'dev-showcase' && (
                <DevComponentsView clock={clock} session={session} />
              )}
            </>
          )}
        </main>

        {/* Civic Platform Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 mt-auto">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Aerify Delhi Civic Portal</span>
            <span>•</span>
            <span>Delhi Environmental Intelligence & Municipal Action Platform</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Proximity context only — does not establish emissions causality.
          </div>
        </footer>
      </div>

      {/* Unified Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        apiClient={apiClient}
      />
    </div>
  );
}
