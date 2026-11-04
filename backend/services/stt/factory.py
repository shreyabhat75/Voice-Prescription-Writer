"""Factory for creating STT provider instances."""

from __future__ import annotations

from backend.config import get_settings
from backend.services.stt.base import STTProvider


def create_stt_provider(provider_name: str | None = None) -> STTProvider:
    """Instantiate the STT provider specified by name or settings.

    Args:
        provider_name: Override for ``STT_PROVIDER`` in settings.

    Returns:
        An instance of the requested :class:`STTProvider`.

    Raises:
        ValueError: If the provider name is unknown.
    """
    name = (provider_name or get_settings().STT_PROVIDER).lower().strip()

    if name in ("whisper", "local", "openai-whisper"):
        from backend.services.stt.whisper_provider import WhisperSTTProvider
        return WhisperSTTProvider()
    elif name == "mock":
        from backend.services.stt.mock_provider import MockSTTProvider
        return MockSTTProvider()
    elif name == "google":
        from backend.services.stt.google_provider import GoogleSTTProvider
        return GoogleSTTProvider()
    elif name == "deepgram":
        from backend.services.stt.deepgram_provider import DeepgramSTTProvider
        return DeepgramSTTProvider()
    else:
        # Default to whisper if available, else mock
        try:
            from backend.services.stt.whisper_provider import WhisperSTTProvider
            return WhisperSTTProvider()
        except ImportError:
            from backend.services.stt.mock_provider import MockSTTProvider
            return MockSTTProvider()


get_stt_provider = create_stt_provider

