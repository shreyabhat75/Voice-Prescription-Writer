import React from 'react';
import { PrescriptionStatus } from '../../types';

const STATUS_CONFIG: Record<PrescriptionStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot?: string;
  pulse?: boolean;
}> = {
  recording: {
    label: 'Recording',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    pulse: true,
  },
  transcribing: {
    label: 'Transcribing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    pulse: true,
  },
  structuring: {
    label: 'AI Structuring',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    pulse: true,
  },
  review: {
    label: 'Needs Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

interface StatusBadgeProps {
  status: PrescriptionStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.review;
  const textSize = size === 'md' ? 'text-xs' : 'text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-semibold ${textSize} ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`}
      />
      {cfg.label}
    </span>
  );
};
