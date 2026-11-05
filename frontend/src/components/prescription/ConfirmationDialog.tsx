import React, { useState } from 'react';
import { ShieldCheck, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { ValidationIssue } from '../../types';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (doctorName: string) => Promise<void>;
  patientName?: string;
  medicineCount: number;
  validationIssues?: ValidationIssue[];
}

const DOCTOR_STORAGE_KEY = 'voicerx_last_doctor';

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen, onClose, onConfirm, patientName, medicineCount, validationIssues = [],
}) => {
  const [doctorName, setDoctorName] = useState(() =>
    localStorage.getItem(DOCTOR_STORAGE_KEY) || 'Dr. Ananya Rao, MD'
  );
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' });

  const blockingErrors = validationIssues.filter((i) => i.severity === 'error');
  const canConfirm = isChecked && doctorName.trim().length > 0 && blockingErrors.length === 0 && !isSubmitting;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      localStorage.setItem(DOCTOR_STORAGE_KEY, doctorName.trim());
      await onConfirm(doctorName.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full animate-in slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base">Doctor Prescription Confirmation</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Review checklist */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Review Checklist</p>
            <div className="space-y-2">
              <ChecklistItem label="Patient" value={patientName || 'Unnamed Patient'} ok={!!patientName} />
              <ChecklistItem label="Medications" value={`${medicineCount} item${medicineCount !== 1 ? 's' : ''} prescribed`} ok={medicineCount > 0} />
              <ChecklistItem label="Blocking Errors" value={blockingErrors.length === 0 ? 'None' : `${blockingErrors.length} error(s) found`} ok={blockingErrors.length === 0} />
            </div>
          </div>

          {/* Blocking errors (if any) */}
          {blockingErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-red-700">
                <AlertTriangle className="w-3.5 h-3.5" />
                <p className="text-xs font-semibold">Resolve before confirming:</p>
              </div>
              {blockingErrors.map((err, i) => (
                <p key={i} className="text-[11px] text-red-600 pl-5">• {err.message}</p>
              ))}
            </div>
          )}

          {/* Physician name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Attending Physician</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Full name & credentials"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400"
            />
          </div>

          {/* Immutable timestamp */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Confirmation timestamp: <strong className="text-slate-700 font-tabular">{confirmedAt}</strong></span>
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="confirmCheck"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="confirmCheck" className="text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
              I confirm I have reviewed drug strengths, dosages, routes, frequencies, and patient demographics for clinical accuracy, and authorize issuing this prescription.
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isSubmitting ? 'Confirming…' : 'Confirm & Authorize'}
          </button>
        </div>
      </div>
    </div>
  );
};

function ChecklistItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-700 font-semibold">{value}</span>
        {ok
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          : <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        }
      </div>
    </div>
  );
}
