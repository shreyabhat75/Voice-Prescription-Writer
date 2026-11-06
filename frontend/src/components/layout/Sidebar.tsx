import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Mic,
  History,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/new',       icon: Mic,             label: 'New Prescription'  },
  { to: '/history',   icon: History,         label: 'History & Audit'   },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { doctor, logout } = useAuth();

  return (
    <aside
      className={`flex flex-col bg-[#0F172A] border-r border-[#1E293B] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-56'
      } min-h-screen flex-shrink-0 select-none`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-[#1E293B] ${collapsed ? 'justify-center px-2' : ''}`}>
        <div
          onClick={() => navigate('/dashboard')}
          className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 cursor-pointer shadow-md shadow-blue-600/30 hover:scale-105 transition-transform"
        >
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="cursor-pointer" onClick={() => navigate('/dashboard')}>
            <p className="text-white font-bold text-sm leading-none flex items-center gap-1.5">
              Voice Rx
            </p>
            <p className="text-slate-500 text-[10px] font-medium mt-0.5">Clinical Prescriptions</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Public Landing & Logout Links */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-[#1E293B] space-y-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Product Landing</span>
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Switch Station</span>
          </button>
        </div>
      )}

      {/* Physician profile */}
      <div className={`px-2 py-3 border-t border-[#1E293B] ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-full bg-blue-800 text-blue-200 font-bold text-[10px] flex items-center justify-center cursor-pointer"
            title={`${doctor.name} (${doctor.department})`}
            onClick={() => navigate('/login')}
          >
            {doctor.avatarInitials || 'DR'}
          </div>
        ) : (
          <div
            onClick={() => navigate('/login')}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            title="Click to switch physician station"
          >
            <div className="w-7 h-7 rounded-full bg-blue-800 text-blue-200 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
              {doctor.avatarInitials || 'DR'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{doctor.name.split(',')[0]}</p>
              <p className="text-[10px] text-slate-400 truncate">{doctor.department}</p>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="w-full flex items-center justify-center py-3 text-slate-600 hover:text-slate-400 transition-colors border-t border-[#1E293B] cursor-pointer"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};
