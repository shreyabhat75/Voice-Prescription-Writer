"""Unit tests for voice edit commands."""

from __future__ import annotations

import pytest
from backend.models.prescription import (
    ClinicalInfo,
    MedicineItem,
    PatientInfo,
    PrescriptionDraft,
    SourceEvidence,
)
from backend.services.voice_edit.voice_edit_service import VoiceEditService


@pytest.fixture
def sample_draft() -> PrescriptionDraft:
    return PrescriptionDraft(
        patient=PatientInfo(
            name=SourceEvidence(value="Ramesh", status="extracted"),
            age=SourceEvidence(value=45, status="extracted"),
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
                name=SourceEvidence(value="Dolo", status="extracted"),
                strength=SourceEvidence(value="650mg", status="extracted"),
                form=SourceEvidence(value="tablet", status="extracted"),
                dose=SourceEvidence(value="1 tablet", status="extracted"),
                frequency=SourceEvidence(value="TDS", status="extracted"),
                timing=SourceEvidence(status="not_mentioned"),
                duration=SourceEvidence(value="5 days", status="extracted"),
                route=SourceEvidence(value="oral", status="extracted"),
                special_instructions=None,
            ),
            MedicineItem(
                name=SourceEvidence(value="Cetirizine", status="extracted"),
                strength=SourceEvidence(value="10mg", status="extracted"),
                form=SourceEvidence(value="tablet", status="extracted"),
                dose=SourceEvidence(value="1 tablet", status="extracted"),
                frequency=SourceEvidence(value="HS", status="extracted"),
                timing=SourceEvidence(status="not_mentioned"),
                duration=SourceEvidence(value="3 days", status="extracted"),
                route=SourceEvidence(value="oral", status="extracted"),
                special_instructions=None,
            ),
        ],
    )


@pytest.mark.asyncio
async def test_voice_edit_change_strength(sample_draft: PrescriptionDraft):
    service = VoiceEditService()
    updated, audit = await service.apply_command("Change Dolo to 500", sample_draft)

    assert audit["success"] is True
    assert updated.medicines[0].strength.value == "500mg"
    assert updated.medicines[0].strength.status == "doctor_corrected"


@pytest.mark.asyncio
async def test_voice_edit_remove_second_medicine(sample_draft: PrescriptionDraft):
    service = VoiceEditService()
    updated, audit = await service.apply_command("Remove the second medicine", sample_draft)

    assert audit["success"] is True
    assert len(updated.medicines) == 1
    assert updated.medicines[0].name.value == "Dolo"


@pytest.mark.asyncio
async def test_voice_edit_add_medicine(sample_draft: PrescriptionDraft):
    service = VoiceEditService()
    updated, audit = await service.apply_command("Add Pan-D before breakfast for 5 days", sample_draft)

    assert audit["success"] is True
    assert len(updated.medicines) == 3
    assert updated.medicines[2].name.value == "Pan-D"
    assert "before breakfast" in (updated.medicines[2].timing.value or "")

