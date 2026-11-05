import React, { useRef, useState, useEffect } from 'react';
import { Volume2, FileText, Search, Play, Pause } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: string | null;
  audioUrl?: string | null;
  highlightPhrase?: string | null;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript, audioUrl, highlightPhrase,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoaded    = () => setDuration(el.duration);
    const onEnded     = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true); }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const renderHighlighted = () => {
    if (!transcript) return <span className="italic text-slate-400">No transcript available.</span>;
    if (!highlightPhrase?.trim()) return <span>{transcript}</span>;
    try {
      const parts = transcript.split(new RegExp(`(${highlightPhrase.trim()})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === highlightPhrase.trim().toLowerCase() ? (
              <mark key={i} className="bg-amber-200 text-amber-900 px-0.5 rounded font-semibold">{part}</mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </span>
      );
    } catch {
      return <span>{transcript}</span>;
    }
  };

  return (
    <div className="clinical-card p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Source Transcript</h3>
        </div>
      </div>

      {/* Audio player */}
      {audioUrl && (
        <div className="mb-3 bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                }}
                className="w-full h-1.5 accent-blue-600 cursor-pointer"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-tabular flex-shrink-0">
              {fmtTime(currentTime)}{duration ? ` / ${fmtTime(duration)}` : ''}
            </span>
            <Volume2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Highlight indicator */}
      {highlightPhrase && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
          <Search className="w-3 h-3" />
          <span>Highlighting: "<strong>{highlightPhrase}</strong>"</span>
        </div>
      )}

      {/* Transcript text */}
      <div className="max-h-44 overflow-y-auto p-3 bg-slate-50 rounded-lg text-xs leading-relaxed text-slate-700 border border-slate-200 font-mono">
        {renderHighlighted()}
      </div>
    </div>
  );
};
