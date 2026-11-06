import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Activity,
  Users,
  LogIn,
  ClipboardCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminBlockProps {
  onBack?: () => void;
}

export const AdminBlock: React.FC<AdminBlockProps> = ({ onBack }) => {
  const { roster, addDoctor, removeDoctor } = useAuth();
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics'>('roster');
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [doctorToRemove, setDoctorToRemove] = useState<{ id: string; name: string } | null>(null);

  // New Doctor Form State
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [hospital, setHospital] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Analytics Metrics
  const totalDoctors = roster.length;
  const totalLogins = roster.reduce((sum, d) => sum + (d.loginCount || 0), 0);
  const totalPatientsAttended = roster.reduce((sum, d) => sum + (d.patientsAttendedCount || 0), 0);
  const avgPatientsPerDoctor = totalDoctors > 0 ? (totalPatientsAttended / totalDoctors).toFixed(1) : '0';

  const resetForm = () => {
    setName('');
    setTitle('');
    setDepartment('');
    setHospital('');
    setRegistrationNumber('');
    setSecretCode('');
    setFormError(null);
    setIsAddingDoctor(false);
  };

  const handleAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim()) {
      setFormError('Please enter doctor full name.');
      return;
    }
    if (!registrationNumber.trim()) {
      setFormError('Please enter medical registration number.');
      return;
    }
    if (!secretCode.trim()) {
      setFormError('Please assign a secret code for doctor authentication.');
      return;
    }

    const added = addDoctor({
      name: name.trim(),
      title: title.trim() || 'Consultant Physician',
      department: department.trim() || 'General Medicine',
      hospital: hospital.trim() || 'Apex Specialty Hospital',
      registrationNumber: registrationNumber.trim(),
      avatarInitials: '',
      secretCode: secretCode.trim(),
    });

    if (added) {
      setFormSuccess(`Dr. ${name.trim()} enrolled successfully with secret code ${secretCode.trim().toUpperCase()}.`);
      resetForm();
      setTimeout(() => setFormSuccess(null), 4000);
    } else {
      setFormError('Failed to add doctor. A physician with this secret code already exists in the roster.');
    }
  };

  const handleConfirmRemoveDoctor = () => {
    if (!doctorToRemove) return;
    removeDoctor(doctorToRemove.id);
    setDoctorToRemove(null);
    setFormSuccess('Physician workstation credentials revoked and removed from roster.');
    setTimeout(() => setFormSuccess(null), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Return to Doctor Station
          </button>
        ) : <div />}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Doctor Management ({roster.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Performance Analytics
          </button>
        </div>
      </div>

      {/* Admin Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Hospital Administration Portal
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Supervisor Access
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Manage authorized physicians, secret codes, and audit clinical workstation performance
            </p>
          </div>
        </div>

        {activeTab === 'roster' && !isAddingDoctor && (
          <button
            type="button"
            onClick={() => setIsAddingDoctor(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <UserPlus className="w-4 h-4" />
            Add New Doctor
          </button>
        )}
      </div>

      {/* Success Notification */}
      {formSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Tab: Doctor Management */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Add Doctor Modal/Form Panel */}
          {isAddingDoctor && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 relative">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  Enroll New Physician into Workstation Roster
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddDoctorSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Doctor Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Patel, MBBS, MS"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Designation / Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Consultant Neurologist"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Neurology &amp; Stroke Unit"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital / Clinic Facility
                    </label>
                    <input
                      type="text"
                      value={hospital}
                      onChange={(e) => setHospital(e.target.value)}
                      placeholder="e.g. Apex Multi-Specialty Hospital"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medical Registration Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="e.g. KMC-2020-71829"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Individual Secret Code / PIN <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      placeholder="e.g. DOC-404"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Unique alphanumeric code used to authenticate at Doctor Station</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Save &amp; Enroll Doctor
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Roster Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Active Doctor Roster
                </h3>
                <p className="text-xs text-slate-500">Authorized medical staff credentialed to write prescriptions</p>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {roster.length} Physician{roster.length !== 1 ? 's' : ''} Enrolled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Physician</th>
                    <th className="px-6 py-3">Specialization &amp; Hospital</th>
                    <th className="px-6 py-3">Medical Reg No</th>
                    <th className="px-6 py-3">Assigned Secret Code</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {roster.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {doc.avatarInitials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{doc.name}</div>
                            <div className="text-[11px] text-slate-500">{doc.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-slate-800 font-medium">{doc.department}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{doc.hospital}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {doc.registrationNumber}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-[11px]">
                          <KeyRound className="w-3 h-3 text-blue-600" />
                          {doc.secretCode}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setDoctorToRemove({ id: doc.id, name: doc.name })}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Revoke Credentials &amp; Remove Doctor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <p className="font-medium text-slate-700 mb-1">Roster is empty</p>
                        <p className="text-xs text-slate-500">Click &quot;Add New Doctor&quot; to enroll physicians.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Doctor Performance Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Physicians</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{totalDoctors}</div>
              <p className="text-[11px] text-slate-500 mt-1">Enrolled across departments</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Workstation Logins</span>
                <LogIn className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{totalLogins}</div>
              <p className="text-[11px] text-slate-500 mt-1">Total login occurrences</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Patients Attended</span>
                <ClipboardCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{totalPatientsAttended}</div>
              <p className="text-[11px] text-slate-500 mt-1">Prescriptions verified &amp; signed</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Consultations</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{avgPatientsPerDoctor}</div>
              <p className="text-[11px] text-slate-500 mt-1">Patients per active physician</p>
            </div>
          </div>

          {/* Performance Analytics Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Doctor Performance Analytics
                </h3>
                <p className="text-xs text-slate-500">Live audit of physician login counts and patients attended</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                Live Audit Ledger
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Physician</th>
                    <th className="px-6 py-3">Department &amp; Hospital</th>
                    <th className="px-6 py-3">Medical Reg No</th>
                    <th className="px-6 py-3 text-center">Login Count</th>
                    <th className="px-6 py-3 text-center">Patients Attended</th>
                    <th className="px-6 py-3 text-right">Clinical Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {roster.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                            {doc.avatarInitials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{doc.name}</div>
                            <div className="text-[11px] text-slate-500">{doc.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-slate-800 font-medium">{doc.department}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{doc.hospital}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {doc.registrationNumber}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <LogIn className="w-3 h-3 text-emerald-600" />
                          {doc.loginCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                          <Award className="w-3 h-3 text-blue-600" />
                          {doc.patientsAttendedCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Credentialed
                        </span>
                      </td>
                    </tr>
                  ))}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No physicians enrolled in roster.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Doctor Modal */}
      {doctorToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 animate-scaleIn">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 text-center mb-1">Revoke Physician Access?</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Are you sure you want to remove <strong>{doctorToRemove.name}</strong> from the doctor station? Their secret code will be deactivated immediately.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDoctorToRemove(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveDoctor}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
