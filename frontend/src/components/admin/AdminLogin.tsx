import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface AdminLoginProps {
  onAuthenticated: () => void;
  onBack?: () => void;
}

const DEFAULT_ADMIN_KEY = 'ADMIN-2025';
const ACCEPTED_ADMIN_KEYS = ['ADMIN-2025', 'ADMIN-101', 'HOSP-ADMIN', 'ADMIN123'];

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated, onBack }) => {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      setErrorMessage('Please enter the administrative authorization key.');
      return;
    }

    setIsSubmitting(true);

    // Check custom configured admin key or standard accepted keys
    const customKey = localStorage.getItem('voicerx_admin_key');
    const isValid =
      (customKey && cleanPasscode.toLowerCase() === customKey.trim().toLowerCase()) ||
      ACCEPTED_ADMIN_KEYS.some((k) => k.toLowerCase() === cleanPasscode.toLowerCase());

    setTimeout(() => {
      setIsSubmitting(false);
      if (isValid) {
        onAuthenticated();
      } else {
        setErrorMessage('Invalid administrative authorization key. Access denied.');
      }
    }, 150);
  };

  const handleUseDemoKey = () => {
    setPasscode(DEFAULT_ADMIN_KEY);
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

      {/* Admin Authentication Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Hospital Administration
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Restricted
              </span>
            </h2>
            <p className="text-xs text-slate-500">Security &amp; Roster Clearance Verification</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Access to physician roster controls and hospital performance metrics requires authorized <strong>administrative clearance</strong>.
        </p>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-800">Clearance Verification Failed</p>
              <p className="text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="adminPasscode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Administrator Master Key / Passcode
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                id="adminPasscode"
                type={showPasscode ? 'text' : 'password'}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter administrative key"
                className="w-full pl-9 pr-10 py-3 rounded-lg border border-slate-300 text-base sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                tabIndex={-1}
                aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer focus:outline-none"
              >
                {showPasscode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>Verify &amp; Enter Administrative Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Hospital RBAC Protected
          </span>
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="text-amber-700 hover:text-amber-800 font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {showHelper ? 'Hide Key Info' : 'Demo Passkey'}
          </button>
        </div>

        {/* Demo key helper box */}
        {showHelper && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-amber-900 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Default Key: <strong className="font-mono text-slate-900">{DEFAULT_ADMIN_KEY}</strong>
              </span>
              <button
                type="button"
                onClick={handleUseDemoKey}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Auto-fill
              </button>
            </div>
            <p className="text-[10px] text-amber-800 mt-1.5">
              In production hospital deployments, administrative keys are managed through the hospital IAM directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
