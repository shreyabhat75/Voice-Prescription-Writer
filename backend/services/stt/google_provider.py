"""Google Cloud Speech-to-Text provider adapter."""

from __future__ import annotations

import logging
import time

from backend.config import get_settings
from backend.services.stt.base import STTProvider, STTResult

logger = logging.getLogger(__name__)


class GoogleSTTProvider(STTProvider):
    """Adapter for the Google Cloud Speech-to-Text API.

    Requires ``GOOGLE_APPLICATION_CREDENTIALS`` to be set in the environment
    (or in the .env file) pointing to a valid service-account JSON key.
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.GOOGLE_APPLICATION_CREDENTIALS:
            raise ValueError(
                "GOOGLE_APPLICATION_CREDENTIALS must be set to use Google STT"
            )

    async def transcribe(
        self,
        audio_path: str,
        audio_format: str = "webm",
    ) -> STTResult:
        """Transcribe audio using Google Cloud Speech-to-Text.

        This is a placeholder that shows the integration pattern.
        In production, install ``google-cloud-speech`` and implement fully.
        """
        start = time.monotonic()

        try:
            from google.cloud import speech  # type: ignore[import-untyped]

            client = speech.SpeechClient()

            with open(audio_path, "rb") as f:
                content = f.read()

            encoding_map = {
                "webm": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                "wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
                "flac": speech.RecognitionConfig.AudioEncoding.FLAC,
            }

            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=encoding_map.get(
                    audio_format,
                    speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
                ),
                language_code="en-IN",
                alternative_language_codes=["hi-IN"],
                enable_automatic_punctuation=True,
                enable_word_time_offsets=True,
                model="latest_long",
            )

            response = client.recognize(config=config, audio=audio)

            transcript_parts: list[str] = []
            word_timestamps: list[dict] = []
            total_confidence = 0.0
            result_count = 0

            for result in response.results:
                alt = result.alternatives[0]
                transcript_parts.append(alt.transcript)
                total_confidence += alt.confidence
                result_count += 1
                for word_info in alt.words:
                    word_timestamps.append({
                        "word": word_info.word,
                        "start_time": word_info.start_time.total_seconds(),
                        "end_time": word_info.end_time.total_seconds(),
                    })

            elapsed_ms = (time.monotonic() - start) * 1000
            full_text = " ".join(transcript_parts)
            avg_confidence = total_confidence / max(result_count, 1)

            return STTResult(
                text=full_text,
                provider="google",
                model="latest_long",
                latency_ms=round(elapsed_ms, 2),
                word_timestamps=word_timestamps if word_timestamps else None,
                confidence=round(avg_confidence, 4),
                language="en-IN",
            )

        except ImportError:
            logger.error("google-cloud-speech package not installed")
            raise RuntimeError(
                "google-cloud-speech is not installed. "
                "Run: pip install google-cloud-speech"
            )
        except Exception:
            logger.exception("Google STT transcription failed")
            raise
