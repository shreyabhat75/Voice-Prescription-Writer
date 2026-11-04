"""Abstract base class for Speech-to-Text providers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class STTResult:
    """Result returned by every STT provider."""

    text: str
    provider: str
    model: str
    latency_ms: float
    word_timestamps: list[dict] | None = None
    confidence: float | None = None
    language: str | None = None


class STTProvider(ABC):
    """Abstract interface every STT adapter must implement."""

    @abstractmethod
    async def transcribe(
        self,
        audio_path: str,
        audio_format: str = "webm",
    ) -> STTResult:
        """Transcribe an audio file and return structured result.

        Args:
            audio_path: Path to the audio file on disk.
            audio_format: Audio codec / container format.

        Returns:
            An :class:`STTResult` with the transcribed text and metadata.
        """
        ...
