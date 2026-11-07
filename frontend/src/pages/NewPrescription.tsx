import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, RotateCcw, FileText, Edit3, Radio, Languages,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { RecordButton } from '../components/ui/RecordButton';
import { StepIndicator } from '../components/ui/StepIndicator';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DictationLanguage } from '../types';

const LANGUAGE_TABS: { value: DictationLanguage; label: string; sub: string }[] = [
  { value: 'en-IN',    label: 'English (IN)',   sub: 'Indian English' },
  { value: 'hinglish', label: 'Hinglish',       sub: 'Hindi + English' },
  { value: 'kanglish', label: 'Kanglish',       sub: 'Kannada + English' },
  { value: 'kn',       label: 'Kannada',        sub: 'Native Script' },
];

const SAMPLE_SCRIPTS = [
  {
    id: 'script_1', icon: '💊',
    title: 'Script 1 — Basic (Dolo 650 TDS)',
    desc: 'Viral fever, Cetirizine at night',
    text: 'Patient name Rajesh Kumar age 45 years male. Chief complaints fever and body ache for 3 days. Diagnosis viral fever. Prescription: Tab Dolo 650 one tablet three times a day for 5 days. Tab Cetirizine 10mg one tablet at night for 5 days. Advice rest and plenty of fluids. Follow up after 5 days.',
  },
  {
    id: 'script_2', icon: '🫄',
    title: 'Script 2 — Before Breakfast + SOS',
    desc: 'GERD, Pantoprazole AC, Combiflam SOS',
    text: 'Patient Sunita Sharma age 38 female. Chief complaint acidity and gastric pain since 1 week. Diagnosis GERD. Prescription: Tab Pantoprazole 40mg one tablet before breakfast for 14 days. Tab Combiflam one tablet SOS for pain. Advice avoid spicy and oily food. Follow up after 2 weeks.',
  },
  {
    id: 'script_3', icon: '🫁',
    title: 'Script 3 — COPD + IV Stat + Nebulization',
    desc: 'Multiple meds, IV route, lab orders',
    text: 'Patient Mohan Lal age 62 male. Chief complaints breathlessness and cough with sputum for 10 days. Diagnosis COPD with acute exacerbation. Prescription: Inj Hydrocortisone 100mg IV stat. Neb Duolin plus Budecort nebulization three times a day. Tab Azithromycin 500mg once daily for 5 days. Tab Deriphyllin retard 150mg twice daily for 7 days. Syrup Ambrodil-S 10ml three times a day for 7 days. Investigations: CBC, chest X-ray PA view, sputum culture. Advice no smoking, avoid dust and cold air. Follow up after 1 week with reports.',
  },
  {
    id: 'script_4', icon: '✏️',
    title: 'Script 4 — Self-Correction',
    desc: 'Sumatriptan dose change, remove Amitriptyline',
    text: 'Patient Priya Menon age 29 female. Chief complaints headache on and off for 1 month, more on the right side. Diagnosis migraine. Prescription: Tab Sumatriptan 25mg... no wait, make that Sumatriptan 50mg one tablet SOS for headache. Tab Amitriptyline 10mg one tablet at night for 30 days. Actually remove the Amitriptyline. Tab Propranolol 20mg one tablet twice daily for 30 days. Advice maintain headache diary, avoid triggers. Follow up after 1 month.',
  },
  {
    id: 'script_5', icon: '💉',
    title: 'Script 5 — IV Stat + Conditional Dose',
    desc: 'Pediatric gastroenteritis, temperature gate',
    text: 'Patient Arjun Patel age 8 years male. Chief complaints vomiting and loose stools since morning. Diagnosis acute gastroenteritis. Prescription: Inj Ondansetron 2mg IV stat. Syrup Econorm one sachet twice daily for 5 days. ORS solution ad lib. Tab Paracetamol 250mg if fever above 100 degrees, SOS, maximum three times a day. Advice continue breastfeeding, give ORS after every loose stool. Follow up tomorrow or earlier if not improving.',
  },
  {
    id: 'script_6', icon: '⚠️',
    title: 'Script 6 — Missing Duration (Non-Inference)',
    desc: 'Hypertension — duration intentionally omitted',
    text: 'Patient Kamala Devi age 55 years female. Chief complaints headache and dizziness for 2 days. BP 160 by 100. Diagnosis hypertension. Prescription: Tab Amlodipine 5mg once daily. Tab Ecosprin 75mg once daily after food. Advice low salt diet, regular exercise, daily BP monitoring. Follow up after 1 week with BP chart.',
  },
  {
    id: 'script_7', icon: '🌐',
    title: 'Script 7 — Code-Mixed Hindi-English',
    desc: 'Hinglish phrasing with Indian number formats',
    text: 'Patient ka naam Ravi Shankar hai, age 50 saal, male. Chief complaint pet mein dard aur gas ban rahi hai do dinon se. Diagnosis peptic ulcer disease. Dawai likhiye: Tab Pantoprazole 40mg subah khali pet ek tablet 14 din tak. Syrup Sucralfate 10ml khana khane se pehle din mein teen baar 14 din. Tab Domperidone 10mg khana khane se pehle din mein teen baar 7 din. Advice: khana time pe khayein, mirchi masala band, smoking band. Follow up 2 hafte baad.',
  },
];

