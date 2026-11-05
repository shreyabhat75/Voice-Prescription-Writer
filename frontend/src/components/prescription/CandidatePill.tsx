import React from 'react';
import { Check } from 'lucide-react';

interface CandidatePillProps {
  candidate: string;
  onConfirm: (name: string) => void;
}

export const CandidatePill: React.FC<CandidatePillProps> = ({ candidate, onConfirm }) => {
  return (
    <button
      type="button"
      role="button"
      tabIndex={0}
      onClick={() => onConfirm(candidate)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onConfirm(candidate);
        }
      }}
      title={`Click or press Space to confirm "${candidate}"`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
        bg-amber-50 text-amber-900 border border-amber-300
        hover:bg-amber-100 hover:border-amber-400
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
        transition-all cursor-pointer"
    >
      {candidate}
      <Check className="w-2.5 h-2.5 text-amber-700" />
    </button>
  );
};
