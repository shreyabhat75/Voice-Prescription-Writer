import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { ValidationIssue } from '../../types';

interface ValidationPanelProps {
  issues: ValidationIssue[];
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
        <Info className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>No validation issues detected. Prescription is complete and grounded.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
        Clinical Validation Checks ({issues.length})
      </h3>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {issues.map((issue, idx) => {
          let bg = 'bg-slate-50 border-slate-200 text-slate-700';
          let Icon = Info;
          let iconColor = 'text-slate-500';

          if (issue.severity === 'error') {
            bg = 'bg-rose-50 border-rose-200 text-rose-800';
            Icon = AlertCircle;
            iconColor = 'text-rose-600';
          } else if (issue.severity === 'warning') {
            bg = 'bg-amber-50 border-amber-200 text-amber-800';
            Icon = AlertTriangle;
            iconColor = 'text-amber-600';
          }

          return (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2 rounded-lg border text-xs leading-relaxed ${bg}`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1">
                <span className="font-semibold">{issue.field}: </span>
                <span>{issue.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

