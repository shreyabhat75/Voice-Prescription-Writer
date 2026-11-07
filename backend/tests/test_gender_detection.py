"""Comprehensive tests for Pydantic-powered gender detection with LLM reasoning."""

import pytest
from pydantic import ValidationError

from backend.models.patient import GenderDetectionRequest, GenderDetectionResult
from backend.models.prescription import (
    ClinicalInfo,
    PatientInfo,
    PrescriptionDraft,
    SourceEvidence,
)
from backend.services.demographics.gender_detector import GenderDetector
from backend.services.normalization.normalizer import PrescriptionNormalizer


class TestPydanticGenderDetectionModels:
    """Validate Pydantic schema validation, constraints, and serialization."""

    def test_gender_detection_request_validation(self):
        req = GenderDetectionRequest(name="Tara Krishnan")
        assert req.name == "Tara Krishnan"

        with pytest.raises(ValidationError):
            GenderDetectionRequest(name="")

    def test_gender_detection_result_validation(self):
        res = GenderDetectionResult(
            name="Rajesh Kumar",
            gender="male",
            confidence=0.98,
            reasoning="Rajesh is a traditional Sanskrit male name meaning king of kings.",
            cultural_context="Sanskrit/Hindi",
        )
        assert res.name == "Rajesh Kumar"
        assert res.gender == "male"
        assert res.confidence == 0.98
        assert "Rajesh" in res.reasoning

        # Verify confidence range constraint [0.0, 1.0]
        with pytest.raises(ValidationError):
            GenderDetectionResult(
                name="Test",
                gender="female",
                confidence=1.5,
                reasoning="Invalid confidence",
            )

        with pytest.raises(ValidationError):
            GenderDetectionResult(
                name="Test",
                gender="invalid_gender",  # type: ignore
                confidence=0.8,
                reasoning="Invalid",
            )


@pytest.mark.asyncio
class TestGenderDetectorService:
    """Validate gender detection logic with linguistic reasoning and fallbacks."""

    async def test_detect_gender_male_name(self):
        res = await GenderDetector.detect_gender("Rajesh Kumar")
        assert res.gender == "male"
        assert res.confidence >= 0.90
        assert len(res.reasoning) > 10

    async def test_detect_gender_female_name(self):
        res = await GenderDetector.detect_gender("Sunita Sharma")
        assert res.gender == "female"
        assert res.confidence >= 0.90
        assert len(res.reasoning) > 10

    async def test_detect_gender_tara(self):
        res = await GenderDetector.detect_gender("Tara Krishnan")
        assert res.gender == "female"
        assert res.confidence >= 0.85

    async def test_detect_gender_empty_name(self):
        res = await GenderDetector.detect_gender("")
        assert res.gender == "unknown"
        assert res.confidence == 0.0


@pytest.mark.asyncio
class TestNormalizerGenderIntegration:
    """Validate auto-detection during prescription normalization."""

    async def test_auto_detects_gender_when_not_mentioned(self):
        draft = PrescriptionDraft(
            patient=PatientInfo(
                name=SourceEvidence(value="Kamala Devi", status="extracted", confidence=0.95),
                age=SourceEvidence(value="55", status="extracted", confidence=0.95),
                sex=SourceEvidence(value=None, status="not_mentioned"),
            ),
            clinical=ClinicalInfo(
                chief_complaints=SourceEvidence(value="Headache", status="extracted"),
                diagnosis=SourceEvidence(value="Hypertension", status="extracted"),
                investigations=SourceEvidence(status="not_mentioned"),
                advice=SourceEvidence(status="not_mentioned"),
                follow_up=SourceEvidence(status="not_mentioned"),
            ),
            medicines=[],
        )

        normalizer = PrescriptionNormalizer()
        normalized = await normalizer.normalize_async(draft)

        # Gender should be automatically inferred using LLM onomastic reasoning
        assert normalized.patient.sex.value == "female"
        assert normalized.patient.sex.status == "inferred"
        assert normalized.patient.sex.confidence is not None
        assert normalized.patient.sex.reasoning is not None
        assert normalized.patient.inferred_gender is not None
        assert normalized.patient.inferred_gender.gender == "female"

    async def test_preserves_explicitly_stated_gender(self):
        draft = PrescriptionDraft(
            patient=PatientInfo(
                name=SourceEvidence(value="Tara", status="extracted", confidence=0.95),
                age=SourceEvidence(value="31", status="extracted", confidence=0.95),
                sex=SourceEvidence(value="female", status="extracted", confidence=0.99),
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

        normalizer = PrescriptionNormalizer()
        normalized = await normalizer.normalize_async(draft)

        # Should preserve the explicitly extracted status
        assert normalized.patient.sex.value == "female"
        assert normalized.patient.sex.status == "extracted"
        assert normalized.patient.sex.confidence == 0.99
