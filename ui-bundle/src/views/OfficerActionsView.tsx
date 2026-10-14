/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Officer Municipal Action Portal (Phase P4 + UX Layout Refactor)
 * Vertical left-rail sidebar navigation:
 * 1. Action Catalog (12 Scenarios)
 * 2. Create Action Draft
 * 3. Active Checkpoints & Progress
 * 4. Past Actions & Audit Log
 *
 * Role gating: PUBLIC clear denial state, OFFICER capabilities, SUPERVISOR SUBMIT_CORRECTION.
 * Authoritative Light Mode styling: bg-slate-50 / bg-white cards, text-slate-900, slate-200 borders.
 */

import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Play,
  CheckCircle2,
  Camera,
  AlertCircle,
  FileEdit,
  ShieldAlert,
  Video,
  Lock,
  Sparkles,
  RefreshCw,
  Send,
  Layers,
  MapPin,
  Clock,
  Check,
  ChevronRight,
  ShieldCheck,
  Calendar,
  FileCheck2,
  Eye,
  AlertTriangle,
  History,
  Activity,
  ArrowRight
} from 'lucide-react';

import { ApiClient } from '../api/ApiClient';
import {
  PublicInterventionResponse,
  CameraEvent,
  ClockMetadata,
  SessionInfo,
  Intervention,
  ZoneSummary,
  ZoneVersion,
  EvaluationPlan,
  ActionOverlapAssessment,
  Role
} from '../contracts/types';
import { EvidenceBadge } from '../components/shared/EvidenceBadge';
import { ZoneStatusBadges } from '../components/shared/ZoneStatusBadges';
import { CapabilityGuard } from '../components/shared/CapabilityGuard';
import { Disclaimer } from '../components/shared/Disclaimer';
import { FreshnessLabel } from '../components/shared/FreshnessLabel';
import { ZonePolygonMiniMap } from '../components/officer/ZonePolygonMiniMap';
import { CheckpointTimeline } from '../components/officer/CheckpointTimeline';
import { PairedDiffInDiffChart } from '../components/officer/PairedDiffInDiffChart';
import { ConfounderAndOverlapCard } from '../components/officer/ConfounderAndOverlapCard';
import { formatDualTime } from '../ui/viewModels';

export type OfficerSidebarTab = 'catalog' | 'draft' | 'checkpoints' | 'audit';

interface OfficerActionsViewProps {
  apiClient: ApiClient;
  clock: ClockMetadata;
  session: SessionInfo;
  onRefreshSession: () => void;
}

