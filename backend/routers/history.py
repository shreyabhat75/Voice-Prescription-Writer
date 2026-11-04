"""Version history and audit trail API router."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, status

from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["History & Audit"])
svc = PrescriptionService()


@router.get(
    "/{prescription_id}/history",
    summary="Get multi-version history and doctor edit audit trail",
)
async def get_prescription_history(prescription_id: str) -> dict[str, Any]:
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )
    return await svc.get_history(prescription_id)

