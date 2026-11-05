import React, { useEffect, useState } from 'react';
import { Mic, Cpu, Edit3, ShieldCheck, FileDown, Clock } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { apiClient } from '../../api/client';

interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  detail?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  dictation:   { icon: <Mic className="w-3.5 h-3.5" />,        label: 'Initial Dictation',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  structuring: { icon: <Cpu className="w-3.5 h-3.5" />,        label: 'AI Structuring',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  doctor_edit: { icon: <Edit3 className="w-3.5 h-3.5" />,      label: 'Doctor Edits',        color: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed:   { icon: <ShieldCheck className="w-3.5 h-3.5" />,label: 'Doctor Confirmed',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  pdf_downloaded: { icon: <FileDown className="w-3.5 h-3.5" />,label: 'PDF Downloaded',      color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

interface AuditTimelineProps {
  prescriptionId: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ prescriptionId }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.getHistory(prescriptionId)
      .then((data) => {
        // Map history to audit entries
        const mapped: AuditEntry[] = [];
        if (data.versions?.length) {
          data.versions.forEach((v: any) => {
            mapped.push({ timestamp: v.created_at, action: v.action || 'doctor_edit', actor: v.actor || 'System', detail: v.detail });
          });
        }
        if (data.edits?.length) {
          data.edits.forEach((e: any) => {
            mapped.push({ timestamp: e.timestamp || e.created_at, action: e.action || 'doctor_edit', actor: e.actor || 'Doctor', detail: e.detail || e.command });
          });
        }
        // Sort by timestamp
        mapped.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setEntries(mapped);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [prescriptionId]);

  return (
    <div className="clinical-card p-4">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Clock className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-800">Audit Trail</h3>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <LoadingSpinner size="sm" label="Loading audit trail..." />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4">No audit entries yet.</p>
      ) : (
        <div className="space-y-0">
          {entries.map((entry, idx) => {
            const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.doctor_edit;
            return (
              <div key={idx} className="timeline-item">
                <div className={`timeline-dot ${cfg.color} border`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 pt-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{cfg.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    {entry.actor && <> · {entry.actor}</>}
                  </p>
                  {entry.detail && (
                    <p className="text-[10px] text-slate-500 mt-1 italic truncate">{entry.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
