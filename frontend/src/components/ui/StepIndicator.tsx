import React from 'react';
import { Mic, FileSearch, Cpu, CheckCircle } from 'lucide-react';

type Step = 'recording' | 'review' | 'structuring' | 'done';

interface StepIndicatorProps {
  currentStatus: Step;
}

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'recording', label: 'Dictate', icon: <Mic className="w-3.5 h-3.5" /> },
  { key: 'review',    label: 'Review',  icon: <FileSearch className="w-3.5 h-3.5" /> },
  { key: 'structuring', label: 'AI Extract', icon: <Cpu className="w-3.5 h-3.5" /> },
  { key: 'done',      label: 'Done',    icon: <CheckCircle className="w-3.5 h-3.5" /> },
];

const ORDER: Step[] = ['recording', 'review', 'structuring', 'done'];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStatus }) => {
  const currentIdx = ORDER.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-0 w-full max-w-lg mx-auto">
      {STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isActive  = idx === currentIdx;
        const isPending = idx > currentIdx;

        return (
          <React.Fragment key={step.key}>
            {/* Step node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step.icon}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  isDone ? 'text-emerald-600' : isActive ? 'text-blue-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                  idx < currentIdx ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
