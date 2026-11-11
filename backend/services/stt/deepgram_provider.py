"""Deepgram Speech-to-Text provider adapter."""

from __future__ import annotations

import logging
import time

from backend.config import get_settings
from backend.services.stt.base import STTProvider, STTResult

logger = logging.getLogger(__name__)


class DeepgramSTTProvider(STTProvider):
    """Adapter for the Deepgram STT API.

    Requires ``DEEPGRAM_API_KEY`` to be set in the environment.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.DEEPGRAM_API_KEY
        if not self._api_key:
            raise ValueError("DEEPGRAM_API_KEY must be set to use Deepgram STT")

    async def transcribe(
        self,
        audio_path: str,
        audio_format: str = "webm",
    ) -> STTResult:
        """Transcribe audio using Deepgram's API.

        This is a placeholder that shows the integration pattern.
        In production, install ``deepgram-sdk`` and implement fully.
        """
        start = time.monotonic()

        try:
            import httpx

            with open(audio_path, "rb") as f:
                audio_data = f.read()

            mime_map = {
                "webm": "audio/webm",
                "wav": "audio/wav",
                "mp3": "audio/mpeg",
                "flac": "audio/flac",
                "ogg": "audio/ogg",
                "mp4": "audio/mp4",
                "m4a": "audio/mp4",
                "aac": "audio/aac",
            }

            headers = {
                "Authorization": f"Token {self._api_key}",
                "Content-Type": mime_map.get(audio_format, "audio/webm"),
            }

            params = {
                "model": "nova-2-medical",
                "language": "en-IN",
                "punctuate": "true",
                "smart_format": "true",
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.deepgram.com/v1/listen",
                    headers=headers,
                    params=params,
                    content=audio_data,
                )
                if response.status_code >= 400:
                    logger.warning("Deepgram %s returned %s. Falling back to nova-2...", params["model"], response.status_code)
                    params["model"] = "nova-2"
                    response = await client.post(
                        "https://api.deepgram.com/v1/listen",
                        headers=headers,
                        params=params,
                        content=audio_data,
                    )
                response.raise_for_status()
                data = response.json()

            channel = data["results"]["channels"][0]
            alternative = channel["alternatives"][0]
            transcript = alternative["transcript"]
            confidence = alternative.get("confidence", 0.0)

            word_timestamps: list[dict] = []
            for word_info in alternative.get("words", []):
                word_timestamps.append({
                    "word": word_info["word"],
                    "start_time": word_info["start"],
                    "end_time": word_info["end"],
                    "confidence": word_info.get("confidence"),
                })

            elapsed_ms = (time.monotonic() - start) * 1000

            return STTResult(
                text=transcript,
                provider="deepgram",
                model="nova-2-medical",
                latency_ms=round(elapsed_ms, 2),
                word_timestamps=word_timestamps if word_timestamps else None,
                confidence=round(confidence, 4),
                language="en-IN",
            )

        except ImportError:
            logger.error("httpx package not installed for Deepgram provider")
            raise RuntimeError("httpx is required for the Deepgram provider")
        except Exception:
            logger.exception("Deepgram STT transcription failed")
            raise
