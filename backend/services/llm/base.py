"""Abstract base class for LLM providers used in prescription extraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResult:
    """Result returned by every LLM provider."""

    raw_json: str
    provider: str
    model: str
    latency_ms: float
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class LLMProvider(ABC):
    """Abstract interface every LLM adapter must implement."""

    @abstractmethod
    async def extract_prescription(
        self,
        transcript: str,
    ) -> LLMResult:
        """Extract structured prescription data from a transcript.

        Args:
            transcript: The raw text transcript from STT.

        Returns:
            An :class:`LLMResult` containing the structured JSON output.
        """
        ...

    @abstractmethod
    async def parse_voice_edit(
        self,
        command: str,
        current_prescription_json: str,
    ) -> LLMResult:
        """Parse a voice edit command against the current prescription.

        Args:
            command: The doctor's voice edit command.
            current_prescription_json: Current prescription state as JSON.

        Returns:
            An :class:`LLMResult` with the edit instruction JSON.
        """
        ...
