"""Structuring API router."""

from __future__ import annotations

import logging
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status

from backend.models.prescription import PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Structuring"])
svc = PrescriptionService()


class StructuringRequest(BaseModel):
    transcript_override: str | None = None


@router.post(
    "/{prescription_id}/structure",
    response_model=PrescriptionResponse,
    summary="Trigger LLM structuring, shorthand normalization, and source validation",
)
async def structure_prescription(
    prescription_id: str,
    payload: StructuringRequest | None = None,
) -> PrescriptionResponse:
    override = payload.transcript_override if payload else None
    try:
        return await svc.structure_prescription(
            prescription_id=prescription_id,
            transcript_override=override,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("Prescription structuring error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Structuring failed: {e}",
        )

