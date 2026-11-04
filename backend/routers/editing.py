"""Prescription editing API router for manual doctor updates."""

from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from backend.models.prescription import ClinicalInfo, MedicineItem, PatientInfo, PrescriptionResponse
from backend.services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["Editing"])
svc = PrescriptionService()


class PrescriptionUpdateRequest(BaseModel):
    patient: PatientInfo | None = None
    clinical: ClinicalInfo | None = None
    medicines: list[MedicineItem] | None = None


@router.put(
    "/{prescription_id}",
    response_model=PrescriptionResponse,
    summary="Update prescription fields (patient, clinical, or medicines list)",
)
async def update_prescription(
    prescription_id: str,
    payload: PrescriptionUpdateRequest,
) -> PrescriptionResponse:
    try:
        return await svc.update_fields(
            prescription_id=prescription_id,
            patient_update=payload.patient,
            clinical_update=payload.clinical,
            medicines_update=payload.medicines,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/{prescription_id}/patient",
    response_model=PrescriptionResponse,
    summary="Update patient demographic details",
)
async def update_patient(
    prescription_id: str,
    patient: PatientInfo,
) -> PrescriptionResponse:
    try:
        return await svc.update_fields(
            prescription_id=prescription_id,
            patient_update=patient,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/{prescription_id}/clinical",
    response_model=PrescriptionResponse,
    summary="Update clinical fields (complaints, diagnosis, advice, etc.)",
)
async def update_clinical(
    prescription_id: str,
    clinical: ClinicalInfo,
) -> PrescriptionResponse:
    try:
        return await svc.update_fields(
            prescription_id=prescription_id,
            clinical_update=clinical,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/{prescription_id}/medicines/{item_index}",
    response_model=PrescriptionResponse,
    summary="Update a specific medicine item by index",
)
async def update_medicine_item(
    prescription_id: str,
    item_index: int,
    medicine: MedicineItem,
) -> PrescriptionResponse:
    rx = await svc.get_prescription(prescription_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if item_index < 0 or item_index >= len(rx.medicines):
        raise HTTPException(status_code=400, detail=f"Invalid medicine index {item_index}")

    updated_meds = list(rx.medicines)
    updated_meds[item_index] = medicine

    return await svc.update_fields(
        prescription_id=prescription_id,
        medicines_update=updated_meds,
    )

