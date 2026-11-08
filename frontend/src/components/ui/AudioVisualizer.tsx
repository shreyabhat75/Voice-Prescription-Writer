import React, { useEffect, useRef, useState } from 'react';
import { MicOff, AlertTriangle } from 'lucide-react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  height?: number;
  width?: number;
}

const BAR_COUNT = 48;
const SILENCE_THRESHOLD_RMS = 0.008;
const SILENCE_DURATION_MS   = 2500;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isRecording,
  height = 72,
  width = 320,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef   = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef      = useRef<number>(0);

  const [silenceWarning, setSilenceWarning] = useState(false);

  /* ── Setup / Teardown ─────────────────────────── */
  useEffect(() => {
    if (!stream || !isRecording) {
      cancelAnimationFrame(rafRef.current);
      setSilenceWarning(false);

      // Draw flat idle line
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // subtle center line
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height / 2);
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }
      }

      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    sourceRef.current   = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let lastSound = Date.now();

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, W, H);

      // RMS for silence detection
      let sumSq = 0;
      for (let i = 0; i < dataArray.length; i++) sumSq += (dataArray[i] / 255) ** 2;
      const rms = Math.sqrt(sumSq / dataArray.length);

      if (rms > SILENCE_THRESHOLD_RMS) {
        lastSound = Date.now();
        setSilenceWarning(false);
      } else if (Date.now() - lastSound > SILENCE_DURATION_MS) {
        setSilenceWarning(true);
      }

      // Draw bars
      const barW     = W / BAR_COUNT - 1;
      const step     = Math.floor(dataArray.length / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        const value   = dataArray[i * step] / 255;
        const barH    = Math.max(2, value * H * 0.9);
        const x       = i * (barW + 1);
        const y       = (H - barH) / 2;

        // Color zone
        let color: string;
        if (value > 0.75)      color = '#DC2626'; // red — clipping
        else if (value > 0.45) color = '#D97706'; // amber — loud
        else                   color = '#059669'; // green — normal

        ctx.fillStyle = color;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barW, barH, 2);
        } else {
          ctx.rect(x, y, barW, barH);
        }
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream, isRecording]);

  if (!isRecording) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs transition-colors"
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <MicOff className="w-5 h-5 text-slate-400" />
          <span className="text-[11px] text-slate-500 font-medium">Idle</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="waveform-container" style={{ width, height }}>
        <canvas ref={canvasRef} width={width} height={height} />
      </div>
      {silenceWarning && (
        <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 text-[10px] text-amber-600 font-semibold animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          Silence detected — please speak
        </div>
      )}
    </div>
  );
};
