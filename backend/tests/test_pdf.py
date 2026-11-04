"""Unit tests for PDF generation and confirmation gate enforcement."""

from __future__ import annotations

import os
import pytest
from backend.models.prescription import (
    ClinicalInfo,
    MedicineItem,
    PatientInfo,
    PrescriptionResponse,
    SourceEvidence,
)
from backend.services.pdf.pdf_generator import PDFGenerationError, PrescriptionPDFGenerator


@pytest.fixture
def base_prescription() -> PrescriptionResponse:
    return PrescriptionResponse(
        id="test-rx-101",
        status="review",  # Unconfirmed initially
        patient=PatientInfo(
            name=SourceEvidence(value="Ramesh Kumar", status="extracted"),
            age=SourceEvidence(value=45, status="extracted"),
            sex=SourceEvidence(value="male", status="extracted"),
        ),
        clinical=ClinicalInfo(
            chief_complaints=SourceEvidence(value="Fever for 3 days", status="extracted"),
            diagnosis=SourceEvidence(value="Viral Fever", status="extracted"),
            investigations=SourceEvidence(status="not_mentioned"),
            advice=SourceEvidence(value="Rest well", status="extracted"),
            follow_up=SourceEvidence(value="After 3 days", status="extracted"),
        ),
        medicines=[
            MedicineItem(
                name=SourceEvidence(value="Dolo", status="extracted"),
                strength=SourceEvidence(value="650mg", status="extracted"),
                form=SourceEvidence(value="tablet", status="extracted"),
                dose=SourceEvidence(value="1 tablet", status="extracted"),
                frequency=SourceEvidence(value="TDS", status="extracted"),
                frequency_normalized="Three Times Daily (TDS)",
                timing=SourceEvidence(value="after food (PC)", status="extracted"),
                duration=SourceEvidence(value="5 days", status="extracted"),
                route=SourceEvidence(value="oral", status="extracted"),
                special_instructions=None,
            )
        ],
        version=1,
    )


def test_pdf_generation_blocked_when_unconfirmed(base_prescription: PrescriptionResponse):
    """Enforce non-negotiable rule: No final PDF before doctor confirmation."""
    generator = PrescriptionPDFGenerator()
    assert base_prescription.status == "review"

    with pytest.raises(PDFGenerationError) as exc_info:
        generator.generate(base_prescription)

    assert "Doctor confirmation is compulsory" in str(exc_info.value)


def test_pdf_generation_succeeds_when_confirmed(base_prescription: PrescriptionResponse):
    """Generate PDF successfully when doctor confirmation is recorded."""
    generator = PrescriptionPDFGenerator()
    base_prescription.status = "confirmed"
    base_prescription.confirmed_at = "2026-11-03T19:30:00"

    pdf_path = generator.generate(base_prescription)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 1000  # Generated real PDF with content

