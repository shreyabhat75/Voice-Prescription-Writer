import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Save,
  ArrowLeft,
  RotateCw,
  FileCheck,
  AlertCircle,
  Edit,
  X,
  Volume2,
  Trash2,
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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadPrescription(id);
  }, [id]);

  const loadPrescription = async (rxId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getPrescription(rxId);
      setPrescription(data);
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
        patient: updatedFields.patient || prescription.patient,
        clinical: updatedFields.clinical || prescription.clinical,
        medicines: updatedFields.medicines || prescription.medicines,
      });
      setPrescription(updated);
      showToast('Prescription edits saved & re-validated.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!prescription) return;
    setIsGlobalEditMode(false);
    await handleUpdate({
      patient: prescription.patient,
      clinical: prescription.clinical,
      medicines: prescription.medicines,
    });
  };

  const handleVoiceEditCommand = async (command: string) => {
    if (!prescription) return;
    const res = await apiClient.applyVoiceEdit(prescription.id, command);
    setPrescription(res.prescription);
    return res;
  };

  const handleClarificationAnswer = async (
    field: string,
    answer: string,
    medicineIndex?: number
  ) => {
    if (!prescription) return;
    try {
      if (field.startsWith('medicines') && medicineIndex !== undefined) {
        const medsCopy = [...prescription.medicines];
        const targetMed = { ...medsCopy[medicineIndex] };
        if (field.includes('strength')) {
          targetMed.strength = {
            value: answer,
            source_text: `Doctor clarification: ${answer}`,
            status: 'doctor_corrected',
            confidence: 1.0,
          };
        } else if (field.includes('duration')) {
          targetMed.duration = {
            value: answer,
            source_text: `Doctor clarification: ${answer}`,
            status: 'doctor_corrected',
            confidence: 1.0,
          };
        }
        medsCopy[medicineIndex] = targetMed;
        await handleUpdate({ medicines: medsCopy });
      } else if (field === 'patient.name') {
        const patientCopy = {
          ...prescription.patient,
          name: {
            value: answer,
            source_text: `Doctor clarification: ${answer}`,
            status: 'doctor_corrected' as const,
            confidence: 1.0,
          },
        };
        await handleUpdate({ patient: patientCopy });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply clarification.');
    }
  };

  const handleConfirmPrescription = async (doctorName: string) => {
    if (!prescription) return;
    try {
      const confirmed = await apiClient.confirmPrescription(prescription.id, doctorName);
      setPrescription(confirmed);
      setIsGlobalEditMode(false);
      showToast('Prescription confirmed successfully! PDF download is now unlocked.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Confirmation failed.');
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePrescription = async () => {
    if (!prescription) return;
    if (
      window.confirm(
        'Are you sure you want to permanently delete this prescription and all associated audio/transcripts? This action cannot be undone.'
      )
    ) {
      setIsDeleting(true);
      try {
        await apiClient.deletePrescription(prescription.id);
        navigate('/', { replace: true });
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || 'Failed to delete prescription.');
        setIsDeleting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" label="Loading prescription details..." />
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">Prescription Error</h2>
        <p className="text-sm text-slate-600">{error || 'Prescription not found.'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>
      </div>
    );
  }

  const isConfirmed = prescription.status === 'confirmed';

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <FileCheck className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Clinical Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">
                {prescription.patient.name.value || 'Unnamed Patient'}
              </h1>
              <StatusBadge status={prescription.status} />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                v{prescription.version}
              </span>
              {isGlobalEditMode && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 animate-pulse">
                  Edit Mode Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Prescription #{prescription.id.slice(0, 8)} &bull; Created{' '}
              {new Date(prescription.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Explicit Edit / Save Toggle */}
          {isGlobalEditMode ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGlobalEditMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Edits'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsGlobalEditMode(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Edit className="w-4 h-4 text-blue-600" />
              Edit Prescription Fields
            </button>
          )}

          <button
            type="button"
            onClick={() => loadPrescription(prescription.id)}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
            title="Reload from database"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reload
          </button>

          {/* Confirmation Gate Button */}
          {!isConfirmed ? (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              Doctor Confirmation Gate
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Doctor Confirmed
            </span>
          )}

          {/* Download PDF Button with Strict Gate */}
          <a
            href={isConfirmed ? apiClient.getPdfDownloadUrl(prescription.id) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!isConfirmed) {
                e.preventDefault();
                alert(
                  'Safety Rule Enforced: Unconfirmed prescriptions cannot be exported to PDF. Please confirm the prescription first.'
                );
              }
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all ${
              isConfirmed
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
            }`}
            title={
              isConfirmed
                ? 'Download Final Clinical PDF'
                : 'Locked: Must be confirmed by attending physician before PDF generation'
            }
          >
            <Download className="w-4 h-4" />
            {isConfirmed ? 'Download PDF' : 'PDF Locked (Unconfirmed)'}
          </a>

          {/* Delete Prescription Button */}
          <button
            type="button"
            onClick={handleDeletePrescription}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
            title="Permanently delete prescription"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Clinical Forms) & Right Column (Verification & Voice Commands) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Clinical Fields */}
        <div className="lg:col-span-7 space-y-4">
          <PatientInfoCard
            patient={prescription.patient}
            onChange={(updatedPatient) => handleUpdate({ patient: updatedPatient })}
            onSelectPhrase={(phrase) => setHighlightPhrase(phrase)}
            isGlobalEditMode={isGlobalEditMode}
          />

          <ClinicalInfoCard
            clinical={prescription.clinical}
            onChange={(updatedClinical) => handleUpdate({ clinical: updatedClinical })}
            onSelectPhrase={(phrase) => setHighlightPhrase(phrase)}
            isGlobalEditMode={isGlobalEditMode}
          />

          <MedicineTable
            medicines={prescription.medicines}
            onChange={(updatedMeds) => handleUpdate({ medicines: updatedMeds })}
            onSelectPhrase={(phrase) => setHighlightPhrase(phrase)}
            isGlobalEditMode={isGlobalEditMode}
          />
        </div>

        {/* Right Column (5 cols): AI Provenance, Voice Commands & Clarification */}
        <div className="lg:col-span-5 space-y-4">
          <VoiceEditPanel onApplyCommand={handleVoiceEditCommand} />

          <ClarificationPanel
            questions={prescription.clarification_questions}
            onAnswer={handleClarificationAnswer}
          />

          <ValidationPanel issues={prescription.validation_issues} />

          <TranscriptViewer
            transcript={prescription.raw_transcript}
            audioUrl={prescription.audio_url}
            highlightPhrase={highlightPhrase}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmPrescription}
        patientName={prescription.patient.name.value}
        medicineCount={prescription.medicines.length}
      />
    </div>
  );
};
