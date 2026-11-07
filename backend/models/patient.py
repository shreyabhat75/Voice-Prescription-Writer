"""Patient domain models and audit schema."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union
from pydantic import BaseModel, Field, field_serializer


class GenderDetectionRequest(BaseModel):
    """Payload to detect patient gender using onomastic/linguistic LLM reasoning."""

    name: str = Field(..., min_length=1, description="Patient's full or first name")


class GenderDetectionResult(BaseModel):
    """Pydantic model representing LLM-reasoned gender detection from patient name."""

    name: str = Field(..., description="The analyzed patient name")
    gender: Literal["male", "female", "other", "unknown"] = Field(
        ..., description="Detected patient gender"
    )
    confidence: float = Field(
        default=0.9, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0"
    )
    reasoning: str = Field(
        ..., description="Linguistic and cultural reasoning explaining why this gender was detected"
    )
    cultural_context: Optional[str] = Field(
        default="Indian", description="Onomastic or cultural context used for detection"
    )


class PatientRecord(BaseModel):
    """Permanent patient profile with unique patient identifier."""

    id: str = Field(..., description="Internal UUID")
    patient_id: str = Field(..., description="Unique human-readable Patient ID, e.g. PID-2026-0001")
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    created_at: Union[str, datetime]
    updated_at: Union[str, datetime]

    @field_serializer("created_at", "updated_at", when_used="json")
    def serialize_dt(self, dt_val: Union[str, datetime]) -> str:
        return dt_val.isoformat() if isinstance(dt_val, datetime) else dt_val


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
