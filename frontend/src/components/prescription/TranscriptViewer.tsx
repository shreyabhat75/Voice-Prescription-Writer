import React, { useRef, useState } from 'react';
import { Volume2, FileText, Search } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: string | null;
  audioUrl?: string | null;
  highlightPhrase?: string | null;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  audioUrl,
  highlightPhrase,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const renderHighlightedTranscript = () => {
    if (!transcript) {
      return (
        <span className="italic text-slate-400">
          No transcript available. Record audio or trigger transcription.
        </span>
      );
    }

    if (!highlightPhrase) {
      return <span>{transcript}</span>;
    }

    const cleanPhrase = highlightPhrase.trim();
    if (!cleanPhrase) return <span>{transcript}</span>;

    try {
      const parts = transcript.split(new RegExp(`(${cleanPhrase})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === cleanPhrase.toLowerCase() ? (
              <mark
                key={i}
                className="bg-amber-200 text-amber-900 px-1 py-0.5 rounded font-semibold animate-pulse"
              >
                {part}
              </mark>
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-800">Source Audio & Transcript</h3>
        </div>

        {audioUrl && (
          <div className="flex items-center gap-2">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              type="button"
              onClick={toggleAudio}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isPlaying ? 'Pause Replay' : 'Listen to Audio'}
            </button>
          </div>
        )}
      </div>

      {highlightPhrase && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          <Search className="w-3.5 h-3.5" />
          <span>Highlighting spoken source: &ldquo;{highlightPhrase}&rdquo;</span>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-lg text-xs leading-relaxed text-slate-700 border border-slate-200 font-mono">
        {renderHighlightedTranscript()}
      </div>
    </div>
  );
};

