import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  User,
  ShieldCheck,
  Building,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  FileBadge,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_DOCTORS, DoctorProfile } from '../types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { doctor, login } = useAuth();

  const [activeTab, setActiveTab] = useState<'demo' | 'custom'>('demo');
  const [customName, setCustomName] = useState(doctor.name || '');
  const [customReg, setCustomReg] = useState(doctor.registrationNumber || '');
  const [customDept, setCustomDept] = useState(doctor.department || 'Outpatient Department (OPD)');
  const [customHospital, setCustomHospital] = useState(doctor.hospital || 'Metro Specialty Hospital');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectDemoDoctor = (demoDoc: DoctorProfile) => {
    login(demoDoc);
    navigate('/dashboard');
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setError('Please enter your full name and medical credentials.');
      return;
    }
    if (!customReg.trim()) {
      setError('Medical Council Registration number is required for prescription validation.');
      return;
    }

    const initials = customName
      .replace(/^Dr\.?\s+/i, '')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'DR';

    const newProfile: DoctorProfile = {
      id: `doc_${Date.now()}`,
      name: customName.trim(),
      title: 'Attending Physician',
      department: customDept.trim() || 'Outpatient Department (OPD)',
      registrationNumber: customReg.trim(),
      hospital: customHospital.trim() || 'General Hospital & Clinic',
      avatarInitials: initials,
    };

    login(newProfile);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-6 font-sans relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top return link */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Product Overview
        </button>

        <span className="text-[11px] text-slate-500 font-mono">Workstation v1.0</span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-7 space-y-6 relative z-10 animate-in">
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Doctor Workstation Sign-In</h1>
            <p className="text-xs text-slate-400">Voice Prescription Writer &bull; Outpatient Portal</p>
          </div>
        </div>

        {/* Tab switcher: Quick Demo vs Custom */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/80 border border-slate-700 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setError(null); }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'demo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1-Click Demo Profiles
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('custom'); setError(null); }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Credentials
          </button>
        </div>

        {/* Tab 1: 1-Click Demo Profiles */}
        {activeTab === 'demo' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400">
              Select a demo physician profile to instantly access the outpatient workspace with specialty settings:
            </p>

            <div className="space-y-2.5">
              {DEMO_DOCTORS.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDemoDoctor(doc)}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-blue-500 hover:bg-slate-700/50 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-900/80 text-blue-300 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {doc.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{doc.department}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Reg: {doc.registrationNumber}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  >
                    Select <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Credentials Form */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCustomLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Doctor Full Name & Credentials
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Dr. Vikram Patel, MD"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Medical Council Registration No.
              </label>
              <div className="relative">
                <FileBadge className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customReg}
                  onChange={(e) => setCustomReg(e.target.value)}
                  placeholder="e.g. KMC-2019-48210"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    placeholder="Outpatient / OPD"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hospital / Clinic</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customHospital}
                    onChange={(e) => setCustomHospital(e.target.value)}
                    placeholder="Clinic name"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Station PIN</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Default PIN: 1234"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-950/60 border border-rose-900 p-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Sign In to Workstation <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Security & Audit notice */}
        <div className="pt-3 border-t border-slate-700/60 flex items-start gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Authorized clinical session. Prescriptions approved during this session are digitally bound to your Medical Council registration ID.
          </span>
        </div>
      </div>
    </div>
  );
};
