import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Download, Save, ArrowLeft, RotateCw,
  FileCheck, AlertCircle, Edit, X, Trash2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Prescription } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PatientInfoCard } from '../components/prescription/PatientInfoCard';
import { ClinicalInfoCard } from '../components/prescription/ClinicalInfoCard';
import { MedicineTable } from '../components/prescription/MedicineTable';
import { TranscriptViewer } from '../components/prescription/TranscriptViewer';
import { ValidationPanel } from '../components/prescription/ValidationPanel';
import { ClarificationPanel } from '../components/prescription/ClarificationPanel';
import { VoiceEditPanel } from '../components/prescription/VoiceEditPanel';
import { ConfirmationDialog } from '../components/prescription/ConfirmationDialog';
import { AuditTimeline } from '../components/prescription/AuditTimeline';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="toast bg-emerald-700 text-white">
      <FileCheck className="w-4 h-4 flex-shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

export const PrescriptionReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightPhrase, setHighlightPhrase] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { if (id) loadPrescription(id); }, [id]);

  const loadPrescription = async (rxId: string) => {
    setLoading(true);
    setError(null);
    try {
      setPrescription(await apiClient.getPrescription(rxId));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load prescription.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedFields: Partial<Prescription>) => {
    if (!prescription) return;
    setSaving(true);
    try {
      const updated = await apiClient.updatePrescriptionFields(prescription.id, {
        patient: updatedFields.patient ?? prescription.patient,
        clinical: updatedFields.clinical ?? prescription.clinical,
        medicines: updatedFields.medicines ?? prescription.medicines,
      });
      setPrescription(updated);
      setToast('Prescription edits saved & re-validated.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!prescription) return;
    setIsGlobalEditMode(false);
    await handleUpdate({ patient: prescription.patient, clinical: prescription.clinical, medicines: prescription.medicines });
  };

  const handleVoiceEditCommand = async (command: string) => {
    if (!prescription) return;
    const res = await apiClient.applyVoiceEdit(prescription.id, command);
    setPrescription(res.prescription);
    return res;
  };

  const handleClarificationAnswer = async (field: string, answer: string, medicineIndex?: number) => {
    if (!prescription) return;
    try {
      if (field.startsWith('medicines') && medicineIndex !== undefined) {
        const medsCopy = [...prescription.medicines];
        const targetMed = { ...medsCopy[medicineIndex] };
        const ev = { value: answer, source_text: `Doctor clarification: ${answer}`, status: 'doctor_corrected' as const, confidence: 1.0 };
        if (field.includes('strength')) targetMed.strength = ev;
        else if (field.includes('duration')) targetMed.duration = ev;
        medsCopy[medicineIndex] = targetMed;
        await handleUpdate({ medicines: medsCopy });
      } else if (field === 'patient.name') {
        await handleUpdate({ patient: { ...prescription.patient, name: { value: answer, source_text: `Doctor clarification: ${answer}`, status: 'doctor_corrected', confidence: 1.0 } } });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply clarification.');
    }
  };

  const handleConfirm = async (doctorName: string) => {
    if (!prescription) return;
    const confirmed = await apiClient.confirmPrescription(prescription.id, doctorName);
    setPrescription(confirmed);
    setIsGlobalEditMode(false);
    setToast('Prescription confirmed! PDF download is now unlocked.');
  };

  const handleDelete = async () => {
    if (!prescription) return;
    if (!window.confirm('Permanently delete this prescription and all associated audio/transcripts? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await apiClient.deletePrescription(prescription.id);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete prescription.');
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="py-24 flex justify-center"><LoadingSpinner size="lg" label="Loading prescription…" /></div>;

  if (error || !prescription) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Prescription Error</h2>
        <p className="text-sm text-slate-600">{error || 'Prescription not found.'}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    );
  }

  const isConfirmed = prescription.status === 'confirmed';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Sticky top action bar */}
      <div className="clinical-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {prescription.patient.name.value || 'Unnamed Patient'}
              </h1>
              <StatusBadge status={prescription.status} size="md" />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200 font-tabular">
                v{prescription.version}
              </span>
              {isGlobalEditMode && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 animate-pulse">
                  Edit Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              #{prescription.id.slice(0, 8)} · {new Date(prescription.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit / Save toggle */}
          {isGlobalEditMode ? (
            <>
              <button
                type="button"
                onClick={() => setIsGlobalEditMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save All Edits'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsGlobalEditMode(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600" /> Edit Prescription
            </button>
          )}

          <button
            type="button"
            onClick={() => loadPrescription(prescription.id)}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <RotateCw className="w-3.5 h-3.5" /> Reload
          </button>

          {/* Confirmation gate */}
          {!isConfirmed ? (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" /> Doctor Confirmation
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confirmed
            </span>
          )}

          {/* PDF download (gated) */}
          <a
            href={isConfirmed ? apiClient.getPdfDownloadUrl(prescription.id) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!isConfirmed) { e.preventDefault(); alert('Prescription must be confirmed by the attending physician before PDF can be downloaded.'); }
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
              isConfirmed ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
            }`}
            title={isConfirmed ? 'Download PDF' : 'Locked — confirm first'}
          >
            <Download className="w-4 h-4" />
            {isConfirmed ? 'Download PDF' : 'PDF Locked'}
          </a>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: clinical forms */}
        <div className="lg:col-span-7 space-y-4">
          <PatientInfoCard
            patient={prescription.patient}
            onChange={(p) => handleUpdate({ patient: p })}
            onSelectPhrase={setHighlightPhrase}
            isGlobalEditMode={isGlobalEditMode}
          />
          <ClinicalInfoCard
            clinical={prescription.clinical}
            onChange={(c) => handleUpdate({ clinical: c })}
            onSelectPhrase={setHighlightPhrase}
            isGlobalEditMode={isGlobalEditMode}
          />
          <MedicineTable
            medicines={prescription.medicines}
            onChange={(meds) => handleUpdate({ medicines: meds })}
            onSelectPhrase={setHighlightPhrase}
            isGlobalEditMode={isGlobalEditMode}
          />
        </div>

        {/* Right: AI provenance + tools */}
        <div className="lg:col-span-5 space-y-4">
          <VoiceEditPanel onApplyCommand={handleVoiceEditCommand} />
          <ClarificationPanel questions={prescription.clarification_questions} onAnswer={handleClarificationAnswer} />
          <ValidationPanel issues={prescription.validation_issues} />
          <TranscriptViewer transcript={prescription.raw_transcript} audioUrl={prescription.audio_url} highlightPhrase={highlightPhrase} />
          <AuditTimeline prescriptionId={prescription.id} />
        </div>
      </div>

      {/* Confirmation modal */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onDismiss={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        patientName={prescription.patient.name.value}
        medicineCount={prescription.medicines.length}
        validationIssues={prescription.validation_issues}
      />
    </div>
  );
};
