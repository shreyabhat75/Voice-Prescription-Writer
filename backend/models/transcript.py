"""Transcript Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class TranscriptResponse(BaseModel):
    """Transcript data returned by the API."""

    id: str
    prescription_id: str
    provider: str
    model: Optional[str] = None
    raw_text: str
    latency_ms: Optional[float] = None
    confidence: Optional[float] = None
    language: Optional[str] = None
    created_at: str
