/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Scenario Provenance & Algorithmic Lineage Modal (Phase P6)
 * Renders complete reproducible lineage for any ScenarioRun (S01–S12)
 *
 * Contract fields strictly presented verbatim:
 * - catalog_version ("scenario_catalog_v1")
 * - case_id ("S01"–"S12")
 * - design_intent
 * - generator_version
 * - config_hash
 * - seed
 * - anchor_record_ids
 * - context_record_ids
 * - route_version_ids (classified as SYNTHETIC_CORRIDOR vs OBSERVED_TRACE)
 * - action_zone_version_id
 * - reference_zone_version_ids
 * - evaluation_plan_id
 * - assumptions
 * - branches ("WITHOUT_ACTION", "WITH_ACTION")
 * - clock_mode ("REAL" | "SCENARIO" | "TEST")
 * - display_label (server-computed)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  GitBranch,
  Shield,
  Layers,
  Database,
  Hash,
  Clock,
  Sparkles,
  MapPin,
  Route,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

import { ScenarioRun, ZoneSummary } from '../../contracts/types';
import { EvidenceBadge } from '../shared/EvidenceBadge';
import { formatDualTime, classifyRouteVersion } from '../../ui/viewModels';

interface ScenarioProvenanceModalProps {
  scenario: ScenarioRun | null;
  zone?: ZoneSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioProvenanceModal: React.FC<ScenarioProvenanceModalProps> = ({
  scenario,
  zone,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !scenario) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const genTime = formatDualTime(scenario.generated_at);
  const scTime = formatDualTime(scenario.scenario_time);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                Case {scenario.case_id}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Catalog: {scenario.catalog_version}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Clock Mode: {scenario.clock_mode}
              </span>
              <EvidenceBadge state="SYNTHETIC" size="sm" />
            </div>

            <h2 id="provenance-modal-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              <span>Algorithmic Provenance & Simulation Lineage</span>
            </h2>

            <p className="text-xs text-slate-400">
              Deterministic mathematical execution record for scenario run <code className="text-cyan-300 font-mono font-semibold">{scenario.id}</code>
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Domain Rule 4 Server Display Label Banner */}
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Server-Computed Authoritative Label (Domain Rule 4)
              </span>
              <span className="text-[10px] font-mono text-amber-400/80">
                time_alignment: {scenario.time_alignment}
              </span>
            </div>
            <p className="text-sm font-semibold text-white tracking-tight leading-snug">
              {scenario.display_label}
            </p>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Lineage records ensure reproducible simulation parameterization without confusing synthetic projections with certified observational measurements.
            </p>
          </div>

