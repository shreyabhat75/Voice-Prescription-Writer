import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AppLayout: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [sttProvider, setSttProvider] = useState<string>('');
  const [clock, setClock] = useState(new Date());

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

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
          {/* System status */}
          <div className="flex items-center gap-2">
            {systemStatus === 'checking' ? (
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                <span className="text-xs font-medium">Checking system...</span>
              </div>
            ) : systemStatus === 'online' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-700">System Operational</span>
                </div>
                {sttProvider && (
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    STT: {sttProvider}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
                <WifiOff className="w-3 h-3 text-red-500" />
                <span className="text-[11px] font-semibold text-red-600">Backend Offline</span>
              </div>
            )}
          </div>

          {/* Right side: clock + notifications */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700 font-tabular">{timeStr}</p>
              <p className="text-[10px] text-slate-400">{dateStr}</p>
            </div>

            <button
              type="button"
              className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
