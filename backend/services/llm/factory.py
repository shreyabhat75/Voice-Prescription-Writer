"""Factory for creating LLM providers according to application settings."""

from __future__ import annotations

import logging

from backend.config import get_settings
from backend.services.llm.base import LLMProvider
from backend.services.llm.mock_provider import MockLLMProvider

logger = logging.getLogger(__name__)


def get_llm_provider(override: str | None = None) -> LLMProvider:
    """Return an instance of the configured LLM provider."""
    import os
    env_provider = os.getenv("LLM_PROVIDER")
    if os.getenv("PYTEST_CURRENT_TEST") and not override:
        provider_name = (env_provider or "mock").lower()
    else:
        settings = get_settings()
        provider_name = (override or env_provider or settings.LLM_PROVIDER).lower()

    if provider_name == "openai":
        from backend.services.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "gemini":
        from backend.services.llm.gemini_provider import GeminiProvider
        return GeminiProvider()
    elif provider_name == "mock":
        return MockLLMProvider()
    else:
        logger.warning("Unknown LLM provider %r, falling back to mock", provider_name)
        return MockLLMProvider()

