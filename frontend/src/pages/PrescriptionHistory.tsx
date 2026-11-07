import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, FileText, ArrowRight, Search, Trash2,
  CheckSquare, Square, X, Filter,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PrescriptionListItem, HistoryFilter } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const FILTER_TABS: { key: HistoryFilter; label: string }[] = [
  { key: 'all',          label: 'All'          },
  { key: 'needs_review', label: 'Needs Review'  },
  { key: 'confirmed',    label: 'Confirmed'     },
  { key: 'today',        label: 'Today'         },
];

export const PrescriptionHistory: React.FC = () => {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState<HistoryFilter>('all');
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  useEffect(() => { loadPrescriptions(); }, [doctor?.name]);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      setPrescriptions(await apiClient.listPrescriptions(doctor?.name));
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Filtering ─────────────────────────── */
  const today = new Date().toDateString();

  const filtered = prescriptions.filter((p) => {
    const matchesSearch = (p.patient_name || '').toLowerCase().includes(search.toLowerCase());
    let matchesFilter = true;
    if (filter === 'confirmed')    matchesFilter = p.status === 'confirmed';
    if (filter === 'needs_review') matchesFilter = p.status === 'review';
    if (filter === 'today')        matchesFilter = new Date(p.created_at).toDateString() === today;
    return matchesSearch && matchesFilter;
  });

  /* ── Selection ─────────────────────────── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  /* ── Single delete ─────────────────────── */
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Permanently delete this prescription and its audio/transcript?')) return;
    try {
      await apiClient.deletePrescription(id);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      alert('Failed to delete. Please try again.');
    }
  };

  /* ── Batch delete ──────────────────────── */
  const handleBatchDelete = async () => {
    if (!window.confirm(`Permanently delete ${selected.size} prescription(s)? This cannot be undone.`)) return;
    setBatchDeleting(true);
    try {
      await Promise.all([...selected].map((id) => apiClient.deletePrescription(id)));
      setPrescriptions((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch {
      alert('Some deletions failed. Please try again.');
    } finally {
      setBatchDeleting(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prescription Archive & Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every AI extraction, doctor edit, and voice command is preserved with immutable timestamps.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              filter === tab.key
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (() => {
              const count =
                tab.key === 'confirmed'    ? prescriptions.filter((p) => p.status === 'confirmed').length :
                tab.key === 'needs_review' ? prescriptions.filter((p) => p.status === 'review').length :
                tab.key === 'today'        ? prescriptions.filter((p) => new Date(p.created_at).toDateString() === today).length : 0;
              return count > 0 ? <span className="ml-1 opacity-70">({count})</span> : null;
            })()}
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-xs font-semibold text-blue-800">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {batchDeleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="clinical-card overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" label="Loading prescription records…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <History className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-sm font-semibold text-slate-500">
              {prescriptions.length === 0 ? 'No prescriptions yet' : 'No results match your filter'}
            </p>
            <p className="text-xs text-slate-400">
              {prescriptions.length === 0 ? 'Start a new dictation to see records here.' : 'Try a different filter or search term.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header with select-all */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-slate-400 hover:text-blue-600 cursor-pointer flex-shrink-0 transition-colors"
                title={allFilteredSelected ? 'Deselect all' : 'Select all'}
              >
                {allFilteredSelected
                  ? <CheckSquare className="w-4 h-4 text-blue-600" />
                  : <Square className="w-4 h-4" />
                }
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex-1">
                Patient ({filtered.length})
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-28 hidden md:block">Status</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 hidden md:block">Date</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/50' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                      className="text-slate-300 hover:text-blue-600 cursor-pointer flex-shrink-0 transition-colors"
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>

                    {/* Patient info */}
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0"
                      onClick={() => navigate(`/prescription/${p.id}`)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 truncate">
                          {p.patient_name || 'Unnamed Patient'}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span className="font-tabular">#{p.id.slice(0, 8)}</span>
                          <span>·</span>
                          <span>v{p.version}</span>
                          <span>·</span>
                          <span>{p.medicine_count} med{p.medicine_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-28 hidden md:block" onClick={() => navigate(`/prescription/${p.id}`)}>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Date */}
                    <div
                      className="w-24 hidden md:block text-xs text-slate-400 font-tabular"
                      onClick={() => navigate(`/prescription/${p.id}`)}
                    >
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>

                    {/* Actions */}
                    <div className="w-16 flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, p.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete prescription"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/prescription/${p.id}`)}
                        className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
