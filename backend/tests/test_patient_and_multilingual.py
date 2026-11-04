"""Tests covering Patient Identity, Audit Logs, Multilingual Extraction, and PDF Naming."""

from __future__ import annotations

import pytest
from datetime import datetime
from backend.models.prescription import (
    ClinicalInfo,
    MedicineItem,
    PatientInfo,
    PrescriptionDraft,
    PrescriptionResponse,
    SourceEvidence,
)
from backend.services.llm.clinical_extractor import ClinicalExtractor
from backend.services.patient_service import PatientService
from backend.services.pdf.pdf_generator import PrescriptionPDFGenerator


@pytest.fixture
def extractor() -> ClinicalExtractor:
    return ClinicalExtractor()


@pytest.fixture
def patient_service() -> PatientService:
    return PatientService()


class TestPatientIdentityAndAudit:
    """Test permanent patient IDs, deduplication, search, and audit trails."""

    @pytest.mark.asyncio
    async def test_patient_id_generation_and_registration(self, patient_service: PatientService):
        """Verify unique patient ID generation (PID-YYYY-NNNN) and profile persistence."""
        patient = await patient_service.register_patient(
            name="Suresh Raina",
            age=36,
            gender="male",
            mobile_number="9876543210",
        )

        assert patient.id is not None
        assert patient.patient_id.startswith(f"PID-{datetime.now().year}-")
        assert patient.name == "Suresh Raina"
        assert patient.mobile_number == "9876543210"

        # Lookup by patient ID
        found = await patient_service.get_patient_by_id(patient.patient_id)
        assert found is not None
        assert found.id == patient.id
        assert found.name == "Suresh Raina"

    @pytest.mark.asyncio
    async def test_patient_search_by_mobile_and_name(self, patient_service: PatientService):
        """Verify doctor search by mobile number and patient name query."""
        mobile = "9900112233"
        await patient_service.register_patient(
            name="Lakshmi Narayana",
            age=52,
            gender="male",
            mobile_number=mobile,
        )

        # Search by exact mobile
        res_mobile = await patient_service.search_patients(mobile_number=mobile)
        assert len(res_mobile) >= 1
        assert res_mobile[0].name == "Lakshmi Narayana"

        # Search by name query
        res_name = await patient_service.search_patients(query="Lakshmi")
        assert any(p.name == "Lakshmi Narayana" for p in res_name)

    @pytest.mark.asyncio
    async def test_patient_deduplication(self, patient_service: PatientService):
        """Verify that returning patient with same mobile/name does not create duplicate profiles."""
        mobile = "9112233445"
        p1 = await patient_service.get_or_create_patient(
            name="Meera Bai",
            age=40,
            gender="female",
            mobile_number=mobile,
        )

        p2 = await patient_service.get_or_create_patient(
            name="Meera Bai",
            age=40,
            gender="female",
            mobile_number=mobile,
        )

        assert p1.id == p2.id
        assert p1.patient_id == p2.patient_id

    @pytest.mark.asyncio
    async def test_audit_trail_logging(self, patient_service: PatientService):
        """Verify clinical audit events are logged and retrievable."""
        patient = await patient_service.register_patient(
            name="Anand Joshi",
            age=29,
        )

        await patient_service.log_audit(
            action="view_patient_chart",
            patient_id=patient.id,
            actor_id="dr_sharma",
            details="Viewed active medical chart",
        )

        audit_trail = await patient_service.get_audit_trail(patient_id=patient.id)
        assert len(audit_trail) >= 1
        actions = [a.action for a in audit_trail]
        assert "view_patient_chart" in actions


class TestMultilingualAndCodeMixedExtraction:
    """Test extraction with Kannada, Kanglish, and Hinglish dictations."""

    def test_kannada_code_mixed_timing_and_frequency(self, extractor: ClinicalExtractor):
        """Kanglish dictation: 'oota aadmele', 'dinakke eradu sala', 'jwara'."""
        transcript = (
            "Patient name Praveen Kumar, age 29. Jwara for 3 days. "
            "Tab Paracetamol 650mg, dinakke eradu sala, oota aadmele for 3 days."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Praveen Kumar"
        assert draft.patient.age.value == 29
        assert "jwara" in draft.clinical.chief_complaints.value.lower() or "3 days" in draft.clinical.chief_complaints.value

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Paracetamol"
        assert m.strength.value == "650mg"
        assert m.frequency.value == "BD"
        assert m.timing.value == "after food"
        assert m.duration.value == "3 days"

    def test_hinglish_code_mixed_timing_and_frequency(self, extractor: ClinicalExtractor):
        """Hinglish dictation: 'khana khane se pehle', 'subah shaam', 'teen din'."""
        transcript = (
            "Patient name Suresh Verma, age 45, male. Pet dard for two days. "
            "Tab Pantoprazole 40mg, khana khane se pehle, subah shaam for teen din."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Suresh Verma"
        assert draft.patient.age.value == 45
        assert draft.patient.sex.value == "male"
        assert "pet dard" in draft.clinical.chief_complaints.value.lower() or "two days" in draft.clinical.chief_complaints.value

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert "pantoprazole" in m.name.value.lower()
        assert m.strength.value == "40mg"
        assert m.timing.value == "before food"
        assert m.frequency.value == "BD"
        assert m.duration.value == "3 days"


class TestPDFNamingAndFormatting:
    """Test sanitized PDF naming requirement (PatientName_YYYY-MM-DD.pdf)."""

    def test_pdf_download_filename_sanitization(self):
        """Verify PatientName_YYYY-MM-DD.pdf format with spaces and special character sanitization."""
        # 1. Standard patient name
        fn1 = PrescriptionPDFGenerator.get_pdf_download_filename("Shreya Bhatt", "2026-11-04")
        assert fn1 == "Shreya_Bhatt_2026-11-04.pdf"

        # 2. Patient with punctuation / special chars
        fn2 = PrescriptionPDFGenerator.get_pdf_download_filename("Dr. Rajesh Kumar, MD", "2026-11-04T12:00:00")
        assert fn2 == "Dr_Rajesh_Kumar_MD_2026-11-04.pdf"

        # 3. Fallback when name is unmentioned/demo
        fn3 = PrescriptionPDFGenerator.get_pdf_download_filename("Demo Patient", "2026-11-04", prescription_id="abcdef12-3456")
        assert fn3 == "Prescription_abcdef12_2026-11-04.pdf"

