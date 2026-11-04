# Voice Prescription Writer

A professional voice-enabled prescription writing application for doctors. Records medical dictation, uses AI to structure prescriptions, and generates validated PDF prescriptions with full audit trail.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                      │
│  Dashboard │ Recording │ Review │ History │ PDF Download      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────┴──────────────────────────────────┐
│                   FastAPI Backend                             │
│  Audio Upload │ STT │ LLM Structuring │ Validation │ PDF     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    SQLite Database                            │
│  Prescriptions │ Audio │ Transcripts │ Versions │ Feedback   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or pnpm

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/shreyabhat75/Voice-Prescription-Writer.git
cd Voice-Prescription-Writer

# 2. Setup backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r ../requirements.txt

# 3. Configure environment
cp ../.env.example ../.env
# Edit .env with your API keys (or leave as mock for testing)

# 4. Setup frontend
cd ../frontend
npm install

# 5. Run both (two terminals)
# Terminal 1 - Backend:
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

### One Command Start (Development)
```bash
# From project root
python start.py
```

Open http://localhost:5173 in your browser.

## 🏥 Features

### Core Workflow
1. **Record** - Doctor dictates prescription using microphone
2. **Transcribe** - Audio converted to text via configurable STT
3. **Structure** - AI extracts structured prescription data
4. **Review** - Doctor reviews, edits, and corrects with source evidence
5. **Confirm** - Doctor explicitly confirms the prescription
6. **Generate PDF** - Professional prescription PDF generated

### Key Capabilities
- 🎤 Browser-based audio recording (MediaRecorder API)
- 🔤 Configurable Speech-to-Text (Google Cloud, Deepgram, or Mock)
- 🧠 LLM-based prescription structuring (OpenAI, Gemini, or Mock)
- ✅ Source-grounded validation with field-level evidence
- 📝 Medical shorthand normalization (OD, BD, TDS, 1-0-1, etc.)
- 🗣️ Voice editing commands ("Change Dolo to 500", "Remove second medicine")
- ❓ Intelligent clarification requests for unclear fields
- 📄 Professional PDF generation with confirmation gate
- 📊 Version history and audit trail
- 💬 Doctor feedback logging for continuous improvement

### Safety Principles
- No fabricated prescription information
- No silent inference of missing data
- Original audio and transcript are immutable
- Every field has source evidence or explicit missing status
- Doctor approval is mandatory before PDF generation
- No real patient information (demo data only)

## 📁 Project Structure

```
Voice-Prescription-Writer/
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── api/                # API client
│   │   └── types/              # TypeScript types
│   └── package.json
├── backend/                    # Python FastAPI
│   ├── models/                 # Pydantic models
│   ├── routers/                # API route handlers
│   ├── services/               # Business logic
│   │   ├── stt/                # Speech-to-text adapters
│   │   ├── llm/                # LLM adapters
│   │   ├── normalization/      # Shorthand normalization
│   │   ├── validation/         # Validation pipeline
│   │   ├── clarification/      # Clarification service
│   │   ├── voice_edit/         # Voice editing
│   │   └── pdf/                # PDF generation
│   ├── data/                   # Reference data & migrations
│   └── tests/                  # Backend tests
├── dataset/                    # Reference medical data
├── docs/                       # Architecture & planning docs
├── requirements.txt            # Python dependencies
└── .env.example                # Environment template
```

## 🧪 Testing

```bash
# Backend tests
cd backend
python -m pytest tests/ -v

# Run specific test
python -m pytest tests/test_dictations.py -v

# With coverage
python -m pytest tests/ --cov=. --cov-report=html
```

## 📋 Test Dictation Scripts

The system is tested against 7 medical dictation scripts:

| # | Scenario | Key Test |
|---|----------|----------|
| 1 | Basic prescription | Dolo 650 TDS, Cetirizine HS |
| 2 | Before breakfast + SOS | Pantoprazole AC, Combiflam SOS |
| 3 | Multiple medicines + investigations | COPD treatment, CBC, X-ray |
| 4 | Self-correction + removal | Sumatriptan dose change, remove medicine |
| 5 | IV + STAT + conditional | Ondansetron IV STAT, conditional paracetamol |
| 6 | Missing duration (must leave empty) | Amlodipine OD, no duration |
| 7 | Code-mixed Hindi-English | Hindi-English prescription |

## 🔧 Configuration

### STT Providers
| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Mock | `STT_PROVIDER=mock` | For local testing, no API key needed |
| Google | `STT_PROVIDER=google` | Requires `GOOGLE_APPLICATION_CREDENTIALS` |
| Deepgram | `STT_PROVIDER=deepgram` | Requires `DEEPGRAM_API_KEY` |

### LLM Providers
| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Mock | `LLM_PROVIDER=mock` | For local testing, returns pre-defined structures |
| OpenAI | `LLM_PROVIDER=openai` | Requires `OPENAI_API_KEY` |
| Gemini | `LLM_PROVIDER=gemini` | Requires `GEMINI_API_KEY` |

## 📄 License

This project is developed as part of an internship assignment. For educational and demonstration purposes only.

## ⚠️ Disclaimer

This application is a **prototype** for demonstration purposes. It is **NOT** approved for clinical use. No real patient data should be entered. All patient information shown is mock/demo data.

