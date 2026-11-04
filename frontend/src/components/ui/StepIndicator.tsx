import React from 'react';
import { Check, Mic, FileText, Cpu, CheckCircle } from 'lucide-react';
import { PrescriptionStatus } from '../../types';

interface StepIndicatorProps {
  currentStatus: PrescriptionStatus;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStatus }) => {
  const steps = [
    { id: 'recording', label: '1. Dictate', icon: Mic },
    { id: 'transcribing', label: '2. Transcribe', icon: FileText },
    { id: 'structuring', label: '3. Structure AI', icon: Cpu },
    { id: 'review', label: '4. Doctor Review', icon: CheckCircle },
    { id: 'confirmed', label: '5. Confirmed', icon: Check },
  ];

  const statusOrder: Record<PrescriptionStatus, number> = {
    recording: 0,
    transcribing: 1,
    structuring: 2,
    review: 3,
    confirmed: 4,
  };

  const currentIndex = statusOrder[currentStatus] ?? 0;

  return (
    <div className="w-full max-w-3xl mx-auto py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          let circleStyle = 'bg-white border-2 border-slate-300 text-slate-400';
          if (isCompleted) {
            circleStyle = 'bg-blue-600 border-2 border-blue-600 text-white';
          } else if (isCurrent) {
            circleStyle = 'bg-white border-2 border-blue-600 text-blue-600 ring-4 ring-blue-100';
          }

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${circleStyle}`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`mt-2 text-xs font-medium whitespace-nowrap ${
                  isCurrent ? 'text-blue-700 font-semibold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

