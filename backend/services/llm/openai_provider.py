"""OpenAI LLM provider implementation for prescription extraction and voice editing."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from backend.config import get_settings
from backend.services.llm.base import LLMProvider, LLMResult
from backend.services.llm.prompts import PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT, VOICE_EDIT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """Adapter for OpenAI GPT models using standard HTTP requests."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    async def extract_prescription(self, transcript: str) -> LLMResult:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract structured prescription from this transcript:\n\n{transcript}"},
            ],
            "temperature": 0.0,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.endpoint, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        elapsed_ms = (time.monotonic() - start) * 1000
        raw_json = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return LLMResult(
            raw_json=raw_json,
            provider="openai",
            model=self.model,
            latency_ms=round(elapsed_ms, 2),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
        )

    async def parse_voice_edit(
        self,
        command: str,
        current_prescription_json: str,
    ) -> LLMResult:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": VOICE_EDIT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Current prescription:\n{current_prescription_json}\n\nVoice edit command: {command}",
                },
            ],
            "temperature": 0.0,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(self.endpoint, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        elapsed_ms = (time.monotonic() - start) * 1000
        raw_json = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return LLMResult(
            raw_json=raw_json,
            provider="openai",
            model=self.model,
            latency_ms=round(elapsed_ms, 2),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
        )

