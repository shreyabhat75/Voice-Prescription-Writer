# Architecture Decision Records (ADRs)

## ADR-01: SQLite with Async I/O for Local Data Persistence
- **Context**: The application requires robust, ACID-compliant persistence for prescriptions, audio references, multi-version snapshots, and audit trails during clinical dictations.
- **Decision**: Use SQLite via `aiosqlite`.
- **Rationale**: Eliminates external database infrastructure hurdles for local evaluation and developer setup while providing complete transactional safety, fast execution, and effortless migration to PostgreSQL in production.

## ADR-02: Strict Separation of LLM Extraction from Shorthand Normalization
- **Context**: LLMs can normalize medical abbreviations (e.g. `BD` -> `Twice Daily`), but stochastic behavior risks subtle hallucinations or unintended replacements.
- **Decision**: Perform shorthand normalization through a deterministic Python rules engine post-extraction.
- **Rationale**: Guarantees $100\%$ reproducible frequency and timing translations while maintaining both original doctor wording (`source_text`) and standardized clinical codes (`frequency_normalized`).

## ADR-03: Field-Level Provenance (`SourceEvidence`)
- **Context**: Traditional medical NLP assigns a global document confidence score, which hides individual hallucinations.
- **Decision**: Every clinical field is stored inside a `SourceEvidence` wrapper:
  ```json
  {"value": "650mg", "source_text": "650", "status": "extracted", "confidence": 0.98}
  ```
- **Rationale**: Enables fine-grained UI indicators (green check, yellow warning, red missing), highlighting exact phrases in the transcript, and preventing silent errors.

## ADR-04: Strict Non-Inference Rules for Clinical Safety
- **Context**: General LLMs have an innate bias to "complete" medical narratives (e.g. inferring a 30-day duration if omitted or guessing a diagnosis from a symptom).
- **Decision**: System prompts and validation rules strictly forbid inferring missing strengths, durations, routes, or diagnoses.
- **Rationale**: Patient safety is non-negotiable. Missing information must be flagged as `"not_mentioned"` or `"needs_review"` for explicit doctor confirmation.

## ADR-05: Confirmation Gate Before PDF Generation
- **Context**: Premature printing or sharing of draft AI prescriptions could result in dispensing unvalidated medications.
- **Decision**: Implement a cryptographic/hash-backed confirmation gate (`POST /api/prescriptions/{id}/confirm`). The PDF generator explicitly denies requests if `status != 'confirmed'`.
- **Rationale**: Legal and clinical liability requires affirmative doctor verification.

## ADR-06: Provider-Agnostic Adapter Pattern for STT & LLM
- **Context**: Teams need to test locally without API keys, but deploy in production with Google Cloud STT, Deepgram, OpenAI, or Gemini.
- **Decision**: Implement abstract base classes (`STTProvider`, `LLMProvider`) with complete `MockProvider` implementations containing all 7 assignment test cases.
- **Rationale**: Decouples business logic from vendor APIs, simplifies testing, and guarantees 100% offline testability.

