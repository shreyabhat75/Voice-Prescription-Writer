import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported';
  stream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
}

export function useAudioRecorder(options?: { onChunk?: (chunk: Blob) => void }): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const onChunkRef = useRef(options?.onChunk);
  onChunkRef.current = options?.onChunk;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permission) => {
          setPermissionStatus(permission.state as 'prompt' | 'granted' | 'denied');
          permission.onchange = () => {
            setPermissionStatus(permission.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionStatus('unsupported');
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionStatus('granted');

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac'];
      const supportedType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(mediaStream, supportedType ? { mimeType: supportedType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          if (onChunkRef.current) onChunkRef.current(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 100) {
          setError('Recorded audio was empty or too short. Please try dictating again.');
          setAudioBlob(null);
        } else {
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStream(null);
        }
      };

      recorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } catch (err: any) {
      let message = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        message = 'Microphone permission was denied. Please allow microphone access in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your computer.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setIsRecording(false);
      setIsPaused(false);
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        setIsPaused(false);
        resolve(audioBlob);
        return;
      }
      recorder.addEventListener('stop', () => {
        setIsRecording(false);
        setIsPaused(false);
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        resolve(blob.size < 100 ? null : blob);
      }, { once: true });
      recorder.stop();
    });
  }, [audioBlob]);

  const resetRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    setError(null);
  }, [audioUrl]);

  return { isRecording, isPaused, duration, audioBlob, audioUrl, error, permissionStatus, stream, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording };
}
