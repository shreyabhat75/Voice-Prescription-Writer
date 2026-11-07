"""Prescription CRUD API router."""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Query, status

from backend.models.prescription import PrescriptionCreate, PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])
svc = PrescriptionService()


@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new empty prescription draft",
)
async def create_prescription(
    payload: PrescriptionCreate | None = None,
    x_doctor_name: Optional[str] = Header(None, alias="X-Doctor-Name"),
    x_doctor_id: Optional[str] = Header(None, alias="X-Doctor-Id"),
) -> PrescriptionResponse:
    notes = payload.notes if payload else None
    doc_name = (payload.doctor_name if payload else None) or x_doctor_name
    doc_id = (payload.doctor_id if payload else None) or x_doctor_id
    return await svc.create_prescription(notes=notes, doctor_name=doc_name, doctor_id=doc_id)


@router.get(
    "",
    response_model=list[dict[str, Any]],
    summary="List all prescriptions",
)
async def list_prescriptions(
    doctor_name: Optional[str] = Query(None, description="Filter prescriptions by attending doctor"),
    x_doctor_name: Optional[str] = Header(None, alias="X-Doctor-Name"),
) -> list[dict[str, Any]]:
    doc = doctor_name or x_doctor_name
    return await svc.list_prescriptions(doctor_name=doc)


@router.get(
    "/medicines/search",
    summary="Fast prefix and fuzzy search for medicine names",
)
def search_medicine_catalog(q: str = "", limit: int = 10) -> list[dict[str, Any]]:
    from backend.services.medicines.alias_matcher import search_medicines
    return search_medicines(q, limit=limit)


@router.get(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Get details of a prescription",
)
async def get_prescription(prescription_id: str) -> PrescriptionResponse:
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )
    return rx


@router.delete(
    "/{prescription_id}",
    summary="Delete a prescription and all associated records",
)
async def delete_prescription(prescription_id: str) -> dict[str, Any]:
    deleted = await svc.delete_prescription(prescription_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prescription {prescription_id} not found",
        )
    return {
        "status": "ok",
        "message": f"Prescription {prescription_id} deleted successfully.",
        "deleted_id": prescription_id,
    }

