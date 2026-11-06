import React from 'react';
import { Mic, Square, MicOff, Pause, Play } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused?: boolean;
  stream?: MediaStream | null;
  permissionStatus?: 'prompt' | 'granted' | 'denied' | 'unsupported';
  onStart: () => void;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  disabled?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isPaused = false,
  stream = null,
  permissionStatus = 'prompt',
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
}) => {
  if (permissionStatus === 'denied') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="p-6 rounded-full bg-slate-100 text-slate-400">
          <MicOff className="w-8 h-8" />
        </div>
        <p className="text-xs text-red-600 font-semibold text-center max-w-xs">
          Microphone access denied. Please allow it in your browser settings and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-6">
        {/* Main record / stop button */}
        {isRecording ? (
          <button
            type="button"
            onClick={onStop}
            disabled={disabled}
            aria-label="Stop Recording"
            className="relative group w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 transition-all cursor-pointer active:scale-95"
          >
            <Square className="w-7 h-7 fill-current mx-auto" />
            {/* Animated ring */}
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-60 pointer-events-none" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            aria-label="Start Recording"
            className="relative group w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white shadow-xl shadow-blue-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Mic className="w-8 h-8 mx-auto" />
          </button>
        )}

        {/* Visualizer beside the button */}
        <AudioVisualizer stream={stream} isRecording={isRecording && !isPaused} height={72} width={260} />
      </div>

      {/* Labels & secondary controls */}
      <div className="flex flex-col items-center gap-2">
        {isRecording ? (
          <>
            <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
              <span className="rec-dot" />
              {isPaused ? 'Paused' : 'Recording...'}
            </div>
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume
                </button>
              ) : (
                onPause && (
                  <button
                    type="button"
                    onClick={onPause}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )
              )}
            </div>
          </>
        ) : (
          <span className="text-sm font-medium text-slate-500">
            {permissionStatus === 'unsupported'
              ? 'Recording not supported in this browser'
              : 'Click microphone to start dictation'}
          </span>
        )}
      </div>
    </div>
  );
};
