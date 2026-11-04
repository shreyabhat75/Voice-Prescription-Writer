import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { PrescriptionListItem } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        await apiClient.deletePrescription(id);
        setPrescriptions((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error('Failed to delete:', err);
        alert('Failed to delete prescription.');
      }
    }
  };

  const confirmedCount = prescriptions.filter((p) => p.status === 'confirmed').length;
  const reviewCount = prescriptions.filter((p) => p.status === 'review').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Dictation Dashboard</h1>
          <p className="text-blue-200 text-xs mt-1">
            Dictate, verify with source-grounded evidence, and generate validated prescriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/new')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-blue-700" />
          New Voice Dictation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Prescriptions
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{prescriptions.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Doctor Review
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{reviewCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Doctor Confirmed
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{confirmedCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Prescriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">Recent Prescriptions</h2>
          <span className="text-xs text-slate-400">Sorted by last updated</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" label="Loading clinical records..." />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No prescriptions yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click &ldquo;New Voice Dictation&rdquo; to start your first medical dictation.
            </p>
            <button
              type="button"
              onClick={() => navigate('/new')}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Start First Dictation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Medicines</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {prescriptions.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/prescription/${p.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600">
                      {p.patient_name || 'Unnamed Patient'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{p.medicine_count} item(s)</td>
                    <td className="py-3.5 px-4 text-slate-500">v{p.version}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:underline">
                          Review <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete prescription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