export const OfficerActionsView: React.FC<OfficerActionsViewProps> = ({
  apiClient,
  clock,
  session,
  onRefreshSession
}) => {
  const [activeTab, setActiveTab] = useState<OfficerSidebarTab>('catalog');
  const [interventionResp, setInterventionResp] = useState<PublicInterventionResponse | null>(null);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [selectedZoneSummary, setSelectedZoneSummary] = useState<ZoneSummary | null>(null);
  const [actionZoneVersion, setActionZoneVersion] = useState<ZoneVersion | null>(null);
  const [referenceZoneVersion, setReferenceZoneVersion] = useState<ZoneVersion | null>(null);
  const [cameraEvents, setCameraEvents] = useState<CameraEvent[]>([]);
  const [overlapAssessment, setOverlapAssessment] = useState<ActionOverlapAssessment | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number>(180);

  // Execution Inputs
  const [startedAtInput, setStartedAtInput] = useState<string>('2026-10-08T09:50:00Z');
  const [completedAtInput, setCompletedAtInput] = useState<string>('2026-10-08T10:00:00Z');
  const [correctionNotice, setCorrectionNotice] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublic = session.role === 'PUBLIC';
  const isOfficer = session.role === 'OFFICER';
  const isSupervisor = session.role === 'SUPERVISOR';

  // 1. Load initial intervention, zones, and camera events
  useEffect(() => {
    async function initPortal() {
      try {
        setLoading(true);
        const [resp, zoneList, cam, overlap] = await Promise.all([
          apiClient.getIntervention('int_water_001'),
          apiClient.listZones(),
          apiClient.getCameraEvent('cam_event_001'),
          apiClient.getOverlapAssessment('overlap_assessment_demo_01')
        ]);

        setInterventionResp(resp);
        setZones(zoneList);
        setOverlapAssessment(overlap);

        if (cam) {
          setCameraEvents([cam]);
        }

        // Default to S02 (Anand Vihar) or first zone
        const defaultZone = zoneList.find((z) => z.scenario_case_id === 'S02') || zoneList[0];
        setSelectedZoneSummary(defaultZone);

        if (defaultZone) {
          const [azv, refZV] = await Promise.all([
            apiClient.getZone(defaultZone.latest_zone_version_id),
            apiClient.getZone('zonev_reference_demo_01_1')
          ]);
          setActionZoneVersion(azv);
          setReferenceZoneVersion(refZV);
        }
      } catch (err) {
        console.error('Error initializing officer portal:', err);
      } finally {
        setLoading(false);
      }
    }
    initPortal();
  }, [apiClient]);

  // Handle Zone Selection
  const handleSelectZone = async (zone: ZoneSummary) => {
    setSelectedZoneSummary(zone);
    try {
      const azv = await apiClient.getZone(zone.latest_zone_version_id);
      setActionZoneVersion(azv);
    } catch (err) {
      console.error('Error fetching zone version:', err);
    }
  };

  // Create Draft Intervention
  const handleCreateDraft = async () => {
    if (!selectedZoneSummary || !actionZoneVersion) return;
    try {
      const draft = await apiClient.createDraftIntervention({
        zone_id: selectedZoneSummary.zone_id,
        zone_version_id: selectedZoneSummary.latest_zone_version_id,
        reference_zone_id: 'reference_zone_demo_01',
        reference_zone_version_id: 'zonev_reference_demo_01_1',
        type: 'water_suppression',
        scenario_id:
          selectedZoneSummary.scenario_case_id === 'S01'
            ? 'water_suppression_sustained_01'
            : 'water_suppression_sustained_02'
      });

      if (interventionResp) {
        setInterventionResp({
          ...interventionResp,
          intervention: draft
        });
      }
      setStatusMessage(`Draft intervention created: ${draft.id} for zone ${selectedZoneSummary.name}`);
      setActiveTab('draft');
    } catch (err: any) {
      setStatusMessage(`Error creating draft: ${err.message}`);
    }
  };

  // Freeze Evaluation Plan
  const handleFreezePlan = async () => {
    if (!interventionResp) return;
    try {
      const frozen = await apiClient.freezePlan(interventionResp.intervention.id, {
        status: 'FROZEN',
        frozen_at: clock.effective_now
      });

      setInterventionResp({
        ...interventionResp,
        evaluation_plan: frozen
      });
      setStatusMessage(`Evaluation Plan frozen at ${clock.effective_now}. Parameters locked.`);
    } catch (err: any) {
      setStatusMessage(`Error freezing plan: ${err.message}`);
    }
  };

  // Start Action
  const handleStartAction = async () => {
    if (!interventionResp) return;
    try {
      const updated = await apiClient.startAction(interventionResp.intervention.id, startedAtInput);
      setInterventionResp({ ...interventionResp, intervention: updated });
      setStatusMessage(`Action started at ${startedAtInput}. Sprinklers active.`);
    } catch (err: any) {
      setStatusMessage(`Error starting action: ${err.message}`);
    }
  };

  // Complete Action / Mark Done
  const handleCompleteAction = async () => {
    if (!interventionResp) return;
    try {
      const updated = await apiClient.markDone(interventionResp.intervention.id, completedAtInput);
      setInterventionResp({ ...interventionResp, intervention: updated });
      setStatusMessage(`Intervention marked done. Server-side marked_done_at timestamp logged.`);
    } catch (err: any) {
      setStatusMessage(`Error completing action: ${err.message}`);
    }
  };

  // Attach Media
  const handleAttachMedia = async () => {
    if (!interventionResp) return;
    try {
      const newMedia = await apiClient.attachMedia(interventionResp.intervention.id, {
        hotspot_id: selectedZoneSummary?.zone_id || 'hotspot_anand_vihar_demo_01',
        camera_source: 'officer_patrol_unit_12',
        media_type: 'video',
        label: 'dust_suppression_water_misting_pass'
      });
      setCameraEvents((prev) => [...prev, newMedia]);
      setStatusMessage('Operational verification media metadata attached to intervention.');
    } catch (err: any) {
      setStatusMessage(`Error attaching media: ${err.message}`);
    }
  };

  // Submit Correction (Supervisor only)
  const handleSubmitCorrection = async () => {
    if (!interventionResp || !correctionNotice.trim()) return;
    try {
      const updatedResp = await apiClient.submitCorrection(
        interventionResp.intervention.id,
        correctionNotice
      );
      setInterventionResp(updatedResp);
      setStatusMessage('Official correction notice submitted and locked in permanent audit log.');
      setCorrectionNotice('');
    } catch (err: any) {
      setStatusMessage(`Error submitting correction: ${err.message}`);
    }
  };

  // Quick Switcher Helper for Fixture Mode
  const handleQuickSwitchRole = (role: Role) => {
    if (apiClient.setFixtureRole) {
      apiClient.setFixtureRole(role);
      onRefreshSession();
    }
  };

  const navItems: Array<{
    id: OfficerSidebarTab;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'catalog',
      label: 'Action Catalog (12 Scenarios)',
      description: 'Catalog cases S01–S12, geometry verification & status',
      icon: <Layers className="w-4 h-4" />,
      badge: '12 Cases'
    },
    {
      id: 'draft',
      label: 'Create Action Draft',
      description: 'Select zones, verify geometry hashes & freeze plan',
      icon: <FileEdit className="w-4 h-4" />,
      badge: interventionResp?.evaluation_plan?.status === 'FROZEN' ? 'Plan Frozen' : 'Draft'
    },
    {
      id: 'checkpoints',
      label: 'Active Checkpoints & Progress',
      description: 'Execution timeline, paired Recharts & confounders',
      icon: <Activity className="w-4 h-4" />,
      badge: interventionResp?.intervention?.lifecycle || 'Active'
    },
    {
      id: 'audit',
      label: 'Past Actions & Audit Log',
      description: 'Supervisor correction notices & immutable revisions',
      icon: <History className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Operations Header */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-start justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-mono text-xs uppercase tracking-wider font-semibold">
            <Wrench className="w-4 h-4" />
            <span>Aerify Municipal Operations Console · Phase P4</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Municipal Water Suppression Workflow
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Targeted localized PM suppression dispatch, cryptographic geometry hash verification, and counterfactual evaluation.
          </p>
        </div>

        {/* Current Active Intervention Badge */}
        {interventionResp && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 font-mono">
            <div className="text-slate-500 text-[10px] uppercase">Active Intervention:</div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{interventionResp.intervention.id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-medium">
                {interventionResp.intervention.lifecycle}
              </span>
            </div>
            <div className="text-[11px] text-slate-600">
              Target: <strong className="text-slate-800">{interventionResp.intervention.zone_id}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Operational Flash Status Message */}
      {statusMessage && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-sky-700 hover:text-sky-900 text-xs font-mono font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. PUBLIC ROLE CLEAR DENIAL STATE (Domain Rule 10) */}
      {isPublic && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-700 shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              Restricted Municipal Action Interface
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dispatching water suppression, freezing evaluation plans, and attaching verified operational media requires verified municipal credentials (OFFICER or SUPERVISOR role).
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2 font-mono max-w-lg mx-auto shadow-xs">
            <span className="text-slate-500 block uppercase text-[10px]">Missing Municipal Capabilities:</span>
            <div className="flex flex-wrap justify-center gap-2 text-[11px]">
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">CREATE_DRAFT</span>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">EDIT_DRAFT</span>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">START_ACTION</span>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">COMPLETE_ACTION</span>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">ATTACH_MEDIA</span>
              <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-medium">SUBMIT_CORRECTION</span>
            </div>
          </div>

          {/* Quick Demo Switcher if in FIXTURE mode */}
          {session.auth_mode === 'FIXTURE' && (
            <div className="pt-2 border-t border-amber-200 flex items-center justify-center gap-3">
              <span className="text-xs text-slate-700">Fixture Demo Testing:</span>
              <button
                onClick={() => handleQuickSwitchRole('OFFICER')}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>Switch to OFFICER Role</span>
              </button>
              <button
                onClick={() => handleQuickSwitchRole('SUPERVISOR')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>Switch to SUPERVISOR Role</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFICER / SUPERVISOR WORKFLOW CONSOLE WITH VERTICAL LEFT-RAIL SIDEBAR */}
      {!isPublic && interventionResp && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Vertical Left-Rail Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-1.5">
              <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 mb-1">
                Officer Actions Nav
              </div>

              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                      isActive
                        ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        <span className={isActive ? 'text-sky-600' : 'text-slate-500'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-medium ${
                            isActive
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-tight line-clamp-1 ${isActive ? 'text-sky-700' : 'text-slate-500'}`}>
                      {item.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Quick Municipal Metadata Card in Left Rail */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs space-y-2.5 font-mono">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Console State</span>
                <span className="text-sky-600 font-bold">{session.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Lifecycle:</span>
                <strong className="text-slate-800 uppercase">{interventionResp.intervention.lifecycle}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Target Zone:</span>
                <span className="text-slate-700 truncate block">
                  {selectedZoneSummary?.name || interventionResp.intervention.zone_id}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Evaluation Plan:</span>
                <span className="text-slate-700">
                  {interventionResp.evaluation_plan?.status || 'DRAFT'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-sans italic">
                {interventionResp.intervention.action_confirmation_basis || 'officer self-reported'}
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: ACTION CATALOG (12 SCENARIOS) */}
            {activeTab === 'catalog' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        <span>Action Catalog (12 Scenarios from `listZones()`)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select a municipal intervention target zone and review its geometry verification and anchor state.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-md font-semibold">
                      12 Municipal Cases
                    </span>
                  </div>

                  {/* 12 Zones Catalog Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                    {zones.map((zone) => {
                      const isSelected = selectedZoneSummary?.zone_id === zone.zone_id;
                      return (
                        <button
                          key={zone.zone_id}
                          onClick={() => handleSelectZone(zone)}
                          className={`text-left p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'bg-sky-50 border-sky-400 shadow-sm ring-2 ring-sky-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {zone.scenario_case_id}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {zone.latest_zone_version_id}
                            </span>
                          </div>

                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">
                              {zone.name}
                            </span>
                            <div className="mt-1">
                              <ZoneStatusBadges zone={zone} showDisplayLabel={false} />
                            </div>
                          </div>

                          {zone.display_label && (
                            <p className="text-[10px] text-slate-500 italic line-clamp-2 pt-1 border-t border-slate-100">
                              {zone.display_label}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Zone Inspection & Geometry Hash Verification */}
                  {selectedZoneSummary && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {selectedZoneSummary.name}
                          </span>
                          <span className="font-mono text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium">
                            {selectedZoneSummary.scenario_case_id}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('draft')}
                          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <span>Prepare Action Draft for this Zone</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Action Zone Version ID:</span>
                          <span className="text-slate-800 font-semibold">{selectedZoneSummary.latest_zone_version_id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Pretrend Reference Zone:</span>
                          <span className="text-slate-800 font-semibold">zonev_reference_demo_01_1</span>
                        </div>
                      </div>

                      {/* Mini Map Polygon Preview with Local SHA-256 Hash Verification */}
                      <ZonePolygonMiniMap
                        actionZone={actionZoneVersion}
                        referenceZone={referenceZoneVersion}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CREATE ACTION DRAFT */}
            {activeTab === 'draft' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileEdit className="w-4 h-4 text-sky-600" />
                        <span>Create Municipal Action Draft & Freeze Plan</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Verify spatial parameters and lock evaluation policy before dispatching field action.
                      </p>
                    </div>
                    {interventionResp.evaluation_plan?.status === 'FROZEN' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Plan Frozen & Locked</span>
                      </span>
                    ) : (
                      <span className="text-xs font-mono bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-md font-semibold">
                        Draft Mode
                      </span>
                    )}
                  </div>

                  {/* Zone Details Review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                        Target Action Zone
                      </span>
                      <div className="font-bold text-sm text-slate-900">
                        {selectedZoneSummary?.name || 'Selected Action Zone'}
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Version: {selectedZoneSummary?.latest_zone_version_id}
                      </div>
                      <div className="pt-2">
                        <CapabilityGuard requiredCapability="CREATE_DRAFT" session={session}>
                          <button
                            onClick={handleCreateDraft}
                            disabled={!selectedZoneSummary}
                            className="w-full px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                          >
                            <FileEdit className="w-4 h-4" />
                            <span>Initialize Municipal Action Draft</span>
                          </button>
                        </CapabilityGuard>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                        Pretrend Reference Zone
                      </span>
                      <div className="font-bold text-sm text-slate-900">
                        Reference Corridor Buffer (Demo 01)
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Version: zonev_reference_demo_01_1
                      </div>
                      <div className="pt-2 text-[11px] text-slate-500 italic">
                        Provides parallel pretrend counterfactual anchor. Verified via SHA-256 geometry hash.
                      </div>
                    </div>
                  </div>

                  {/* Read-Only Evaluation Plan Section */}
                  {interventionResp.evaluation_plan && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-mono flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-sky-600" />
                            <span>Evaluation Plan Parameters (Read-Only)</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 font-sans">
                            Policy: {interventionResp.evaluation_plan.confounder_policy_version}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                            interventionResp.evaluation_plan.status === 'FROZEN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          Status: {interventionResp.evaluation_plan.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block uppercase">Min Coverage</span>
                          <span className="text-sm font-bold text-slate-900">
                            {(interventionResp.evaluation_plan.minimum_coverage_ratio * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block uppercase">Min Bins</span>
                          <span className="text-sm font-bold text-slate-900">
                            {interventionResp.evaluation_plan.minimum_independent_bins}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block uppercase">Checkpoints</span>
                          <span className="text-sm font-bold text-slate-900">
                            +{interventionResp.evaluation_plan.checkpoint_offsets_minutes.join('m, +')}m
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-400 block uppercase">Segmentation</span>
                          <span className="text-xs font-semibold text-slate-900 truncate block">
                            {interventionResp.evaluation_plan.segmentation_version}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                        {interventionResp.evaluation_plan.status !== 'FROZEN' ? (
                          <CapabilityGuard requiredCapability="EDIT_DRAFT" session={session}>
                            <button
                              onClick={handleFreezePlan}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Freeze Evaluation Plan (Server Clock: {clock.effective_now})</span>
                            </button>
                          </CapabilityGuard>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-emerald-800 font-mono font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Plan frozen at {interventionResp.evaluation_plan.frozen_at}. Parameters immutable.
                            </span>
                            <button
                              onClick={() => setActiveTab('checkpoints')}
                              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <span>Proceed to Active Execution & Checkpoints</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ACTIVE CHECKPOINTS & PROGRESS */}
            {activeTab === 'checkpoints' && (
              <div className="space-y-6">
                {/* Execution Timing & Dispatch Inputs */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Play className="w-4 h-4 text-sky-600" />
                        <span>Execution Timing & Dispatch (`startAction` / `markDone`)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Log action timestamps. Confirmation basis: &quot;officer self-reported&quot;.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-md font-semibold">
                      Lifecycle: {interventionResp.intervention.lifecycle}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Action Box */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <label className="text-xs font-semibold text-slate-800 block">
                        Action Started Timestamp (ISO UTC)
                      </label>
                      <input
                        type="text"
                        value={startedAtInput}
                        onChange={(e) => setStartedAtInput(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-sky-500"
                      />
                      <CapabilityGuard requiredCapability="START_ACTION" session={session}>
                        <button
                          onClick={handleStartAction}
                          className="w-full px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Dispatch / Start Water Action</span>
                        </button>
                      </CapabilityGuard>
                    </div>

                    {/* Complete Action Box */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                      <label className="text-xs font-semibold text-slate-800 block">
                        Action Completed Timestamp (ISO UTC)
                      </label>
                      <input
                        type="text"
                        value={completedAtInput}
                        onChange={(e) => setCompletedAtInput(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-hidden focus:border-sky-500"
                      />
                      <CapabilityGuard requiredCapability="COMPLETE_ACTION" session={session}>
                        <button
                          onClick={handleCompleteAction}
                          className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done (Logs server marked_done_at)</span>
                        </button>
                      </CapabilityGuard>
                    </div>
                  </div>

                  {/* Illustrative Media Attachment Section */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <Camera className="w-4 h-4 text-sky-600" />
                        <span>Attached Operational Media ({cameraEvents.length})</span>
                      </div>
                      <CapabilityGuard requiredCapability="ATTACH_MEDIA" session={session}>
                        <button
                          onClick={handleAttachMedia}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                          <span>Attach Verification Media</span>
                        </button>
                      </CapabilityGuard>
                    </div>

                    <Disclaimer
                      variant="media"
                      customText="Illustrative media only - does not measure AQI or verify impact."
                    />

                    {/* Camera events list */}
                    {cameraEvents.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cameraEvents.map((cam) => (
                          <div
                            key={cam.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between font-mono">
                              <span className="font-bold text-slate-800">{cam.id}</span>
                              <span className="text-[10px] text-slate-500">{cam.camera_source}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">{cam.label}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Captured: {cam.recorded_at}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkpoint Timeline */}
                {interventionResp.evaluation_plan && (
                  <CheckpointTimeline
                    plan={interventionResp.evaluation_plan}
                    selectedOffset={selectedOffset}
                    onSelectOffset={setSelectedOffset}
                  />
                )}

                {/* Paired Diff-in-Diff Recharts Chart */}
                {interventionResp.scenario_projections && interventionResp.scenario_projections.length > 0 && (
                  <PairedDiffInDiffChart
                    projection={interventionResp.scenario_projections[0]}
                    selectedOffsetMinutes={selectedOffset}
                  />
                )}

                {/* Structured Confounder and Overlap Assessment */}
                {interventionResp.scenario_projections && interventionResp.scenario_projections.length > 0 && (
                  <ConfounderAndOverlapCard
                    confounders={interventionResp.scenario_projections[0].confounders || []}
                    limitations={interventionResp.scenario_projections[0].limitations || []}
                    overlapAssessment={overlapAssessment}
                  />
                )}
              </div>
            )}

            {/* TAB 4: PAST ACTIONS & AUDIT LOG */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                {/* Supervisor Correction Notice Banner & Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-sky-600" />
                        <span>Supervisor Correction Notices & Municipal Audit Trail</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Permanent audit log of municipal revisions. Revisions supersede previous evaluations.
                      </p>
                    </div>
                    {isSupervisor && (
                      <span className="text-xs font-mono bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-md font-semibold">
                        Supervisor Correction Mode
                      </span>
                    )}
                  </div>

                  {/* Active Correction Notice */}
                  {interventionResp.correction_notice ? (
                    <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 text-xs space-y-1.5 shadow-xs">
                      <div className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Active Official Supervisor Correction Notice</span>
                      </div>
                      <p className="text-xs text-amber-800 font-mono">
                        {interventionResp.correction_notice}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-mono">
                      No correction notices currently logged against intervention {interventionResp.intervention.id}.
                    </div>
                  )}

                  {/* Submit Correction Form (Supervisor capability) */}
                  <CapabilityGuard requiredCapability="SUBMIT_CORRECTION" session={session}>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-semibold text-slate-800 block">
                        Append Official Correction Notice (Reason Required):
                      </label>
                      <textarea
                        value={correctionNotice}
                        onChange={(e) => setCorrectionNotice(e.target.value)}
                        placeholder="State specific audit correction reason (e.g., Water suppression vehicle route diverged at 10:15 UTC)..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 min-h-[90px]"
                      />
                      <button
                        onClick={handleSubmitCorrection}
                        disabled={!correctionNotice.trim()}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Official Correction Notice</span>
                      </button>
                    </div>
                  </CapabilityGuard>
                </div>

                {/* Prior Revisions Log */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-mono">
                    Intervention Revision History
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          Revision #{interventionResp.intervention.revision} (Current)
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-semibold">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-slate-600">
                        Intervention ID: {interventionResp.intervention.id} · Type: {interventionResp.intervention.type}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Effective Timestamp: {clock.effective_now}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
