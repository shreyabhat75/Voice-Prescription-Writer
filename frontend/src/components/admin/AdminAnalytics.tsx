import React from 'react';
import {
  Users,
  LogIn,
  ClipboardCheck,
  TrendingUp,
  Activity,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminAnalytics: React.FC = () => {
  const { roster } = useAuth();

  const totalDoctors = roster.length;
  const totalLogins = roster.reduce((sum, d) => sum + (d.loginCount || 0), 0);
  const totalPatientsAttended = roster.reduce((sum, d) => sum + (d.patientsAttendedCount || 0), 0);
  const avgPatientsPerDoctor = totalDoctors > 0 ? (totalPatientsAttended / totalDoctors).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
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
          <p className="text-[11px] text-slate-500 mt-1">Doctor shift sign-ins recorded</p>
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

      {/* Individual Physician Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Doctor Performance Analytics
            </h3>
            <p className="text-xs text-slate-500">Live shift logins and clinical patient consultations attended</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
            Real-time Audit Ledger
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
  );
};
