"""Patient identity and medical records API router."""

from __future__ import annotations

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, status

from backend.models.patient import PatientAuditLogEntry, PatientCreateRequest, PatientRecord
from backend.services.patient_service import PatientService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/patients", tags=["Patient Records"])
patient_svc = PatientService()


@router.get(
    "/search",
    response_model=list[PatientRecord],
    summary="Search patients by name, unique patient ID, or mobile number",
)
async def search_patients(
    query: Optional[str] = Query(None, description="Name, PID, or partial mobile query"),
    patient_id: Optional[str] = Query(None, description="Exact or prefix Patient ID e.g. PID-2026-0001"),
    mobile_number: Optional[str] = Query(None, description="Exact or suffix mobile number"),
    limit: int = Query(20, ge=1, le=100),
):
    return await patient_svc.search_patients(
        query=query,
        patient_id=patient_id,
        mobile_number=mobile_number,
        limit=limit,
    )


@router.post(
    "",
    response_model=PatientRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new permanent patient profile",
)
async def register_patient(payload: PatientCreateRequest, request: Request):
    ip = request.client.host if request.client else None
    patient = await patient_svc.register_patient(
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        mobile_number=payload.mobile_number,
    )
    await patient_svc.log_audit(
        action="patient_create_api",
        patient_id=patient.id,
        details=f"Created patient {patient.name} ({patient.patient_id})",
        ip_address=ip,
    )
    return patient


@router.get(
    "/{patient_identifier}",
    response_model=PatientRecord,
    summary="Fetch patient record by internal UUID or unique human-readable patient_id",
)
async def get_patient(patient_identifier: str):
    patient = await patient_svc.get_patient_by_id(patient_identifier)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_identifier}' not found",
        )
    return patient


@router.get(
    "/{patient_identifier}/prescriptions",
    summary="Retrieve verified prescription history for this patient",
)
async def get_patient_prescriptions(patient_identifier: str, request: Request):
    patient = await patient_svc.get_patient_by_id(patient_identifier)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_identifier}' not found",
        )

    ip = request.client.host if request.client else None
    await patient_svc.log_audit(
        action="view_patient_prescriptions",
        patient_id=patient.id,
        details=f"Viewed verified prescription history for {patient.patient_id}",
        ip_address=ip,
    )
    return await patient_svc.get_patient_prescriptions(patient_identifier)


@router.get(
    "/{patient_identifier}/audit",
    response_model=list[PatientAuditLogEntry],
    summary="Fetch audit log history for this patient",
)
async def get_patient_audit_trail(patient_identifier: str):
    patient = await patient_svc.get_patient_by_id(patient_identifier)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_identifier}' not found",
        )
    return await patient_svc.get_audit_trail(patient_id=patient.id)
