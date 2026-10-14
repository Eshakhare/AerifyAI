/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - CapabilityGuard Component
 * Non-negotiable Domain Rule 10:
 * Enforces role capability checks from SessionInfo.capabilities.
 * Unauthorized actions show a clear denial state, NOT hidden errors or silent failures.
 */

import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { Capability, SessionInfo } from '../../contracts/types';

interface CapabilityGuardProps {
  requiredCapability: Capability;
  session: SessionInfo | null;
  children: React.ReactNode;
  fallbackMode?: 'banner' | 'hidden';
  actionName?: string;
}

export const CapabilityGuard: React.FC<CapabilityGuardProps> = ({
  requiredCapability,
  session,
  children,
  fallbackMode = 'banner',
  actionName = 'This action'
}) => {
  const hasCapability = session?.capabilities.includes(requiredCapability);

  if (hasCapability) {
    return <>{children}</>;
  }

  if (fallbackMode === 'hidden') {
    return null;
  }

  return (
    <div
      role="alert"
      className="p-3.5 rounded-lg border border-amber-800/80 bg-amber-950/40 text-amber-200 text-xs flex items-start gap-2.5 my-2"
    >
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-amber-300 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
          <Lock className="w-3 h-3" />
          Access Denied · Capability Required
        </div>
        <p className="mt-0.5 text-xs text-amber-200/90 leading-snug">
          {actionName} requires municipal capability <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">{requiredCapability}</code>.
          Current session role <strong className="text-white">{session?.role || 'ANONYMOUS'}</strong> does not grant this capability.
        </p>
      </div>
    </div>
  );
};
