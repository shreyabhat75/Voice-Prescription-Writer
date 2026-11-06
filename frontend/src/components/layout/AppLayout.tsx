import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Navigate, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import {
  Bell,
  Wifi,
  WifiOff,
  User,
  LogOut,
  ExternalLink,
  ChevronDown,
  LayoutDashboard,
  Mic,
  History,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { doctor, isAuthenticated, logout } = useAuth();

  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sttProvider, setSttProvider] = useState<string>('');
  const [clock, setClock] = useState(new Date());
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.checkHealth()
      .then((h) => {
        setSystemStatus('online');
        setSttProvider(h.stt_provider || '');
      })
      .catch(() => setSystemStatus('offline'));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Route protection: redirect unauthenticated visitors to /login
  if (!isAuthenticated || !doctor) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 shadow-xs relative z-20">
          {/* System status */}
          <div className="flex items-center gap-2">
            {systemStatus === 'checking' ? (
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                <span className="text-xs font-medium">Checking system…</span>
              </div>
            ) : systemStatus === 'online' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-700">System Ready</span>
                </div>
                {sttProvider && (
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide hidden sm:inline">
                    STT: {sttProvider}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
                <WifiOff className="w-3 h-3 text-rose-500" />
                <span className="text-[11px] font-semibold text-rose-600">Backend Offline</span>
              </div>
            )}
          </div>

          {/* Right side: doctor identity + clock + notification */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-700 font-tabular">{timeStr}</p>
              <p className="text-[10px] text-slate-400">{dateStr}</p>
            </div>

            <button
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer hidden sm:block"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Doctor Profile Menu */}
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {doctor.avatarInitials || 'DR'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[140px]">
                    {doctor.name.split(',')[0]}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate max-w-[140px]">
                    {doctor.department}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{doctor.name}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{doctor.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Reg: {doctor.registrationNumber}</p>
                    <p className="text-[10px] text-slate-400">{doctor.hospital}</p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { setProfileMenuOpen(false); navigate('/'); }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      Product Overview / Landing
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProfileMenuOpen(false); navigate('/login'); }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Switch Doctor Station
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar for Clinicians */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-4 py-1.5 flex items-center justify-around safe-area-bottom">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/new"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-[10px] font-bold transition-all shadow-xs ${
                isActive ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-blue-600/90 text-white hover:bg-blue-600'
              }`
            }
          >
            <Mic className="w-4 h-4" />
            <span>New Rx</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
};
