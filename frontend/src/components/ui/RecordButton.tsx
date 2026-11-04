import React from 'react';
import { Mic, Square } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  onStart,
  onStop,
  disabled = false,
}) => {
  if (isRecording) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStop}
          disabled={disabled}
          className="relative group p-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-200 focus:outline-none focus:ring-4 focus:ring-rose-300 transition-all cursor-pointer animate-pulse"
          title="Stop Recording"
        >
          <Square className="w-8 h-8 fill-current" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
        </button>
        <span className="text-sm font-semibold text-rose-600">Click to Complete Dictation</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="group p-6 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white shadow-xl shadow-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all cursor-pointer disabled:cursor-not-allowed hover:scale-105 active:scale-95"
        title="Start Voice Dictation"
      >
        <Mic className="w-8 h-8" />
      </button>
      <span className="text-sm font-medium text-slate-600">Click to Start Dictation</span>
    </div>
  );
};

