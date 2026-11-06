import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  ShieldCheck,
  Hospital,
  ArrowRight,
  ArrowLeft,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { DoctorStation } from '../components/auth/DoctorStation';
import { AdminBlock } from '../components/admin/AdminBlock';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'portal' | 'station' | 'admin'>('portal');

  const handleEnterDoctorStation = () => {
    setView('station');
  };

  const handleToggleAdminPortal = () => {
    setView((prev) => (prev === 'admin' ? 'portal' : 'admin'));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded p-1"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Voice Rx <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Hospital Portal</span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">Clinical Scribing &amp; Prescription Workstation</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {view === 'portal' && (
              <button
                type="button"
                onClick={handleToggleAdminPortal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Admin Access</span>
              </button>
            )}

            {view !== 'portal' && (
              <button
                type="button"
                onClick={() => setView('portal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Portal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* View 1: Initial Portal Screen with Single Login Button */}
        {view === 'portal' && (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-8 text-center">
              {/* Institutional Badge */}
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Hospital className="w-7 h-7" />
              </div>

              <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Clinical Workstation Access
              </h1>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed max-w-xs mx-auto">
                Secure electronic health record scribing portal for registered attending medical physicians.
              </p>

              {/* Single Primary Login Button */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleEnterDoctorStation}
                  className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Enter Doctor Station</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Secondary Admin Toggle */}
                <button
                  type="button"
                  onClick={() => setView('admin')}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Administrative Portal &amp; Roster</span>
                </button>
              </div>

              {/* Trust Marker */}
              <div className="mt-8 pt-6 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Protected by Hospital Identity &amp; Secret Code Verification</span>
              </div>
            </div>

            {/* Back to product showcase link */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Public Product Showcase
              </button>
            </div>
          </div>
        )}

        {/* View 2: Doctor Station Secret Code Entry */}
        {view === 'station' && (
          <DoctorStation onBack={() => setView('portal')} />
        )}

        {/* View 3: Admin Roster & Analytics */}
        {view === 'admin' && (
          <AdminBlock onBack={() => setView('portal')} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Voice Rx Outpatient Scribing Station &bull; CDSCO &amp; NABH Compliant</span>
          <a
            href="https://github.com/shreyabhat75/Voice-Prescription-Writer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
          >
            GitHub Repository <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};
