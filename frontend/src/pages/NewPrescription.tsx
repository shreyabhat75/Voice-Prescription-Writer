import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  ArrowRight,
  Sparkles,
  Volume2,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Languages,
  Edit3,
  Radio,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { RecordButton } from '../components/ui/RecordButton';
import { StepIndicator } from '../components/ui/StepIndicator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const NewPrescription: React.FC = () => {
  const navigate = useNavigate();

  const [selectedLanguage, setSelectedLanguage] = useState<'en-IN' | 'hinglish' | 'kanglish' | 'kn'>('en-IN');
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live streaming captions state
  const [finalizedText, setFinalizedText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [transcriptStage, setTranscriptStage] = useState<'recording' | 'review' | 'idle'>('idle');
  const [editedTranscript, setEditedTranscript] = useState<string>('');
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Stream each 200ms audio buffer to the WebSocket
  const handleAudioChunk = (chunk: Blob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
    }
  };

  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error: micError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecorder({ onChunk: handleAudioChunk });

  // 7 Clinical Assignment Reference Dictation Scenarios
  const sampleScripts = [
    {
      id: 'script_1',
      title: 'Script 1: Basic (Dolo 650 TDS + Cetirizine 10mg HS)',
      desc: 'Standard acute prescription with 1-0-1 / three-times-daily frequency',
      text: 'Patient name Rajesh Kumar age 45 years male. Chief complaints fever and body ache for 3 days. Diagnosis viral fever. Prescription: Tab Dolo 650 one tablet three times a day for 5 days. Tab Cetirizine 10mg one tablet at night for 5 days. Advice rest and plenty of fluids. Follow up after 5 days.',
    },
    {
      id: 'script_2',
      title: 'Script 2: Before Breakfast (AC) + Combiflam SOS',
      desc: 'Meal timing (ante cibum) and conditional pain dosage',
      text: 'Patient Sunita Sharma age 38 female. Chief complaint acidity and gastric pain since 1 week. Diagnosis GERD. Prescription: Tab Pantoprazole 40mg one tablet before breakfast for 14 days. Tab Combiflam one tablet SOS for pain. Advice avoid spicy and oily food. Follow up after 2 weeks.',
    },
    {
      id: 'script_3',
      title: 'Script 3: COPD Exacerbation, IV Stat, Nebulization & Labs',
      desc: 'Multiple medications (4+), inhalation route, laboratory workup',
      text: 'Patient Mohan Lal age 62 male. Chief complaints breathlessness and cough with sputum for 10 days. Diagnosis COPD with acute exacerbation. Prescription: Inj Hydrocortisone 100mg IV stat. Neb Duolin plus Budecort nebulization three times a day. Tab Azithromycin 500mg once daily for 5 days. Tab Deriphyllin retard 150mg twice daily for 7 days. Syrup Ambrodil-S 10ml three times a day for 7 days. Investigations: CBC, chest X-ray PA view, sputum culture. Advice no smoking, avoid dust and cold air. Follow up after 1 week with reports.',
    },
    {
      id: 'script_4',
      title: 'Script 4: Self-Correction (Sumatriptan 50mg, Remove Amitriptyline)',
      desc: 'Doctor corrects dose mid-speech and retracts second drug order',
      text: 'Patient Priya Menon age 29 female. Chief complaints headache on and off for 1 month, more on the right side. Diagnosis migraine. Prescription: Tab Sumatriptan 25mg... no wait, make that Sumatriptan 50mg one tablet SOS for headache. Tab Amitriptyline 10mg one tablet at night for 30 days. Actually remove the Amitriptyline. Tab Propranolol 20mg one tablet twice daily for 30 days. Advice maintain headache diary, avoid triggers. Follow up after 1 month.',
    },
    {
      id: 'script_5',
      title: 'Script 5: Injection Ondansetron IV Stat + Conditional Paracetamol',
      desc: 'Pediatric gastroenteritis, IV route, STAT, temperature condition',
      text: 'Patient Arjun Patel age 8 years male. Chief complaints vomiting and loose stools since morning. Diagnosis acute gastroenteritis. Prescription: Inj Ondansetron 2mg IV stat. Syrup Econorm one sachet twice daily for 5 days. ORS solution ad lib. Tab Paracetamol 250mg if fever above 100 degrees, SOS, maximum three times a day. Advice continue breastfeeding, give ORS after every loose stool. Follow up tomorrow or earlier if not improving.',
    },
    {
      id: 'script_6',
      title: 'Script 6: Missing Duration (Strict Non-Inference Rule)',
      desc: 'Chronic hypertension drugs where duration was intentionally omitted',
      text: 'Patient Kamala Devi age 55 years female. Chief complaints headache and dizziness for 2 days. BP 160 by 100. Diagnosis hypertension. Prescription: Tab Amlodipine 5mg once daily. Tab Ecosprin 75mg once daily after food. Advice low salt diet, regular exercise, daily BP monitoring. Follow up after 1 week with BP chart.',
    },
    {
      id: 'script_7',
      title: 'Script 7: Code-Mixed Hindi-English',
      desc: 'Colloquial bilingual phrasing ("khali pet", "subah", "din mein teen baar")',
      text: 'Patient ka naam Ravi Shankar hai, age 50 saal, male. Chief complaint pet mein dard aur gas ban rahi hai do dinon se. Diagnosis peptic ulcer disease. Dawai likhiye: Tab Pantoprazole 40mg subah khali pet ek tablet 14 din tak. Syrup Sucralfate 10ml khana khane se pehle din mein teen baar 14 din. Tab Domperidone 10mg khana khane se pehle din mein teen baar 7 din. Advice: khana time pe khayein, mirchi masala band, smoking band. Follow up 2 hafte baad.',
    },
  ];

  const handleStartLiveRecording = async () => {
    setError(null);
    setFinalizedText('');
    setInterimText('');
    setEditedTranscript('');
    setTranscriptStage('recording');

    try {
      // 1. Create prescription draft record
      const rx = await apiClient.createPrescription();
      setActivePrescriptionId(rx.id);

      // 2. Open bidirectional live streaming WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/transcribe/${rx.id}?language=${selectedLanguage}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            if (data.is_final) {
              setFinalizedText((prev) => (prev ? prev + ' ' : '') + data.text);
              setInterimText('');
            } else {
              setInterimText(data.text);
            }
          } else if (data.type === 'transcription_complete') {
            const complete = data.transcript || data.raw_transcript || '';
            setFinalizedText(complete);
            setInterimText('');
            setEditedTranscript(complete);
            setTranscriptStage('review');
          } else if (data.type === 'error') {
            setError(data.message || 'Streaming transcription encountered an issue.');
          }
        } catch (e) {
          console.debug('WebSocket non-JSON event:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('Live WebSocket stream fallback to standard upload:', e);
      };

      // 3. Start audio capture
      await startRecording();
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setError(err.message || 'Microphone access failed. Please ensure microphone permissions are granted.');
      setTranscriptStage('idle');
    }
  };

  const handleStopLiveRecording = async () => {
    const blob = await stopRecording();

    // Signal WebSocket to finalize audio and complete stream
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop', auto_structure: false }));
    }

    // Fallback: If WebSocket didn't capture or disconnected, upload blob directly
    if (activePrescriptionId && blob) {
      setTimeout(async () => {
        if (!editedTranscript && !finalizedText) {
          try {
            setProcessingStep('Finalizing transcription...');
            await apiClient.uploadAudio(activePrescriptionId, blob);
            const transcribedRx = await apiClient.transcribe(activePrescriptionId);
            const text = transcribedRx.raw_transcript || '';
            setFinalizedText(text);
            setEditedTranscript(text);
            setTranscriptStage('review');
            setProcessingStep(null);
          } catch (e: any) {
            setError(e.message || 'Transcription fallback failed.');
            setProcessingStep(null);
          }
        } else {
          setTranscriptStage('review');
        }
      }, 800);
    } else {
      setTranscriptStage('review');
    }
  };

  const handleCancelAndReRecord = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    resetRecording();
    setFinalizedText('');
    setInterimText('');
    setEditedTranscript('');
    setTranscriptStage('idle');
    setActivePrescriptionId(null);
    setError(null);
  };

  const handleExecuteStructuring = async () => {
    if (!activePrescriptionId) return;
    setError(null);
    try {
      setProcessingStep('AI structuring clinical fields and running evidence validation...');
      const transcriptToProcess = editedTranscript.trim() || finalizedText.trim();
      await apiClient.structurePrescription(activePrescriptionId, transcriptToProcess);
      navigate(`/prescription/${activePrescriptionId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Structuring failed.');
      setProcessingStep(null);
    }
  };

  const handleUsePresetScript = async (scriptText: string) => {
    setError(null);
    try {
      setProcessingStep('1/2 Creating prescription draft...');
      const rx = await apiClient.createPrescription();
      setActivePrescriptionId(rx.id);

      setProcessingStep('2/2 AI Structuring & validating transcript...');
      await apiClient.structurePrescription(rx.id, scriptText);

      navigate(`/prescription/${rx.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || 'Failed to process script.');
      setProcessingStep(null);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Medical Voice Dictation
        </h1>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Dictate medications, clinical findings, and advice naturally. Live captions display recognized speech in real time with doctor review before AI structuring.
        </p>
      </div>

      <StepIndicator currentStatus={processingStep ? 'structuring' : (transcriptStage === 'review' ? 'review' : 'recording')} />

      {/* Main Recording Station */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs flex flex-col items-center justify-center space-y-6 relative">
        {processingStep ? (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-bold text-blue-900">{processingStep}</p>
            <p className="text-xs text-slate-400 max-w-md">
              Running medical entity extraction, shorthand normalization (OD, BD, TDS, 1-0-1), and source-grounded validation...
            </p>
          </div>
        ) : transcriptStage === 'review' ? (
          /* Doctor Review & Editable Transcript Screen */
          <div className="w-full max-w-2xl bg-slate-50/50 border border-blue-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Doctor Transcript Review & Edit</h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                Edit Before AI Extraction
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Review the live transcription captured below. You can directly correct any spoken names or instructions. The original transcript will be preserved alongside your edits.
            </p>

            <textarea
              value={editedTranscript || finalizedText}
              onChange={(e) => setEditedTranscript(e.target.value)}
              rows={5}
              placeholder="Dictated transcript will appear here..."
              className="w-full p-3.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 leading-relaxed resize-y shadow-inner"
            />

            {audioUrl && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
                <audio src={audioUrl} controls className="w-full h-7" />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCancelAndReRecord}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cancel & Re-record
              </button>

              <button
                type="button"
                onClick={handleExecuteStructuring}
                disabled={!(editedTranscript || finalizedText).trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                Generate Clinical Prescription Draft
              </button>
            </div>
          </div>
        ) : (
          /* Live Dictation & Captions Screen */
          <>
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Languages className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">Dictation Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as any)}
                disabled={isRecording}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="en-IN">English (Indian)</option>
                <option value="hinglish">Hinglish (Hindi + English)</option>
                <option value="kanglish">Kanglish (Kannada + English)</option>
                <option value="kn">Kannada (Native Script)</option>
              </select>
            </div>

            {/* Microphone Button */}
            <RecordButton
              isRecording={isRecording}
              onStart={handleStartLiveRecording}
              onStop={handleStopLiveRecording}
            />

            {/* Live Captions Box (Active during recording) */}
            {isRecording && (
              <div className="w-full max-w-xl bg-slate-900 text-white p-4 rounded-xl shadow-inner border border-slate-800 space-y-2.5 transition-all">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                    Live Captions ({selectedLanguage.toUpperCase()})
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                    Deepgram Streaming Nova-2
                  </span>
                </div>

                <div className="text-xs font-medium leading-relaxed max-h-32 overflow-y-auto pr-1">
                  {finalizedText ? (
                    <span className="text-slate-100">{finalizedText} </span>
                  ) : null}
                  {interimText ? (
                    <span className="text-indigo-300 italic bg-indigo-950/80 px-1 py-0.5 rounded border border-indigo-800/50 animate-pulse">
                      {interimText}
                    </span>
                  ) : null}
                  {!finalizedText && !interimText ? (
                    <span className="text-slate-500 italic">Listening... Speak patient name, symptoms, and medications...</span>
                  ) : null}
                </div>
              </div>
            )}

            {/* Recording Controls & Timer */}
            {isRecording && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-base shadow-xs animate-pulse">
                  <span className="w-3 h-3 rounded-full bg-rose-600" />
                  <span>Recording: {formatTimer(duration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCancelAndReRecord}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors border border-rose-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Cancel Dictation
                  </button>
                </div>
              </div>
            )}

            {/* Error Banners */}
            {(micError || error) && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 max-w-md text-center flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{micError || error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 7 Assignment Reference Presets for Testing & Demonstration */}
      {!processingStep && transcriptStage !== 'review' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Evaluation Scenarios & Presets (7 Dictation Scripts)
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any case to immediately simulate medical dictation and test AI structuring:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleScripts.map((s) => (
              <div
                key={s.id}
                onClick={() => handleUsePresetScript(s.text)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/40 transition-all cursor-pointer group text-left space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                    {s.title}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-600 font-medium">{s.desc}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 italic font-mono bg-white p-1 rounded border border-slate-100">
                  &ldquo;{s.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
