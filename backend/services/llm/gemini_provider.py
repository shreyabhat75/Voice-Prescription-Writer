"""Google Gemini LLM provider implementation for prescription extraction and voice editing."""

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


FALLBACK_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
]


class GeminiProvider(LLMProvider):
    """Adapter for Google Gemini API with automatic model failover across quotas."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL or "gemini-2.5-flash-lite"

    def _get_candidate_models(self) -> list[str]:
        models = [self.model]
        for m in FALLBACK_MODELS:
            if m not in models:
                models.append(m)
        return models

    async def extract_prescription(self, transcript: str) -> LLMResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": f"{PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT}\n\nExtract structured prescription from this transcript:\n\n{transcript}"
                        }
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
            },
        }

        last_error = None
        candidate_models = self._get_candidate_models()

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code >= 400:
                        logger.warning(
                            "Gemini model %s returned status %d. Failover to next candidate.",
                            model_name,
                            resp.status_code,
                        )
                        last_error = f"Model {model_name} HTTP {resp.status_code}: {resp.text[:100]}"
                        continue

                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if raw_text.startswith("```"):
                        lines = raw_text.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        raw_text = "\n".join(lines).strip()

                    elapsed_ms = (time.monotonic() - start) * 1000
                    return LLMResult(
                        raw_json=raw_text,
                        provider="gemini",
                        model=model_name,
                        latency_ms=round(elapsed_ms, 2),
                    )
                except Exception as e:
                    logger.warning("Gemini invocation failed on %s: %s", model_name, e)
                    last_error = str(e)
                    continue

        raise RuntimeError(f"All Gemini model candidates failed. Last error: {last_error}")

    async def parse_voice_edit(
        self,
        command: str,
        current_prescription_json: str,
    ) -> LLMResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": (
                                f"{VOICE_EDIT_SYSTEM_PROMPT}\n\n"
                                f"Current prescription:\n{current_prescription_json}\n\n"
                                f"Voice edit command: {command}"
                            )
                        }
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
            },
        }

        last_error = None
        candidate_models = self._get_candidate_models()

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code >= 400:
                        logger.warning(
                            "Gemini voice-edit model %s returned %d. Failover to next candidate.",
                            model_name,
                            resp.status_code,
                        )
                        last_error = f"Model {model_name} HTTP {resp.status_code}"
                        continue

                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if raw_text.startswith("```"):
                        lines = raw_text.splitlines()
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        raw_text = "\n".join(lines).strip()

                    elapsed_ms = (time.monotonic() - start) * 1000
                    return LLMResult(
                        raw_json=raw_text,
                        provider="gemini",
                        model=model_name,
                        latency_ms=round(elapsed_ms, 2),
                    )
                except Exception as e:
                    last_error = str(e)
                    continue

        raise RuntimeError(f"All Gemini voice-edit candidates failed. Last error: {last_error}")

