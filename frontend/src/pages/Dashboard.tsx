import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, FileText, CheckCircle, AlertTriangle,
  ArrowRight, Plus, TrendingUp, Activity,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PrescriptionListItem } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<{ stt_provider: string; llm_provider: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.listPrescriptions(),
      apiClient.checkHealth().catch(() => null),
    ]).then(([rxList, h]) => {
      setPrescriptions(rxList);
      if (h) setHealth(h);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const todayRx      = prescriptions.filter((p) => new Date(p.created_at).toDateString() === today);
  const confirmedRx  = prescriptions.filter((p) => p.status === 'confirmed');
  const pendingRx    = prescriptions.filter((p) => p.status === 'review' || p.status === 'structuring');
  const recent5      = prescriptions.slice(0, 5);

  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number; color: string; sub?: string }> = ({
    icon, label, value, color, sub,
  }) => (
    <div className="clinical-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 font-tabular">{value}</p>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinical Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Prescription
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          label="Today's Prescriptions"
          value={todayRx.length}
          color="bg-blue-50"
          sub="Created today"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="Pending Review"
          value={pendingRx.length}
          color="bg-amber-50"
          sub="Awaiting confirmation"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          label="Confirmed"
          value={confirmedRx.length}
          color="bg-emerald-50"
          sub="All time"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
          label="Total Prescriptions"
          value={prescriptions.length}
          color="bg-purple-50"
          sub="All records"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick start CTA */}
        <div
          onClick={() => navigate('/new')}
          className="clinical-card p-6 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group lg:col-span-1"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700">Start New Dictation</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Record a prescription and let AI structure it automatically.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
            Begin dictation <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Recent prescriptions */}
        <div className="clinical-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">Recent Prescriptions</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              View all →
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="md" label="Loading prescriptions..." />
            </div>
          ) : recent5.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">No prescriptions yet</p>
              <p className="text-xs text-slate-400">Start your first dictation above</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent5.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/prescription/${p.id}`)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">
                        {p.patient_name || 'Unnamed Patient'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {p.medicine_count} medication{p.medicine_count !== 1 ? 's' : ''} · {new Date(p.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={p.status} />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System status */}
      {health && (
        <div className="clinical-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">System Status</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'STT Engine', value: health.stt_provider, ok: true },
              { label: 'LLM Engine', value: health.llm_provider, ok: true },
              { label: 'Database', value: 'SQLite', ok: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-800">{s.label}</span>
                <span className="text-[11px] text-emerald-600 capitalize">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
