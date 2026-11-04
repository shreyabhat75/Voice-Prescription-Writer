"""Voice editing API router."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.models.prescription import PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Voice Editing"])
svc = PrescriptionService()


class VoiceEditRequest(BaseModel):
    command: str


class VoiceEditResponse(BaseModel):
    prescription: PrescriptionResponse
    audit_entry: dict[str, Any]


@router.post(
    "/{prescription_id}/voice-edit",
    response_model=VoiceEditResponse,
    summary="Apply spoken voice editing command to prescription",
)
async def voice_edit(
    prescription_id: str,
    payload: VoiceEditRequest,
) -> VoiceEditResponse:
    if not payload.command.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Voice command cannot be empty.",
        )

    try:
        rx, audit = await svc.apply_voice_edit(prescription_id, payload.command)
        return VoiceEditResponse(prescription=rx, audit_entry=audit)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

