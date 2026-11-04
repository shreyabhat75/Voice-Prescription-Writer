"""Doctor confirmation API router."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.models.prescription import PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Doctor Confirmation"])
svc = PrescriptionService()


class ConfirmationRequest(BaseModel):
    doctor_name: str = "Dr. Ananya Rao"
    confirm_all_reviewed: bool = True


@router.post(
    "/{prescription_id}/confirm",
    response_model=PrescriptionResponse,
    summary="Doctor confirms the reviewed prescription (Mandatory before PDF generation)",
)
async def confirm_prescription(
    prescription_id: str,
    payload: ConfirmationRequest | None = None,
) -> PrescriptionResponse:
    if payload and not payload.confirm_all_reviewed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm that you have reviewed all fields.",
        )

    doc_name = payload.doctor_name if payload else "Dr. Ananya Rao"
    try:
        return await svc.confirm_prescription(
            prescription_id=prescription_id,
            doctor_name=doc_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

