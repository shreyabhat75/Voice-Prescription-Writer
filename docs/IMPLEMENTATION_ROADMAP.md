# Implementation Roadmap

The roadmap delivers all 10 modules through 11 disciplined phases:

| Phase | Milestone | Deliverables | Status |
|-------|-----------|--------------|--------|
| **Phase 1** | Repository Setup & Inspection | Repo initialized, `.gitignore`, `.env.example`, `README.md`, environment verification | ✅ Completed |
| **Phase 2** | Architecture & Shared Contracts | Complete docs (`ARCHITECTURE.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA.md`, `AI_PIPELINE.md`, `TEST_PLAN.md`, `TEAM_PLAN.md`, `DECISIONS.md`, `IMPLEMENTATION_ROADMAP.md`) | ✅ Completed |
| **Phase 3** | Skeletons & Schema Layer | Backend Pydantic models, SQLite database init script, Frontend TypeScript types & API client | 🔄 In Progress |
| **Phase 4** | Audio & Speech-to-Text Layer | Browser MediaRecorder hook, audio upload endpoint, STT adapter (Mock, Google, Deepgram) | 🔄 Next |
| **Phase 5** | LLM Extraction & Normalization | LLM provider adapter, structured extraction prompt, shorthand normalizer (OD, BD, TDS, 1-0-1) | 🔄 Next |
| **Phase 6** | Validation & Uncertainty Handling | Source phrase grounding, completeness checker, clarification question generator | 🔄 Next |
| **Phase 7** | Voice Editing & Audit Logging | Structured voice commands (`change`, `remove`, `add`), version history, doctor edit logging | 🔄 Next |
| **Phase 8** | Doctor Confirmation & PDF Generation | Confirmation gate, ReportLab PDF generator with clinic header, Rx layout | 🔄 Next |
| **Phase 9** | SQLite Persistence & History API | Full CRUD, multi-version snapshots, clarification events, feedback records | 🔄 Next |
| **Phase 10** | Full Integration & Test Suite | Automated tests for all 7 dictation scripts, negative tests, API integration tests | 🔄 Next |
| **Phase 11** | Documentation & Accuracy Report | Accuracy report, sample JSONs, verified PDF outputs, run instructions | 🔄 Next |

