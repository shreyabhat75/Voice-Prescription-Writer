import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Lock,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DoctorStationProps {
  onBack?: () => void;
}

export const DoctorStation: React.FC<DoctorStationProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { authenticateWithSecretCode, roster } = useAuth();
  const [secretCode, setSecretCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!secretCode || !secretCode.trim()) {
      setErrorMessage('Please enter your individual doctor secret code.');
      return;
    }

    setIsSubmitting(true);
    const result = authenticateWithSecretCode(secretCode.trim());
    setIsSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Invalid doctor secret code. Please verify credentials or contact administration.');
    }
  };

  const handleSelectDemoCode = (code: string) => {
    setSecretCode(code);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Back button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-6 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Portal Overview
        </button>
      )}

      {/* Main Doctor Station Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Doctor Station
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Workstation Terminal
              </span>
            </h2>
            <p className="text-xs text-slate-500">Authorized Physician Authentication</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Please enter your assigned <strong>individual secret code</strong> to unlock your clinical workspace and patient charts.
        </p>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-800">Authentication Denied</p>
              <p className="text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="doctorSecretCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Doctor Secret Code / Workstation PIN
            </label>
            <div className="relative">
              <input
                id="doctorSecretCode"
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={secretCode}
                onChange={(e) => {
                  setSecretCode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter secret code (e.g. DOC-101)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 placeholder:text-slate-400 placeholder:font-sans uppercase"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>Unlock Workstation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            End-to-End Encrypted Session
          </span>
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {showHelper ? 'Hide Roster Codes' : 'View Demo Codes'}
          </button>
        </div>

        {/* Helper codes for clinical review */}
        {showHelper && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <p className="font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              Active Physician Roster:
            </p>
            <div className="space-y-1.5">
              {roster.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDemoCode(doc.secretCode)}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-medium text-slate-800">{doc.name}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({doc.department})</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {doc.secretCode}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Click any physician to autofill their secret code</p>
          </div>
        )}
      </div>
    </div>
  );
};
