import React, { useEffect, useState } from 'react';
import { Sparkles, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '../../api/ApiClient';
import { AgentNarrativeResponse, AgentType } from '../../contracts/types';
import { EvidenceBadge } from './EvidenceBadge';

interface AgentNarrativeCardProps {
  apiClient?: ApiClient;
  agentType: AgentType;
  targetId: string;
  title?: string;
}

export const AgentNarrativeCard: React.FC<AgentNarrativeCardProps> = ({
  apiClient,
  agentType,
  targetId,
  title
}) => {
  const [narrative, setNarrative] = useState<AgentNarrativeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!apiClient?.getNarrative || !targetId) return;
      try {
        setLoading(true);
        const res = await apiClient.getNarrative(agentType, targetId);
        if (mounted) setNarrative(res);
      } catch (err) {
        console.warn('Narrative fetch fallback:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [apiClient, agentType, targetId]);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs text-slate-600 animate-pulse">
        Generating governed Vertex AI narrative ({agentType} agent)...
      </div>
    );
  }

  if (!narrative) return null;

  return (
    <div className="bg-white border border-sky-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="text-xs font-extrabold text-slate-900 tracking-tight">
          {title || 'AI Air Quality Summary'}
        </span>
      </div>

      {narrative.evidence_bullets && narrative.evidence_bullets.length > 0 ? (
        <ul className="space-y-2 text-xs text-slate-700">
          {narrative.evidence_bullets.slice(0, 4).map((b, i) => {
            const cleanText = b
              .replace(/seg_cell_[a-zA-Z0-9_]+/g, 'road corridor')
              .replace(/ctx_weather_[a-zA-Z0-9_]+/g, 'local weather sensors')
              .replace(/dist_([a-zA-Z0-9_]+)/g, (_, d) => d.replace(/_/g, ' ') + ' district')
              .replace(/evalplan_[a-zA-Z0-9_]+/g, 'clean air plan')
              .replace(/int_[a-zA-Z0-9_]+/g, 'municipal action');

            const isFactor = cleanText.startsWith('Potential Contributing Factors:');

            return (
              <li key={i} className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isFactor ? 'bg-amber-500' : 'bg-sky-500'}`} />
                <span className="leading-relaxed font-medium">
                  {isFactor ? (
                    <>
                      <strong className="text-amber-900">Potential Contributing Factors:</strong>{' '}
                      {cleanText.replace('Potential Contributing Factors:', '').trim()}
                    </>
                  ) : (
                    cleanText
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {narrative.summary
            ?.replace(/seg_cell_[a-zA-Z0-9_]+/g, 'road corridor')
            .replace(/ctx_weather_[a-zA-Z0-9_]+/g, 'local weather sensors')
            .replace(/dist_([a-zA-Z0-9_]+)/g, (_, d) => d.replace(/_/g, ' ') + ' district')}
        </p>
      )}

      {/* Concise Footnote without internal DB IDs */}
      <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
        <span>Grounded in live municipal sensors & atmospheric models</span>
        <span className="text-slate-400">Delhi NCR Urban Airshed</span>
      </div>
    </div>
  );
};

