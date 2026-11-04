import React from 'react';
import { PrescriptionStatus } from '../../types';

interface StatusBadgeProps {
  status: PrescriptionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs: Record<PrescriptionStatus, { label: string; bg: string; text: string; dot: string }> = {
    recording: {
      label: 'Recording',
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-rose-500 animate-pulse',
    },
    transcribing: {
      label: 'Transcribing',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500 animate-ping',
    },
    structuring: {
      label: 'Structuring AI',
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500 animate-pulse',
    },
    review: {
      label: 'Ready for Review',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    },
    confirmed: {
      label: 'Doctor Confirmed',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
  };

  const config = configs[status] || configs.review;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

