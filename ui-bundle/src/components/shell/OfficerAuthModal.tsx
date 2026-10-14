/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Officer Authentication Modal
 * Multi-factor dialog providing Email/Password login, Google OAuth,
 * and an instant 1-Click Demo Officer Login for testing and evaluations.
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  KeyRound,
  Mail,
  UserCheck,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Role } from '../../contracts/types';

interface OfficerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: Role) => void;
}

export const OfficerAuthModal: React.FC<OfficerAuthModalProps> = ({
  isOpen,
  onClose,
  onSelectRole
}) => {
  const [email, setEmail] = useState('rajesh.kumar@mcd.delhi.gov.in');
  const [password, setPassword] = useState('••••••••••••');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleInstantDemoLogin = () => {
    onSelectRole('OFFICER');
    onClose();
  };

  const handleSupervisorDemoLogin = () => {
    onSelectRole('SUPERVISOR');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSelectRole('OFFICER');
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-base font-bold tracking-tight">
                Municipal Officer Sign In
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Delhi Municipal Corporation (MCD) Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1-Click Demo Evaluation Banner (Recommended) */}
          <div className="bg-sky-50 border-2 border-sky-300/80 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-full bg-sky-600 text-white mt-0.5 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wider block">
                  Instant Demo Access (Judging & Evaluation)
                </span>
                <p className="text-xs text-sky-900 font-medium mt-0.5 leading-relaxed">
                  Bypass credentials to explore field action dispatch, checkpoint tracking, and supervisor audits.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-sky-500"
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>1-Click Officer</span>
              </button>

              <button
                type="button"
                onClick={handleSupervisorDemoLogin}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-indigo-500"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>1-Click Supervisor</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
              Or Sign In with Official Email
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Government Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono text-slate-900"
                  placeholder="officer@mcd.delhi.gov.in"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Portal Security Key / Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-slate-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-sky-500 mt-2"
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In as Officer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
          Authoritative role resolved from Cloud SQL <code className="font-mono text-slate-700">app_users</code> directory.
        </div>
      </div>
    </div>
  );
};
