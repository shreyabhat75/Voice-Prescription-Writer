"""Unit tests for the multi-stage validation pipeline."""

from __future__ import annotations

import pytest
from backend.models.prescription import (
    ClinicalInfo,
    MedicineItem,
    PatientInfo,
    PrescriptionDraft,
    SourceEvidence,
)
from backend.services.validation.pipeline import ValidationPipeline


def test_missing_patient_name():
    """Missing patient name must generate an error issue."""
    validator = ValidationPipeline()
    draft = PrescriptionDraft(
        patient=PatientInfo(
            name=SourceEvidence(value=None, status="not_mentioned"),
            age=SourceEvidence(value=30, status="extracted"),
            sex=SourceEvidence(value="male", status="extracted"),
        ),
        clinical=ClinicalInfo(
            chief_complaints=SourceEvidence(status="not_mentioned"),
            diagnosis=SourceEvidence(status="not_mentioned"),
            investigations=SourceEvidence(status="not_mentioned"),
            advice=SourceEvidence(status="not_mentioned"),
            follow_up=SourceEvidence(status="not_mentioned"),
        ),
        medicines=[],
    )

    issues = validator.run_validation(draft)
    name_issues = [i for i in issues if i["field"] == "patient.name"]
    assert len(name_issues) > 0
    assert name_issues[0]["severity"] == "error"


def test_unverified_source_text():
    """Extracted text not found in transcript must be flagged for review."""
    validator = ValidationPipeline()
    draft = PrescriptionDraft(
        patient=PatientInfo(
            name=SourceEvidence(value="Rohan Gupta", source_text="Rohan Gupta", status="extracted"),
            age=SourceEvidence(value=40, status="extracted"),
            sex=SourceEvidence(value="male", status="extracted"),
        ),
        clinical=ClinicalInfo(
            chief_complaints=SourceEvidence(status="not_mentioned"),
            diagnosis=SourceEvidence(status="not_mentioned"),
            investigations=SourceEvidence(status="not_mentioned"),
            advice=SourceEvidence(status="not_mentioned"),
            follow_up=SourceEvidence(status="not_mentioned"),
        ),
        medicines=[
            MedicineItem(
                name=SourceEvidence(value="Amoxicillin", source_text="Tab Amoxicillin 500mg", status="extracted"),
                strength=SourceEvidence(value="500mg", status="extracted"),
                form=SourceEvidence(value="tablet", status="extracted"),
                dose=SourceEvidence(value="1 tablet", status="extracted"),
                frequency=SourceEvidence(value="TDS", status="extracted"),
                timing=SourceEvidence(status="not_mentioned"),
                duration=SourceEvidence(value="7 days", status="extracted"),
                route=SourceEvidence(value="oral", status="extracted"),
                special_instructions=None,
            )
        ],
    )

    # Transcript doesn't mention Amoxicillin at all
    transcript = "Patient Rohan Gupta age 40 male. Chief complaint fever. Give Paracetamol."
    issues = validator.run_validation(draft, raw_transcript=transcript)

    unverified = [i for i in issues if i.get("code") == "UNVERIFIED_SOURCE_TEXT"]
    assert len(unverified) > 0
    # Status should have changed to needs_review
    assert draft.medicines[0].name.status == "needs_review"