export const NewPrescription: React.FC = () => {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<DictationLanguage>('en-IN');
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizedText, setFinalizedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [transcriptStage, setTranscriptStage] = useState<'idle' | 'recording' | 'review'>('idle');
  const [editedTranscript, setEditedTranscript] = useState('');
  const [activePrescriptionId, setActivePrescriptionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const handleAudioChunk = (chunk: Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(chunk);
  };

  const { isRecording, isPaused, duration, audioUrl, error: micError,
    stream, permissionStatus, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording,
  } = useAudioRecorder({ onChunk: handleAudioChunk });

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleStartLiveRecording = async () => {
    setError(null);
    setFinalizedText('');
    setInterimText('');
    setEditedTranscript('');
    setTranscriptStage('recording');

    try {
      const rx = await apiClient.createPrescription();
      setActivePrescriptionId(rx.id);

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/transcribe/${rx.id}?language=${language}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            if (data.is_final) { setFinalizedText((p) => (p ? p + ' ' : '') + data.text); setInterimText(''); }
            else setInterimText(data.text);
          } else if (data.type === 'transcription_complete') {
            const complete = data.transcript || data.raw_transcript || '';
            setFinalizedText(complete);
            setInterimText('');
            setEditedTranscript(complete);
            setTranscriptStage('review');
            setProcessingStep(null);
          } else if (data.type === 'error') {
            setError(data.message || 'Streaming error.');
            setProcessingStep(null);
          }
        } catch (err) {
          console.debug('WebSocket parse error:', err);
        }
      };

      ws.onerror = () => {};
      await startRecording();
    } catch (err: any) {
      setError(err.message || 'Microphone access failed.');
      setTranscriptStage('idle');
    }
  };

  const handleStopLiveRecording = async () => {
    setProcessingStep('Finalizing transcription…');
    const blob = await stopRecording();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop', auto_structure: false }));
    }

    if (activePrescriptionId && blob && !finalizedText) {
      setTimeout(async () => {
        try {
          await apiClient.uploadAudio(activePrescriptionId, blob);
          const rx = await apiClient.transcribe(activePrescriptionId);
          const text = rx.raw_transcript || '';
          setFinalizedText(text);
          setEditedTranscript(text);
          setTranscriptStage('review');
        } catch (e: any) {
          setError(e.message || 'Transcription failed.');
        } finally {
          setProcessingStep(null);
        }
      }, 800);
    } else {
      // Fallback timer ensures review stage unlocks even on network delay
      setTimeout(() => {
        setTranscriptStage((curr) => (curr === 'recording' ? 'review' : curr));
        setProcessingStep(null);
      }, 1200);
    }
  };

  const handleCancel = () => {
    try { wsRef.current?.close(); } catch (err) { console.debug(err); }
    wsRef.current = null;
    resetRecording();
    setFinalizedText('');
    setInterimText('');
    setEditedTranscript('');
    setTranscriptStage('idle');
    setActivePrescriptionId(null);
    setError(null);
  };

  const handleStructure = async () => {
    if (!activePrescriptionId) return;
    setError(null);
    try {
      setProcessingStep('AI extracting clinical fields and running evidence validation…');
      const transcript = editedTranscript.trim() || finalizedText.trim();
      await apiClient.structurePrescription(activePrescriptionId, transcript);
      navigate(`/prescription/${activePrescriptionId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Structuring failed.');
      setProcessingStep(null);
    }
  };

  const handlePresetScript = async (text: string) => {
    setError(null);
    try {
      setProcessingStep('1/2 Creating prescription draft…');
      const rx = await apiClient.createPrescription();
      setActivePrescriptionId(rx.id);
      setProcessingStep('2/2 AI structuring and validating…');
      await apiClient.structurePrescription(rx.id, text);
      navigate(`/prescription/${rx.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to process script.');
      setProcessingStep(null);
    }
  };

  const currentStepKey = processingStep ? 'structuring' : transcriptStage === 'review' ? 'review' : 'recording';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Voice Dictation</h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Dictate naturally. Live captions appear in real time. Review before AI structures the prescription.
        </p>
      </div>

      <StepIndicator currentStatus={currentStepKey as any} />

      {/* Main recording card */}
      <div className="clinical-card p-8">
        {processingStep ? (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-bold text-blue-800">{processingStep}</p>
            <p className="text-xs text-slate-400 max-w-md">
              Running medical entity extraction, shorthand normalization (OD, BD, TDS, 1-0-1), and source-grounded validation…
            </p>
          </div>

        ) : transcriptStage === 'review' ? (
          /* Review pane */
          <div className="w-full max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Transcript Review & Edit</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                <Edit3 className="w-3 h-3" /> Edit before extraction
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Correct any transcription errors below. The original audio and transcript are preserved alongside your edits.
            </p>

            <textarea
              value={editedTranscript || finalizedText}
              onChange={(e) => setEditedTranscript(e.target.value)}
              rows={5}
              placeholder="Dictated transcript will appear here…"
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-800 leading-relaxed resize-y"
            />

            {audioUrl && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cancel & Re-record
              </button>
              <button
                type="button"
                onClick={handleStructure}
                disabled={!(editedTranscript || finalizedText).trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Generate Clinical Draft
              </button>
            </div>
          </div>

        ) : (
          /* Live dictation pane */
          <div className="flex flex-col items-center gap-6">
            {/* Language selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <Languages className="w-4 h-4 text-blue-600 ml-2" />
              {LANGUAGE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => { if (!isRecording) setLanguage(tab.value); }}
                  disabled={isRecording}
                  title={tab.sub}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    language === tab.value
                      ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  } disabled:cursor-not-allowed`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Record Button + Visualizer */}
            <RecordButton
              isRecording={isRecording}
              isPaused={isPaused}
              stream={stream}
              permissionStatus={permissionStatus}
              onStart={handleStartLiveRecording}
              onStop={handleStopLiveRecording}
              onPause={pauseRecording}
              onResume={resumeRecording}
            />

            {/* Recording timer */}
            {isRecording && (
              <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-50 border border-red-200 text-red-700 font-mono font-bold text-base">
                <span className="rec-dot" />
                <span className="font-tabular">{formatTimer(duration)}</span>
              </div>
            )}

            {/* Live captions */}
            {isRecording && (
              <div className="w-full max-w-xl bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    Live Captions — {language.toUpperCase()}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Deepgram Nova-2</span>
                </div>
                <div className="text-xs font-medium leading-relaxed max-h-28 overflow-y-auto">
                  {finalizedText && <span className="text-slate-100">{finalizedText} </span>}
                  {interimText && (
                    <span className="text-indigo-300 italic bg-indigo-950/80 px-1 py-0.5 rounded border border-indigo-800/50 animate-pulse">
                      {interimText}
                    </span>
                  )}
                  {!finalizedText && !interimText && (
                    <span className="text-slate-500 italic">Listening… Speak patient name, symptoms, and medications…</span>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {(micError || error) && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 max-w-md text-center">
                {micError || error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sample scripts */}
      {!processingStep && transcriptStage !== 'review' && (
        <div className="clinical-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Evaluation Scenarios — 7 Dictation Scripts</h3>
              <p className="text-[11px] text-slate-400">Click any scenario to simulate dictation and test AI structuring</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SAMPLE_SCRIPTS.map((s) => (
              <div
                key={s.id}
                onClick={() => handlePresetScript(s.text)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/40 transition-all cursor-pointer group space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">{s.title}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{s.desc}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 italic font-mono bg-white p-1.5 rounded border border-slate-100">
                  "{s.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
