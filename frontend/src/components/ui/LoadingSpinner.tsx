import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label, className = '' }) => {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className={`${SIZE_MAP[size]} rounded-full border-blue-100 border-t-blue-600 animate-spin`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && (
        <p className="text-xs font-medium text-slate-500 text-center max-w-xs">{label}</p>
      )}
    </div>
  );
};