          {/* Section 1: Execution & Cryptographic Hash Lineage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                Execution Parameters
              </h3>

              <div className="space-y-2 font-mono">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Design Intent:</span>
                  <span className="text-cyan-300 font-bold">{scenario.design_intent}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Generator Version:</span>
                  <span className="text-slate-200">{scenario.generator_version}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">RNG Deterministic Seed:</span>
                  <span className="text-purple-300 font-bold">{scenario.seed}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Generated At (UTC):</span>
                  <span className="text-slate-300 text-[11px]">{genTime.utc}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Scenario Time (IST):</span>
                  <span className="text-slate-300 text-[11px]">{scTime.ist}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Configuration Integrity
                </h3>
                <button
                  onClick={() => handleCopy(scenario.config_hash, 'hash')}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {copied === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'hash' ? 'Copied' : 'Copy Hash'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] break-all text-emerald-300">
                  {scenario.config_hash}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cryptographic digest of simulation boundary rules, grid discretization, atmospheric dispersion coefficients, and counterfactual emissions rates.
                </p>
                <div className="pt-1">
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">Generated Target Metrics:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {scenario.generated_metrics.map((m) => (
                      <span key={m} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Spatial & Corridor Linkage */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              Spatial Zones & Evaluation Plan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
              <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Action Spatial Zone Version</span>
                <div className="text-cyan-300 font-bold">{scenario.action_zone_version_id}</div>
                {zone && (
                  <div className="text-slate-300 text-[11px] font-sans">
                    {zone.name} ({zone.geometry_status === 'VERIFIED' ? 'Verified Boundary' : 'Placeholder Boundary'})
                  </div>
                )}
              </div>

              <div className="space-y-2 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Reference Zone Versions</span>
                <div className="space-y-1">
                  {scenario.reference_zone_version_ids.length > 0 ? (
                    scenario.reference_zone_version_ids.map((refId) => (
                      <div key={refId} className="text-purple-300">
                        {refId}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">None assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block mb-1">Evaluation Plan ID</span>
                <div className="text-slate-200 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                  {scenario.evaluation_plan_id}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase block mb-1">
                  Corridor Route Version IDs (SYNTHETIC_CORRIDOR vs OBSERVED_TRACE)
                </span>
                <div className="space-y-1.5">
                  {scenario.route_version_ids.length > 0 ? (
                    scenario.route_version_ids.map((rId) => {
                      const classification = classifyRouteVersion(rId);
                      return (
                        <div
                          key={rId}
                          className="flex items-center justify-between p-1.5 bg-slate-900 rounded border border-slate-800"
                        >
                          <span className="text-slate-200 truncate">{rId}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono border ${
                              classification.type === 'OBSERVED_TRACE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-purple-950 text-purple-300 border-purple-800'
                            }`}
                          >
                            {classification.type}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-2 bg-slate-900/50 rounded border border-slate-800 text-slate-500 font-sans italic text-[11px]">
                      No route versions assigned (Pre-Gate 1 unmeasured / placeholder geometry)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Empirical Anchors vs Model Context Records */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Anchors */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Anchor Record IDs
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {scenario.anchor_record_ids.length} anchors
                </span>
              </div>

              {scenario.anchor_record_ids.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {scenario.anchor_record_ids.map((aid) => (
                    <div
                      key={aid}
                      className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]"
                    >
                      <span className="text-emerald-300">{aid}</span>
                      <EvidenceBadge state="DIRECTLY_OBSERVED" size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Zero Verified Observed Anchors</span>
                  </div>
                  Zone has no verified physical sensor monitors. Scenario is 100% synthetic model simulation.
                </div>
              )}
            </div>

            {/* Context Records */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Context Record IDs
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {scenario.context_record_ids.length} records
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {scenario.context_record_ids.map((cid) => (
                  <div
                    key={cid}
                    className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]"
                  >
                    <span className="text-purple-300">{cid}</span>
                    <EvidenceBadge state="MODEL_ESTIMATED" size="sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Simulation Branches & Counterfactual Dual Paths */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              Counterfactual Simulation Branches
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenario.branches.map((b) => (
                <div
                  key={b}
                  className={`p-3 rounded-lg border flex flex-col justify-between space-y-1.5 ${
                    b === 'WITH_ACTION'
                      ? 'bg-cyan-950/40 border-cyan-800/80'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white">{b}</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {b === 'WITH_ACTION' ? 'Intervention Path' : 'Null Baseline Path'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {b === 'WITH_ACTION'
                      ? `Active municipal protocol execution (${scenario.design_intent}) modeled under deterministic boundary conditions.`
                      : 'Counterfactual baseline representing expected atmospheric concentration without intervention.'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Simulation Assumptions (verbatim from server) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4.5 space-y-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider font-mono">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Simulation Assumptions ({scenario.assumptions.length})
            </h3>

            <div className="space-y-2">
              {scenario.assumptions.map((assump, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] leading-relaxed"
                >
                  <span className="font-mono text-cyan-400 font-bold shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <span className="text-slate-200 font-sans">{assump}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>Case: {scenario.case_id}</span>
            <span>·</span>
            <span>Seed: {scenario.seed}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCopy(JSON.stringify(scenario, null, 2), 'json')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied === 'json' ? 'JSON Copied' : 'Copy Full JSON'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
            >
              Close Lineage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
