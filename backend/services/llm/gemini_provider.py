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


class GeminiProvider(LLMProvider):
    """Adapter for Google Gemini API."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    async def extract_prescription(self, transcript: str) -> LLMResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        url = f"{self.base_url}?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"{PRESCRIPTION_EXTRACTION_SYSTEM_PROMPT}\n\nExtract structured prescription from this transcript:\n\n{transcript}"}
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        elapsed_ms = (time.monotonic() - start) * 1000
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        return LLMResult(
            raw_json=raw_text,
            provider="gemini",
            model=self.model,
            latency_ms=round(elapsed_ms, 2),
        )

    async def parse_voice_edit(
        self,
        command: str,
        current_prescription_json: str,
    ) -> LLMResult:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in the environment.")

        start = time.monotonic()
        url = f"{self.base_url}?key={self.api_key}"
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

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        elapsed_ms = (time.monotonic() - start) * 1000
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        return LLMResult(
            raw_json=raw_text,
            provider="gemini",
            model=self.model,
            latency_ms=round(elapsed_ms, 2),
        )

