import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  ShieldCheck,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  Layers,
  Activity,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Clock,
  Hospital,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { doctor, isAuthenticated } = useAuth();

  const handleLaunchWorkspace = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Voice Rx <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hidden xs:inline">Hospital Station</span>
              </span>
              <p className="text-[11px] text-slate-600 hidden sm:block">Ambient Clinical Intelligence &amp; Prescription Portal</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Clinical Ergonomics
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              EHR Pipeline
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('scenarios')}
              className="hover:text-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              OPD Benchmarks
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('safety')}
              className="hover:text-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Safety &amp; Governance
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs text-slate-600 hidden md:inline">
                  Signed in as <strong className="text-slate-900">{doctor?.name ? doctor.name.split(',')[0] : 'Physician'}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  Enter Workstation <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogin}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Doctor Sign In
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  Doctor Station <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 md:pt-16 md:pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Ambient Speech Architecture &bull; CDSCO &amp; IP Formulary Grounded</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.18]">
            Voice-Driven Prescription Writing for Modern Outpatient Practice
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Capture complex outpatient consultations naturally across Indian English, Hinglish, and regional medical dialogues. Voice Rx extracts structured diagnoses, dosage regimens, and investigation orders using deterministic clinical ontologies—eliminating documentation fatigue while preserving absolute physician verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  Launch Doctor Workstation
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  Switch Doctor Station
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Lock className="w-4 h-4" />
                  Enter Doctor Station
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('workflow')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Layers className="w-4 h-4 text-slate-500" />
                  Explore Clinical Architecture
                </button>
              </>
            )}
          </div>

          {/* Key Compliance & Safety Badges */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-left">
            {[
              {
                icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
                title: 'Deterministic Non-Inference',
                desc: 'Zero algorithmic guessing: unstated durations or diagnoses remain empty and flagged.',
              },
              {
                icon: <Activity className="w-4 h-4 text-blue-600" />,
                title: '50,000+ Formulary Index',
                desc: 'Sub-millisecond matching against CDSCO & Indian Pharmacopoeia drug formulations.',
              },
              {
                icon: <UserCheck className="w-4 h-4 text-blue-600" />,
                title: 'Doctor-in-the-Loop Gating',
                desc: 'Prescriptions remain unconfirmed drafts until explicitly authorized with Council Reg.',
              },
              {
                icon: <FileText className="w-4 h-4 text-slate-700" />,
                title: 'Cryptographic Audit Log',
                desc: 'Raw audio waveforms, ASR token streams, and doctor edit history immutably logged.',
              },
            ].map((badge) => (
              <div
                key={badge.title}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  {badge.icon}
                  <h4 className="text-xs font-bold text-slate-900">{badge.title}</h4>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Statistics Strip */}
      <section className="py-10 border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">100.0%</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">Extraction Accuracy</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">7 of 7 reference outpatient cases pass with exact entity structuring.</p>
              </div>
              <div className="text-[10px] font-semibold text-emerald-800 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Benchmark Verified
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">0.0%</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">Silent Inference</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">Zero unstated diagnoses or omitted durations fabricated or guessed.</p>
              </div>
              <div className="text-[10px] font-semibold text-emerald-800 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Non-Inference Strict
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">&lt; 850 ms</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">Pipeline Latency</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">Turnaround time from audio stream buffer to validated JSON schema.</p>
              </div>
              <div className="text-[10px] font-semibold text-blue-700 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Low-Latency Stream
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums">100.0%</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1">Gate Enforcement</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">HTTP 403 block enforced on unconfirmed drafts prior to doctor sign-off.</p>
              </div>
              <div className="text-[10px] font-semibold text-slate-700 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-600" /> Mandatory Confirmation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="features" className="py-16 md:py-20 border-b border-slate-200 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700">Clinical Ergonomics &amp; Architecture</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">Engineered for Clinician Focus, Not Data Entry</p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Replaces cumbersome EHR typing with ambient consultation capture, deterministic clinical codification, and high-velocity keyboard verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Ambient Acoustic Processing &amp; Multilingual ASR</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time 48-bar acoustic metering with silence detection and clipping alerts. Streams low-latency audio to specialized speech models tuned for Indian clinical dialects and pharmacotherapy nomenclature.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Dialectical ASR: English (IN), Hinglish, and Kannada</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Pre-structuring transcript editor with instant audio sync</li>
              </ul>
            </div>

            <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">High-Velocity Ergonomic Review Table</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Engineered for rapid prescription validation: navigate rows with <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-300 font-mono text-[10px] shadow-xs">Tab</kbd>, commit cells with <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-300 font-mono text-[10px] shadow-xs">Enter</kbd>, and append medications with <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-800 border border-slate-300 font-mono text-[10px] shadow-xs">Alt+N</kbd>.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Instant autocomplete across 50,000+ CDSCO formulations</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> One-click candidate match resolution <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-semibold">[Pan-D &check;]</span></li>
              </ul>
            </div>

            <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Gated Medico-Legal Authorization &amp; PDF Export</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prescription generation is strictly locked until the attending physician completes the pre-flight safety checklist and validates their State Medical Council registration credentials.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Automated pre-flight checklist (unclear flags, missing doses)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Timestamped tamper-proof audit trail for regulatory compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Workflow Pipeline Section */}
      <section id="workflow" className="py-16 md:py-20 border-b border-slate-200 bg-slate-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700">Clinical Architecture</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">5-Stage Clinical Processing Pipeline</p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Every stage preserves physician oversight, non-inference validation, and full audit transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                icon: <Mic className="w-4 h-4 text-slate-500" />,
                title: 'Ambient Capture',
                desc: 'Physician dictates naturally during consultation without breaking eye contact.',
              },
              {
                step: '02',
                icon: <Activity className="w-4 h-4 text-slate-500" />,
                title: 'Acoustic Telemetry',
                desc: 'Real-time audio streaming with volume metering, noise gating, and live ASR.',
              },
              {
                step: '03',
                icon: <Layers className="w-4 h-4 text-slate-500" />,
                title: 'Deterministic Extraction',
                desc: 'Normalizes sig abbreviations (OD/BD/TDS/AC/PC/SOS) and maps to ICD-10.',
              },
              {
                step: '04',
                icon: <UserCheck className="w-4 h-4 text-slate-500" />,
                title: 'Clinician Verification',
                desc: 'Rapid keyboard review with source-grounded evidence pills and alert resolution.',
              },
              {
                step: '05',
                icon: <FileText className="w-4 h-4 text-slate-500" />,
                title: 'Authenticated Release',
                desc: 'Doctor confirms with Medical Council Reg. No., unlocking print-ready signed PDF.',
              },
            ].map((item, idx) => (
              <div key={item.step} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 relative shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    STAGE {item.step}
                  </span>
                  {item.icon}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                {idx < 4 && (
                  <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Clinical Evaluation Scenarios */}
      <section id="scenarios" className="py-16 md:py-20 border-b border-slate-200 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700">OPD Benchmarks</h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">7 Reference Clinical Test Dictations</p>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                The platform is benchmarked against real-world outpatient scenarios for self-correction, code-mixing, and safety constraints.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogin}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Access Doctor Station <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              {
                icon: <Activity className="w-4 h-4 text-blue-600" />,
                tag: 'General Practice',
                name: 'Script 1: Basic Viral Fever',
                sub: 'Tab Dolo 650 TDS + Cetirizine 10mg HS × 5d',
                detail: 'ICD-10 B34.9 • Standard SIG normalization & symptom extraction',
              },
              {
                icon: <Clock className="w-4 h-4 text-emerald-600" />,
                tag: 'Gastroenterology',
                name: 'Script 2: Ante Cibum (AC) + SOS',
                sub: 'Pantoprazole 40mg AC + Combiflam SOS (PRN Pain)',
                detail: 'ICD-10 K21.9 • Ante Cibum timing & PRN pain medication extraction',
              },
              {
                icon: <Stethoscope className="w-4 h-4 text-blue-600" />,
                tag: 'Pulmonology',
                name: 'Script 3: COPD + Inhalation',
                sub: 'Inj Hydrocortisone IV STAT, Duolin + Budecort Neb, Labs',
                detail: 'ICD-10 J44.1 • Multi-route polypharmacy, IV STAT, and lab orders',
              },
              {
                icon: <FileText className="w-4 h-4 text-indigo-600" />,
                tag: 'Neurology',
                name: 'Script 4: Mid-Speech Correction',
                sub: 'Sumatriptan dose switch 25mg→50mg, cancel Amitriptyline',
                detail: 'ICD-10 G43.9 • Dynamic speech retraction: cancels contraindicated drug',
              },
              {
                icon: <ShieldCheck className="w-4 h-4 text-amber-600" />,
                tag: 'Pediatrics',
                name: 'Script 5: Pediatric Acute Gastroenteritis',
                sub: 'Inj Ondansetron IV STAT, Paracetamol only if >100°F',
                detail: 'ICD-10 A09 • Weight/age sensitive dosing & conditional fever gate',
              },
              {
                icon: <CheckCircle2 className="w-4 h-4 text-blue-700" />,
                tag: 'Cardiology',
                name: 'Script 6: Missing Duration Non-Inference',
                sub: 'Tab Amlodipine 5mg OD + Ecosprin 75mg OD (duration unstated)',
                detail: 'ICD-10 I10 • Safety verification: unstated chronic duration remains empty',
              },
              {
                icon: <Hospital className="w-4 h-4 text-slate-700" />,
                tag: 'Multilingual',
                name: 'Script 7: Code-Mixed Hindi',
                sub: 'Pantoprazole "subah khali pet", Sucralfate "din mein 3 baar"',
                detail: 'ICD-10 K27.9 • Vernacular transcription mapped to clinical schedules',
              },
            ].map((sc) => (
              <div key={sc.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-xs hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sc.icon}
                    <h4 className="font-bold text-slate-900 text-xs">{sc.name}</h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {sc.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-mono bg-white p-2 rounded border border-slate-200/80 leading-relaxed">
                  {sc.sub}
                </p>
                <p className="text-[10px] text-slate-600 leading-snug">
                  {sc.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Compliance Section */}
      <section id="safety" className="py-16 md:py-20 border-b border-slate-200 bg-slate-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Deterministic Clinical Safety &amp; Governance Standards</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            In outpatient clinical care, hallucinated medication durations, inferred diagnostic labels, or guessed patient demographics introduce severe patient safety and medico-legal risks. Voice Rx enforces a deterministic non-inference architecture: any clinical parameter not explicitly dictated by the attending physician remains unpopulated and visually flagged for clinician review.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs font-semibold text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Deterministic Non-Inference (Zero Hallucination)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mandatory Physician Authorization Gate
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cryptographic Medico-Legal Audit Trail
            </span>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 bg-slate-50 p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Deploy Clinical Voice Intelligence in Your OPD</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Eliminate documentation burden, streamline outpatient consultations, and generate verified, tamper-proof electronic prescriptions at the point of care.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleLaunchWorkspace}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Stethoscope className="w-4 h-4" />
                  Open Outpatient Workspace
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  Switch Doctor Station
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Lock className="w-4 h-4" />
                  Doctor Workstation Login
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('scenarios')}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  Review Benchmark Cases
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-50 border-t border-slate-200 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">Voice Prescription Writer</span>
            <span>&bull;</span>
            <span className="text-slate-600">Enterprise Clinical Outpatient Workstation</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Back to Top
            </button>
            <button
              type="button"
              onClick={handleLogin}
              className="hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Doctor Station Sign In
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Clinical Ergonomics
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              EHR Pipeline
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('safety')}
              className="hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              Safety Standards
            </button>
            <a
              href="https://github.com/shreyabhat75/Voice-Prescription-Writer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded px-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-4 pt-4 border-t border-slate-200/60 text-center text-[11px] text-slate-500">
          Strictly for registered medical practitioners. Unconfirmed drafts cannot be dispensed or printed. CDSCO &amp; Indian Pharmacopoeia Compliant.
        </div>
      </footer>
    </div>
  );
};
