"""Transcription API router."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status

from backend.models.prescription import PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Transcription"])
svc = PrescriptionService()


@router.post(
    "/{prescription_id}/transcribe",
    response_model=PrescriptionResponse,
    summary="Trigger STT transcription for the uploaded audio",
)
async def transcribe_prescription(prescription_id: str) -> PrescriptionResponse:
    try:
        return await svc.transcribe(prescription_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error("STT transcription error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {e}",
        )

