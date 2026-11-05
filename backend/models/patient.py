"""Patient domain models and audit schema."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class PatientRecord(BaseModel):
    """Permanent patient profile with unique patient identifier."""

    id: str = Field(..., description="Internal UUID")
    patient_id: str = Field(..., description="Unique human-readable Patient ID, e.g. PID-2026-0001")
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    created_at: str
    updated_at: str


class PatientCreateRequest(BaseModel):
    """Payload to register a new patient profile."""

    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None


class PatientSearchRequest(BaseModel):
    """Filter criteria for searching patients."""

    query: Optional[str] = None
    patient_id: Optional[str] = None
    mobile_number: Optional[str] = None


class PatientAuditLogEntry(BaseModel):
    """Audit trail record for clinical access, edits, and verification."""

    id: str
    prescription_id: Optional[str] = None
    patient_id: Optional[str] = None
    actor_id: str = "dr_ananya_rao"
    actor_role: str = "doctor"
    action: str  # 'create', 'edit_transcript', 'structure', 'doctor_edit', 'verify_save', 'view_history', 'pdf_download'
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str
