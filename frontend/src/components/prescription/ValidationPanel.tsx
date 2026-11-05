import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { ValidationIssue } from '../../types';

interface ValidationPanelProps {
  issues: ValidationIssue[];
}

const ICONS = {
  error:   <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
  info:    <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
};

const COLORS = {
  error:   'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div className="clinical-card p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-bold">Validation Clear</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">All fields passed validation checks.</p>
      </div>
    );
  }

  const errors   = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos    = issues.filter((i) => i.severity === 'info');

  return (
    <div className="clinical-card p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <AlertCircle className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-bold text-slate-800">Validation Issues ({issues.length})</h3>
      </div>

      {[
        { group: errors,   severity: 'error'   as const },
        { group: warnings, severity: 'warning' as const },
        { group: infos,    severity: 'info'    as const },
      ].map(({ group, severity }) =>
        group.length > 0 ? (
          <div key={severity} className="space-y-1.5">
            {group.map((issue, i) => (
              <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-xs ${COLORS[severity]}`}>
                {ICONS[severity]}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold capitalize">{issue.field.replace(/_/g, ' ')}</span>
                  {issue.medicine_index !== undefined && (
                    <span className="ml-1 text-[10px] opacity-70">· Medicine #{issue.medicine_index + 1}</span>
                  )}
                  <p className="font-normal mt-0.5">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
};
