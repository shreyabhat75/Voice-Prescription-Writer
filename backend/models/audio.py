"""Audio record Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class AudioRecordResponse(BaseModel):
    """Audio metadata returned by the API."""

    id: str
    prescription_id: str
    file_path: str
    duration_ms: Optional[int] = None
    format: str = "webm"
    size_bytes: Optional[int] = None
    created_at: str
