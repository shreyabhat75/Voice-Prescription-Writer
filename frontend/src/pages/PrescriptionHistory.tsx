import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, FileText, ArrowRight, UserCheck, Search, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { PrescriptionListItem } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const PrescriptionHistory: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this prescription and its audio/transcript?')) {
      try {
        await apiClient.deletePrescription(id);
        setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error('Failed to delete prescription:', err);
        alert('Failed to delete prescription. Please try again.');
      }
    }
  };

  const filtered = prescriptions.filter((p) =>
    (p.patient_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prescription Archive & Audit Trail</h1>
          <p className="text-xs text-slate-500">
            Every AI extraction, doctor manual edit, and voice edit is preserved with immutable timestamps.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" label="Loading historical records..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No prescriptions match your search</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/prescription/${p.id}`)}
                className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-50 px-3 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
                      {p.patient_name || 'Unnamed Patient'}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>ID: #{p.id.slice(0, 8)}</span>
                      <span>&bull;</span>
                      <span>Version: v{p.version}</span>
                      <span>&bull;</span>
                      <span>{p.medicine_count} Medications</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete prescription"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

