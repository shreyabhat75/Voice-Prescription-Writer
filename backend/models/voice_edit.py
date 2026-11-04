"""Voice-edit Pydantic models."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class VoiceEditRequest(BaseModel):
    """Request body for applying a voice-based edit."""

    prescription_id: str
    voice_command: str


class VoiceEditResponse(BaseModel):
    """Response describing the result of a voice edit."""

    success: bool
    action: str  # "update" | "remove" | "add" | "error"
    description: str
    field_path: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
