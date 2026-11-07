"""Core prescription Pydantic models – the heart of the application.

Every extracted field is wrapped in :class:`SourceEvidence` so the UI can show
provenance, confidence, and review status for each piece of information.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_serializer

from backend.models.patient import GenderDetectionResult


# ---------------------------------------------------------------------------
# Source evidence wrapper
# ---------------------------------------------------------------------------

class SourceEvidence(BaseModel):
    """Wrapper that pairs an extracted value with its provenance metadata."""

    value: Any = None
    source_text: Optional[str] = None
    status: Literal[
        "extracted",
        "not_mentioned",
        "unclear",
        "needs_review",
        "doctor_corrected",
        "inferred",
    ] = "not_mentioned"
    confidence: Optional[float] = None
    reasoning: Optional[str] = None


# ---------------------------------------------------------------------------
# Medicine item
# ---------------------------------------------------------------------------

class MedicineItem(BaseModel):
    """A single medicine entry on the prescription."""

    name: SourceEvidence
    raw_phrase: Optional[str] = None
    candidate_matches: list[str] = Field(default_factory=list)
    strength: SourceEvidence
    form: SourceEvidence
    dose: SourceEvidence
    frequency: SourceEvidence
    frequency_normalized: Optional[str] = None
    timing: SourceEvidence
    duration: SourceEvidence
    route: SourceEvidence
    special_instructions: Optional[SourceEvidence] = None


# ---------------------------------------------------------------------------
# Patient & clinical information
# ---------------------------------------------------------------------------

class PatientInfo(BaseModel):
    """Demographic details of the patient."""

    name: SourceEvidence
    age: SourceEvidence
    sex: SourceEvidence
    inferred_gender: Optional[GenderDetectionResult] = None


class ClinicalInfo(BaseModel):
    """Clinical details dictated by the doctor."""

    chief_complaints: SourceEvidence
    diagnosis: SourceEvidence
    investigations: SourceEvidence
    advice: SourceEvidence
    follow_up: SourceEvidence
    unclear_phrases: list[SourceEvidence] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Prescription draft (LLM output)
# ---------------------------------------------------------------------------

class PrescriptionDraft(BaseModel):
    """The structured output produced by the LLM extraction step."""

    patient: PatientInfo
    clinical: ClinicalInfo
    medicines: list[MedicineItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Full prescription response (API → frontend)
# ---------------------------------------------------------------------------

class PrescriptionResponse(BaseModel):
    """Complete prescription record returned by the API."""

    id: str
    status: Literal[
        "recording",
        "transcribing",
        "structuring",
        "review",
        "confirmed",
    ] = "recording"
    patient: PatientInfo
    clinical: ClinicalInfo
    medicines: list[MedicineItem] = Field(default_factory=list)
    raw_transcript: Optional[str] = None
    audio_url: Optional[str] = None
    validation_issues: list[dict] = Field(default_factory=list)
    clarification_questions: list[dict] = Field(default_factory=list)
    patient_id: Optional[str] = None
    permanent_patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    edited_transcript: Optional[str] = None
    pdf_path: Optional[str] = None
    verified_at: Optional[Union[str, datetime]] = None
    created_at: Union[str, datetime] = ""
    updated_at: Union[str, datetime] = ""
    confirmed_at: Optional[Union[str, datetime]] = None
    version: int = 1

    @field_serializer("created_at", "updated_at", "confirmed_at", "verified_at", when_used="json")
    def serialize_dt(self, dt_val: Optional[Union[str, datetime]]) -> Optional[str]:
        if dt_val is None:
            return None
        return dt_val.isoformat() if isinstance(dt_val, datetime) else dt_val


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------

class PrescriptionCreate(BaseModel):
    """Body for creating a brand-new prescription (before any audio)."""

    notes: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_id: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    """Body for updating individual fields on a prescription."""

    patient: Optional[PatientInfo] = None
    clinical: Optional[ClinicalInfo] = None
    medicines: Optional[list[MedicineItem]] = None
    doctor_name: Optional[str] = None
    doctor_id: Optional[str] = None
