/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - EvidenceBadge Component
 * Non-negotiable Domain Rule 2:
 * Every value, cell, road and chart series shows a badge from EvidenceState:
 * DIRECTLY_OBSERVED (green), OBSERVED_NEARBY (blue), MODEL_ESTIMATED (purple),
 * SYNTHETIC (amber), INSUFFICIENT_EVIDENCE (slate, hatched).
 * Colour is NEVER the only cue: always includes icon + explicit text.
 */

import React from 'react';
import {
  CheckCircle2,
  Radio,
  Cpu,
  FlaskConical,
  AlertCircle
} from 'lucide-react';
import { EvidenceState } from '../../contracts/types';
import { EVIDENCE_BADGE_SPECS } from '../../ui/viewModels';

interface EvidenceBadgeProps {
  state: EvidenceState;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  state,
  size = 'md',
  showDescription = false,
  className = ''
}) => {
  const spec = EVIDENCE_BADGE_SPECS[state] || EVIDENCE_BADGE_SPECS.INSUFFICIENT_EVIDENCE;

  const renderIcon = () => {
    switch (state) {
      case 'DIRECTLY_OBSERVED':
        return <CheckCircle2 className={iconSizeClass} aria-hidden="true" />;
      case 'OBSERVED_NEARBY':
        return <Radio className={iconSizeClass} aria-hidden="true" />;
      case 'MODEL_ESTIMATED':
        return <Cpu className={iconSizeClass} aria-hidden="true" />;
      case 'SYNTHETIC':
        return <FlaskConical className={iconSizeClass} aria-hidden="true" />;
      case 'INSUFFICIENT_EVIDENCE':
      default:
        return <AlertCircle className={iconSizeClass} aria-hidden="true" />;
    }
  };

  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const textSizeClass = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';
  const paddingClass = size === 'sm' ? 'px-1.5 py-0.5' : size === 'lg' ? 'px-3 py-1' : 'px-2 py-0.5';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span
        role="status"
        aria-label={`Evidence State: ${spec.label}`}
        title={`${spec.label}: ${spec.description}`}
        className={`inline-flex items-center gap-1.5 rounded-md font-medium border shadow-xs tracking-tight ${spec.badgeClass} ${paddingClass} ${textSizeClass}`}
      >
        {renderIcon()}
        <span>{spec.label}</span>
      </span>
      {showDescription && (
        <span className="text-[10px] text-slate-400 mt-1 pl-0.5 font-normal">
          {spec.description}
        </span>
      )}
    </div>
  );
};
