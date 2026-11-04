import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, Stethoscope, ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new', label: 'New Prescription', icon: PlusCircle },
    { to: '/history', label: 'History & Audits', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
            Voice Prescription
          </h1>
          <p className="text-[10px] text-blue-400 font-medium">AI Clinical Assistant</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Safety & Compliance Badge */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Safety Enforced</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Source-grounded evidence & doctor confirmation gate active.
        </p>
      </div>
    </aside>
  );
};

