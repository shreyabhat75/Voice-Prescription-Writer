"""Demographic and gender detection service powered by LLM onomastic reasoning and Pydantic validation."""

from __future__ import annotations

import json
import logging
from typing import Optional

from backend.config import get_settings
from backend.models.patient import GenderDetectionResult

logger = logging.getLogger(__name__)

GENDER_REASONING_PROMPT = """You are a clinical demographic and onomastic reasoning assistant.
Analyze the provided patient's name and determine the most likely gender using linguistic, cultural, and onomastic reasoning, specifically considering Indian naming conventions (Sanskrit, Hindi, Dravidian/South Indian, Muslim, Sikh, Christian) as well as global names.

CRITICAL INSTRUCTIONS:
1. Explain the cultural and linguistic derivation of the given name.
2. If the name is gender-neutral/unisex (e.g., "Alex", "Sam", "Kiran"), set gender to "unknown" or "other" with lower confidence unless other name tokens clearly indicate gender.
3. If the name is clearly gendered (e.g. "Rajesh", "Sunita", "Kamala Devi", "Aarav"), set confidence >= 0.90.
4. Output MUST match this JSON schema:
{
  "name": "<patient name>",
  "gender": "male" | "female" | "other" | "unknown",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<concise clinical and onomastic reasoning>",
  "cultural_context": "<e.g. Sanskrit/Hindi origin, Tamil patronymic, etc.>"
}
"""

# Fallback linguistic patterns when LLM is unavailable or in mock test mode
KNOWN_FALLBACKS = {
    "rajesh": ("male", 0.99, "Rajesh is a traditional Sanskrit-derived Indian male name meaning ruler of kings.", "Sanskrit/Hindi"),
    "sunita": ("female", 0.98, "Sunita is a classical Indian female given name meaning one with good morals.", "Sanskrit/Hindi"),
    "tara": ("female", 0.95, "Tara is widely used across Indian and international contexts as a female given name.", "Sanskrit/Global"),
    "priya": ("female", 0.98, "Priya is a female given name of Sanskrit origin meaning beloved.", "Sanskrit/Hindi"),
    "kamala": ("female", 0.99, "Kamala is an epithet of Lakshmi and widely recognized as a female name.", "Sanskrit/South Asian"),
    "aarav": ("male", 0.98, "Aarav is a prominent modern Indian masculine given name meaning peaceful.", "Sanskrit/Hindi"),
    "mohan": ("male", 0.98, "Mohan is a classical Indian masculine given name and epithet of Krishna.", "Sanskrit/Hindi"),
    "arjun": ("male", 0.99, "Arjun is a revered Indian male given name from the Mahabharata.", "Sanskrit/Hindi"),
    "rohit": ("male", 0.98, "Rohit is a standard Indian male given name meaning red or first rays of the sun.", "Sanskrit/Hindi"),
    "rahul": ("male", 0.98, "Rahul is a traditional Indian male given name meaning conqueror of all miseries.", "Sanskrit/Pali"),
    "sana": ("female", 0.96, "Sana is a female given name of Arabic/Indian origin meaning brilliance or praise.", "Arabic/Urdu/Indian"),
    "mira": ("female", 0.97, "Mira/Meera is a renowned Indian female name celebrated for Mirabai.", "Sanskrit/Hindi"),
    "avanti": ("female", 0.97, "Avanti is a classical Indian female name referencing the historic ancient kingdom.", "Sanskrit/Hindi"),
    "kavya": ("female", 0.98, "Kavya is a female given name of Sanskrit origin meaning poetry.", "Sanskrit/Hindi"),
    "sahana": ("female", 0.97, "Sahana is an Indian female given name and Carnatic/Hindustani raga.", "Sanskrit/Carnatic"),
    "nikhil": ("male", 0.98, "Nikhil is a common Indian male given name meaning complete or whole.", "Sanskrit/Hindi"),
    "diya": ("female", 0.98, "Diya is an Indian female given name meaning light or lamp.", "Sanskrit/Hindi"),
    "suresh": ("male", 0.99, "Suresh is an Indian male given name meaning ruler of the gods (Indra).", "Sanskrit/Hindi"),
}


class GenderDetector:
    """Detects patient gender based on name using LLM reasoning and Pydantic validation."""

    @classmethod
    async def detect_gender(cls, name: str) -> GenderDetectionResult:
        """Analyze a patient name and return a validated GenderDetectionResult Pydantic model."""
        clean_name = (name or "").strip()
        if not clean_name:
            return GenderDetectionResult(
                name="",
                gender="unknown",
                confidence=0.0,
                reasoning="No patient name was provided for demographic analysis.",
                cultural_context="None",
            )

        settings = get_settings()

        # If Gemini is configured and API key is present, execute LLM reasoning
        if settings.GEMINI_API_KEY and settings.LLM_PROVIDER.lower() == "gemini":
            try:
                import httpx

                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
                headers = {"Content-Type": "application/json"}
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "text": f"{GENDER_REASONING_PROMPT}\n\nPatient Name to Analyze: {clean_name}"
                                }
                            ],
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.0,
                        "responseMimeType": "application/json",
                    },
                }

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean any markdown code blocks
                if raw_text.startswith("```"):
                    lines = raw_text.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    raw_text = "\n".join(lines).strip()

                parsed = json.loads(raw_text)
                return GenderDetectionResult.model_validate(parsed)
            except Exception as e:
                logger.warning("Gemini gender detection failed for %r: %s. Using heuristic fallback.", clean_name, e)

        # Linguistic & onomastic heuristic fallback
        first_token = clean_name.split()[0].lower() if clean_name else ""
        for key, (g, conf, reason, ctx) in KNOWN_FALLBACKS.items():
            if key in clean_name.lower():
                return GenderDetectionResult(
                    name=clean_name,
                    gender=g,
                    confidence=conf,
                    reasoning=reason,
                    cultural_context=ctx,
                )

        # General suffixes and rules for Indian onomastics
        lower = clean_name.lower()
        if any(lower.endswith(s) or f" {s}" in lower for s in ("devi", "bai", "ben", "amorphous", "kumari")):
            return GenderDetectionResult(
                name=clean_name,
                gender="female",
                confidence=0.92,
                reasoning=f"The honorific/suffix in '{clean_name}' is traditionally used exclusively for females in Indian naming conventions.",
                cultural_context="Indian Honorific",
            )
        elif any(lower.endswith(s) or f" {s}" in lower for s in ("kumar", "prasad", "singh", "bhai", "lal", "rao")):
            return GenderDetectionResult(
                name=clean_name,
                gender="male",
                confidence=0.92,
                reasoning=f"The honorific/suffix in '{clean_name}' is traditionally used predominantly for males in Indian naming conventions.",
                cultural_context="Indian Patronymic/Honorific",
            )

        # Default fallback for unclassified names
        return GenderDetectionResult(
            name=clean_name,
            gender="unknown",
            confidence=0.5,
            reasoning=f"Name '{clean_name}' does not exhibit strong gender-exclusive linguistic markers without additional clinical context.",
            cultural_context="Unspecified",
        )
