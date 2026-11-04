import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (doctorName: string) => Promise<void>;
  patientName?: string;
  medicineCount: number;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  medicineCount,
}) => {
  const [doctorName, setDoctorName] = useState('Dr. Ananya Rao, MD');
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked || !doctorName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(doctorName.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="font-bold text-base">Doctor Prescription Confirmation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <p>
            <b>Patient:</b> {patientName || 'Unnamed Patient'}
          </p>
          <p>
            <b>Prescribed Medications:</b> {medicineCount} item(s)
          </p>
          <p className="text-slate-500 italic">
            By confirming, you verify that you have checked drug strengths, dosages, routes,
            frequencies, and patient demographics for clinical accuracy.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Attending Physician</label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Doctor's Full Name & Credentials"
          />
        </div>

        <div className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            id="reviewCheck"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <label htmlFor="reviewCheck" className="text-xs text-slate-700 select-none cursor-pointer">
            I confirm that I have reviewed the prescription for medical correctness, and I authorize
            issuing this prescription.
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isChecked || !doctorName.trim() || isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Confirming...' : 'Confirm & Authorize Prescription'}
          </button>
        </div>
      </div>
    </div>
  );
};

