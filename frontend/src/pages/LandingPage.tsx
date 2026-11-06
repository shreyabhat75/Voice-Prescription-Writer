import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  ShieldCheck,
  Zap,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { doctor, isAuthenticated } = useAuth();

  const handleLaunchWorkspace = () => {
    navigate('/dashboard');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Voice Rx <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Clinical AI</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Intelligent Outpatient Scribing</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Capabilities</a>
            <a href="#workflow" className="hover:text-blue-400 transition-colors">Clinical Workflow</a>
            <a href="#scenarios" className="hover:text-blue-400 transition-colors">Evaluation Cases</a>
            <a href="#safety" className="hover:text-blue-400 transition-colors">Safety Standards</a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 hidden sm:inline">
                  Signed in as <strong className="text-white">{doctor.name.split(',')[0]}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Doctor Sign In
                </button>
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  Launch App <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-[#0B1120]">
        {/* Subtle background glow effect */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold animate-in">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Physician-Centric Voice-to-EHR Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Voice-Driven Prescription Writing for Modern Physicians
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Dictate outpatient consultations naturally in English, Hinglish, or regional Indian medical formats. Voice Rx captures streaming audio, structures clinical entities with sub-millisecond drug catalog matching, and produces doctor-verified, tamper-proof prescriptions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleLaunchWorkspace}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Mic className="w-4 h-4" />
              Launch Doctor Workspace
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              Hospital Station Sign In
            </button>
          </div>

          {/* Key Compliance & Safety Badges */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {[
              {
                icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
                title: 'Zero Silent Inference',
                desc: 'Unspoken durations or diagnoses are never fabricated.',
              },
              {
                icon: <Zap className="w-4 h-4 text-amber-400" />,
                title: 'Sub-Millisecond Matching',
                desc: 'Indexed across 50,000+ Indian brand names & compositions.',
              },
              {
                icon: <UserCheck className="w-4 h-4 text-blue-400" />,
                title: 'Doctor-Gated Safety',
                desc: 'Mandatory physician confirmation before PDF unlocking.',
              },
              {
                icon: <Activity className="w-4 h-4 text-purple-400" />,
                title: 'Immutable Audit Trail',
                desc: 'Raw audio, speech transcripts & edits preserved.',
              },
            ].map((badge) => (
              <div
                key={badge.title}
                className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800 backdrop-blur-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  {badge.icon}
                  <h4 className="text-xs font-bold text-white">{badge.title}</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="features" className="py-20 border-b border-slate-800 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-400">Capabilities</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">Engineered for Physician Ergonomics</p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Built to replace cumbersome EHR typing with fast, intuitive voice dictation and high-velocity keyboard editing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3.5 hover:border-blue-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Real-Time Waveform & Live Captions</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                48-bar HTML5 Canvas audio visualizer with silence detection alerts and level metering. Stream chunks to Deepgram Nova-2 with instant transcription preview.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Multi-language tabs (English, Hinglish, Kannada)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Pre-extraction doctor transcript editor</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3.5 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Keyboard-Driven Prescription Table</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Frictionless doctor review: press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px]">Alt+N</kbd> to append new drugs with auto-focused search. Navigate columns with <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px]">Tab</kbd> and commit with <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px]">Enter</kbd>.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Debounced drug name autocomplete</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> One-click yellow candidate badges (<span className="text-amber-400">[Pan-D ✓]</span>)</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3.5 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Doctor Gate & Clinical PDF Export</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PDF generation is strictly disabled until the attending physician explicitly checks and authorizes the prescription with their medical council registration.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Automated pre-flight checklist verification</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Immutable timestamps & audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Workflow Section */}
      <section id="workflow" className="py-20 border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Clinical Workflow</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">From Spoken Dictation to Authorized PDF</p>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Every stage preserves physician oversight and full transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Voice Dictation',
                desc: 'Doctor dictates consultation naturally in clinic.',
              },
              {
                step: '02',
                title: 'Live Waveform',
                desc: 'Real-time captions appear with silence/clipping feedback.',
              },
              {
                step: '03',
                title: 'AI Structuring',
                desc: 'Normalizes OD/BD/TDS, decodes drug aliases into standard forms.',
              },
              {
                step: '04',
                title: 'Physician Review',
                desc: 'Inline cell corrections, voice edits, and candidate confirmations.',
              },
              {
                step: '05',
                title: 'Authorized PDF',
                desc: 'Gated confirmation unlocks clean clinical PDF with signature.',
              },
            ].map((item, idx) => (
              <div key={item.step} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2 relative">
                <span className="text-xl font-extrabold font-mono text-blue-500">{item.step}</span>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                {idx < 4 && (
                  <div className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Clinical Evaluation Scenarios */}
      <section id="scenarios" className="py-20 border-b border-slate-800 bg-[#0B1120]">
        <div className="max-w-6xl mx-auto px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">Evaluation Suite</h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">7 Clinical Test Dictations</p>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                The platform is benchmarked against real-world outpatient scenarios for self-correction, code-mixing, and safety constraints.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLaunchWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Test Scenarios in Workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { icon: '💊', name: 'Script 1: Basic Viral Fever', sub: 'Tab Dolo 650 TDS + Cetirizine 10mg HS' },
              { icon: '🫄', name: 'Script 2: Ante Cibum (AC) + SOS', sub: 'Pantoprazole before breakfast, Combiflam for pain' },
              { icon: '🫁', name: 'Script 3: COPD + Inhalation', sub: 'Hydrocortisone IV Stat, Duolin + Budecort, Labs' },
              { icon: '✏️', name: 'Script 4: Mid-Speech Correction', sub: 'Sumatriptan dose switch, retract Amitriptyline' },
              { icon: '💉', name: 'Script 5: Pediatric Fever Gate', sub: 'Ondansetron IV Stat, Paracetamol only if >100°F' },
              { icon: '⚠️', name: 'Script 6: Missing Duration', sub: 'Strict non-inference: chronic Amlodipine left empty' },
              { icon: '🌐', name: 'Script 7: Code-Mixed Hindi', sub: 'Pantoprazole "subah khali pet", Sucralfate "din mein 3 baar"' },
            ].map((sc) => (
              <div key={sc.name} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{sc.icon}</span>
                  <h4 className="font-bold text-white">{sc.name}</h4>
                </div>
                <p className="text-[11px] text-slate-400 font-mono pl-6">{sc.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Compliance Section */}
      <section id="safety" className="py-16 border-b border-slate-800 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Our Medical Non-Inference Commitment</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            In medical practice, a fabricated medication duration or inferred diagnosis can lead to patient harm. Voice Rx is programmed with strict non-inference principles: if the attending physician does not state a duration, the duration field is deliberately left empty. Patient demographics are never guessed from names.
          </p>

          <div className="flex flex-wrap justify-center gap-6 pt-4 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Silent Inference</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Tamper-Proof Audit Logging</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Physician Signature Requirement</span>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-indigo-900/40 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to Experience Voice Rx?</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Try the live interactive dictation studio or sign in with a demo physician profile to test the prescription pipeline.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleLaunchWorkspace}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer hover:scale-105"
            >
              Open Outpatient Workspace
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              Doctor Workstation Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-slate-300">Voice Prescription Writer</span>
            <span>&bull;</span>
            <span>Clinical Scribing Prototype</span>
          </div>

          <div className="flex items-center gap-6">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-slate-300 cursor-pointer">
              Back to Top
            </button>
            <button type="button" onClick={handleLogin} className="hover:text-slate-300 cursor-pointer">
              Doctor Sign In
            </button>
            <button type="button" onClick={handleLaunchWorkspace} className="hover:text-slate-300 cursor-pointer">
              Workspace
            </button>
            <a
              href="https://github.com/shreyabhat75/Voice-Prescription-Writer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-slate-300"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
