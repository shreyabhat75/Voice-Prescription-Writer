"""Local Whisper STT provider using OpenAI Whisper with medical vocabulary conditioning."""

from __future__ import annotations

import logging
import math
import os
import time
from pathlib import Path
from typing import Optional

from backend.services.stt.base import STTProvider, STTResult

logger = logging.getLogger(__name__)

# Medical vocabulary conditioning prompt formatted as natural clinical dictations
# This primes Whisper's conversational attention mechanism for real medical audio
MEDICAL_INITIAL_PROMPT = (
    "Patient Shreya Bhatt, 21. Patient Sinchana, 21 years female. Patient Rajesh Kumar, 45 years male. "
    "Patient Sunita Sharma, 38 years female. Patient Mohan Lal, 62 years male. "
    "Chief complaints: Fever from 3 days. Diarrhea, loose motion, dysentery for 3 days. "
    "Fever and body ache for 3 days. Acidity, gastric pain, breathlessness, cough with sputum, headache, vomiting. "
    "Prescription: Tab Dolo 650 mg 1-0-1 after food for 3 days. Tab Montelukast 0-0-1 after food for 3 days. "
    "Syrup Benadryl 10 ml 3 times a day after food. Tab Pan-D 1-0-1 before food for 3 days. "
    "Tab Dolo 650 one tablet three times a day TDS for 5 days. Tab Paracetamol 650mg 0-0-1 for 3 days. "
    "Syrup Benadryl 1-1-1 10ml for 3 days. Tab Pantoprazole 40mg before breakfast for 14 days. "
    "Tab Cetirizine 10mg at night HS. Inj Ondansetron 2mg IV stat. Tab Amlodipine 5mg once daily OD. "
    "Combiflam SOS, Deriphyllin, Ambrodil-S, Hydrocortisone, Duolin, Budecort, Sumatriptan. "
    "1-0-1, 0-0-1, 1-1-1, 1-0-0, 0-1-0, BD, OD, TDS, QID, SOS, STAT, HS. "
    "tablet, capsule, syrup, injection, nebulization, mg, ml, before food, after food, khali pet, 3 days."
)

_WHISPER_MODEL = None
_LOADED_MODEL_NAME = None


def get_whisper_model(model_name: str = "base"):
    """Load or return cached Whisper model."""
    global _WHISPER_MODEL, _LOADED_MODEL_NAME
    if _WHISPER_MODEL is None or _LOADED_MODEL_NAME != model_name:
        import whisper
        logger.info("Loading Whisper model '%s'...", model_name)
        _WHISPER_MODEL = whisper.load_model(model_name)
        _LOADED_MODEL_NAME = model_name
        logger.info("Whisper model '%s' loaded successfully.", model_name)
    return _WHISPER_MODEL


class WhisperSTTProvider(STTProvider):
    """Local Speech-to-Text provider powered by OpenAI Whisper."""

    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = model_name or os.getenv("WHISPER_MODEL", "base")

    async def transcribe(
        self,
        audio_path: str,
        audio_format: str = "webm",
    ) -> STTResult:
        """Transcribe audio file using local Whisper model."""
        start_time = time.monotonic()
        path = Path(audio_path)

        # 1. Audio verification checks
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        file_size = path.stat().st_size
        if file_size < 100:
            raise ValueError(
                f"Audio file is too small ({file_size} bytes). Recording appears empty or corrupt."
            )

        logger.info(
            "Transcribing audio file %s (%d bytes, format=%s) with Whisper model '%s'",
            audio_path,
            file_size,
            audio_format,
            self.model_name,
        )

        try:
            model = get_whisper_model(self.model_name)
            result = model.transcribe(
                str(path),
                initial_prompt=MEDICAL_INITIAL_PROMPT,
                fp16=False,
                language="en",
            )
        except Exception as e:
            logger.error("Whisper transcription failed on %s: %s", audio_path, e, exc_info=True)
            raise RuntimeError(f"Speech recognition engine failed: {e}") from e

        text = result.get("text", "").strip()
        if not text:
            raise ValueError("No speech could be recognized in the recorded audio.")

        elapsed_ms = (time.monotonic() - start_time) * 1000

        # Calculate confidence from segment log probabilities
        segments = result.get("segments", [])
        confidence = 0.90
        if segments:
            logprobs = [s.get("avg_logprob", -0.5) for s in segments if "avg_logprob" in s]
            if logprobs:
                avg_lp = sum(logprobs) / len(logprobs)
                confidence = round(min(1.0, max(0.0, math.exp(avg_lp))), 2)

        lang = result.get("language", "en")

        logger.info(
            "Whisper transcription completed in %.1fms (confidence=%.2f, lang=%s): '%s'",
            elapsed_ms,
            confidence,
            lang,
            text,
        )

        return STTResult(
            text=text,
            provider="whisper",
            model=f"whisper-{self.model_name}",
            latency_ms=round(elapsed_ms, 2),
            confidence=confidence,
            language=lang,
        )
