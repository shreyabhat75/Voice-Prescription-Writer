"""Regression test suite covering the 10 clinical audio dictation evaluation tests.

Tests transcript-to-structured-output deterministically and independently of the ASR
audio transcription layer to ensure robust span extraction, self-correction handling,
uncertainty flagging, and strict clinical non-inference.
"""

from __future__ import annotations

import pytest
from backend.models.prescription import PrescriptionDraft
from backend.services.llm.clinical_extractor import ClinicalExtractor
from backend.services.normalization.normalizer import PrescriptionNormalizer
from backend.services.validation.pipeline import ValidationPipeline


@pytest.fixture
def extractor() -> ClinicalExtractor:
    return ClinicalExtractor()


class TestTranscriptToStructuredOutputRegression:
    """Test extraction of structured clinical prescription drafts from the 10 evaluation transcripts."""

    def test_eval_1_avanti_rao(self, extractor: ClinicalExtractor):
        """Test 1: Standard clinical dictation with complete demographics, symptom, and medication."""
        transcript = (
            "Patient name, Avanti Rao, age 24, female. Fever for two days. "
            "Tablet, paracetamol, five hundred milligram, one tablet twice a day after food for three days."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        # Demographics
        assert draft.patient.name.value == "Avanti Rao"
        assert draft.patient.name.status == "extracted"
        assert draft.patient.age.value == 24
        assert draft.patient.age.status == "extracted"
        assert draft.patient.sex.value == "female"
        assert draft.patient.sex.status == "extracted"

        # Clinical details - symptom vs diagnosis
        assert draft.clinical.chief_complaints.value == "Fever for two days"
        assert draft.clinical.chief_complaints.status == "extracted"
        assert draft.clinical.diagnosis.value is None
        assert draft.clinical.diagnosis.status == "not_mentioned"

        # Medications
        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Paracetamol"
        assert m.name.status == "extracted"
        assert m.form.value == "tablet"
        assert m.strength.value == "500mg"
        assert m.dose.value == "one tablet"
        assert m.frequency.value == "BD"
        assert m.timing.value == "after food"
        assert m.duration.value == "3 days"

    def test_eval_2_rohit_shetty_citrazine_and_cough_syrup(self, extractor: ClinicalExtractor):
        """Test 2: ASR phonetic variation 'citrazine' mapped to Cetirizine with uncertainty review; cough syrup preserved."""
        transcript = (
            "Patient name Rohit Shetty, age 30, male. Cough for four days. "
            "First medicine, tablet, citrazine, ten milligram, zero zero one, at night for five days. "
            "Second medicine, cough syrup, five ml, three times a day for three days."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        # Demographics
        assert draft.patient.name.value == "Rohit Shetty"
        assert draft.patient.age.value == 30
        assert draft.patient.sex.value == "male"

        # Symptom separated from diagnosis
        assert draft.clinical.chief_complaints.value == "Cough for four days"
        assert draft.clinical.diagnosis.value is None
        assert draft.clinical.diagnosis.status == "not_mentioned"

        # 2 distinct medicines preserved in dictation order
        assert len(draft.medicines) == 2
        m1, m2 = draft.medicines

        # Medicine 1: citrazine -> Cetirizine with review flag
        assert m1.name.value == "Cetirizine"
        assert "citrazine" in m1.name.source_text.lower()
        assert m1.name.status == "needs_review"
        assert "Cetirizine 10mg" in m1.candidate_matches or "Cetirizine" in m1.candidate_matches
        assert m1.form.value == "tablet"
        assert m1.strength.value == "10mg"
        assert m1.frequency.value == "0-0-1"
        assert m1.timing.value == "at bedtime"
        assert m1.duration.value == "5 days"

        # Medicine 2: Cough syrup preserved, strength unknown (None)
        assert m2.name.value == "cough syrup"
        assert m2.form.value == "syrup"
        assert m2.dose.value == "5 ml"
        assert m2.frequency.value == "TDS"
        assert m2.duration.value == "3 days"
        assert m2.strength.value is None
        assert m2.strength.status == "not_mentioned"

    def test_eval_3_mira_nair_pan_d_duration_repetition(self, extractor: ClinicalExtractor):
        """Test 3: Doctor repetition 'Pan D. I repeat, Pan D' merged; duration extracted; strength/frequency unknown."""
        transcript = "Patient name Mira Nair, age 28. Tablet, Pan D. I repeat, Pan D. One tablet before food. Duration, five days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        # Demographics: sex not mentioned, must remain None
        assert draft.patient.name.value == "Mira Nair"
        assert draft.patient.age.value == 28
        assert draft.patient.sex.value is None
        assert draft.patient.sex.status == "not_mentioned"

        # Repetition must yield exactly 1 medication entry
        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Pan-D"
        assert m.form.value == "tablet"
        assert m.dose.value == "One tablet"
        assert m.timing.value == "before food"
        # Duration explicitly captured - must NOT report missing
        assert m.duration.value == "5 days"
        assert m.duration.status == "extracted"
        # Frequency and strength were not dictated and must remain unknown
        assert m.frequency.value is None
        assert m.frequency.status == "not_mentioned"
        assert m.strength.value is None
        assert m.strength.status == "not_mentioned"

    def test_eval_4_arjun_kumar_multidrug_sequence(self, extractor: ClinicalExtractor):
        """Test 4: Ordered multi-drug sequence (Medicine A, B, C) preserved without span bleeding."""
        transcript = (
            "Patient name, Arjun Kumar, age 26. "
            "First, tablet medicine A, one zero one, after food for three days. "
            "Second, tablet medicine B, zero zero one, at night for five days. "
            "Third, syrup medicine C, ten ml, three times a day."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Arjun Kumar"
        assert draft.patient.age.value == 26

        assert len(draft.medicines) == 3
        m1, m2, m3 = draft.medicines

        assert m1.name.value == "Medicine A"
        assert m1.form.value == "tablet"
        assert m1.frequency.value == "1-0-1"
        assert m1.timing.value == "after food"
        assert m1.duration.value == "3 days"

        assert m2.name.value == "Medicine B"
        assert m2.form.value == "tablet"
        assert m2.frequency.value == "0-0-1"
        assert m2.timing.value == "at bedtime"
        assert m2.duration.value == "5 days"

        assert m3.name.value == "Medicine C"
        assert m3.form.value == "syrup"
        assert m3.dose.value == "10 ml"
        assert m3.frequency.value == "TDS"
        assert m3.duration.value is None

    def test_eval_5_kavya_rao_self_correction(self, extractor: ClinicalExtractor):
        """Test 5: Self-correction ('medicine a... No. Sorry. Medicine b') suppresses cancelled item."""
        transcript = "Patient name Kavya Rao, age 21. Tablet medicine a... No. Sorry. Medicine b, five milligrams, one tablet at night for seven days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Kavya Rao"
        assert draft.patient.age.value == 21

        # Cancelled Medicine A must NOT be created as an active prescription
        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Medicine B"
        assert m.strength.value == "5mg"
        assert m.form.value == "tablet"
        assert m.dose.value == "one tablet"
        assert m.frequency.value == "HS"
        assert m.timing.value == "at bedtime"
        assert m.duration.value == "7 days"

    def test_eval_6_nikhil_code_mixed_speech(self, extractor: ClinicalExtractor):
        """Test 6: Code-mixed Kannada timing ('dadmalae' / 'food aadmele') mapped to 'after food'."""
        transcript = "Patient name, Nikhil, age 22. Fever for two days. Take medicine a one zero one for dadmalae, three days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Nikhil"
        assert draft.patient.age.value == 22
        assert draft.clinical.chief_complaints.value == "Fever for two days"

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Medicine A"
        assert m.frequency.value == "1-0-1"
        assert m.timing.value == "after food"
        assert m.duration.value == "3 days"

    def test_eval_7_diya_asr_phonetic_normalization(self, extractor: ClinicalExtractor):
        """Test 7: STT mishearing 'medicine, eight' normalized to 'Medicine A'."""
        transcript = "Patient name, Diya, age 25. Tablet medicine, eight, ten milligram, one tablet in morning after food."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Diya"
        assert draft.patient.age.value == 25

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Medicine A"
        assert m.form.value == "tablet"
        assert m.strength.value == "10mg"
        assert m.dose.value == "one tablet"
        assert m.frequency.value == "OD"
        assert m.timing.value == "after food"

    def test_eval_8_sana_clean_name_and_pan_d(self, extractor: ClinicalExtractor):
        """Test 8: 'Patient named Sana' cleanly strips prefix to 'Sana'; Pan-D strength remains unknown."""
        transcript = "Patient named Sana, age 23, tablet, PAN D, one zero one after food, three days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        # Name must be 'Sana', not 'd Sana'
        assert draft.patient.name.value == "Sana"
        assert draft.patient.age.value == 23

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Pan-D"
        assert m.form.value == "tablet"
        assert m.frequency.value == "1-0-1"
        assert m.timing.value == "after food"
        assert m.duration.value == "3 days"
        # Strength was not dictated; non-inference rule applies
        assert m.strength.value is None
        assert m.strength.status == "not_mentioned"

    def test_eval_9_rahul_menon_span_boundaries_and_duration_absence(self, extractor: ClinicalExtractor):
        """Test 9: Span extraction preserves 'Medicine A/B/C' without reduction; negative duration phrase handled."""
        transcript = (
            "Patient name, Rahul Menon. Age 32. Headache for two days. "
            "First medicine, tablet medicine A, five hundred milligram. One tablet after food, twice daily for two days. "
            "Second medicine, tablet medicine B, one tablet at night for three days. "
            "Third medicine, syrup, medicine C, five ml, three times a day. No duration was mentioned for the syrup."
        )
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Rahul Menon"
        assert draft.patient.age.value == 32
        assert draft.clinical.chief_complaints.value == "Headache for two days"

        assert len(draft.medicines) == 3
        m1, m2, m3 = draft.medicines

        assert m1.name.value == "Medicine A"
        assert m1.form.value == "tablet"
        assert m1.strength.value == "500mg"
        assert m1.frequency.value == "BD"
        assert m1.timing.value == "after food"
        assert m1.duration.value == "2 days"

        assert m2.name.value == "Medicine B"
        assert m2.form.value == "tablet"
        assert m2.frequency.value == "HS"
        assert m2.timing.value == "at bedtime"
        assert m2.duration.value == "3 days"

        assert m3.name.value == "Medicine C"
        assert m3.form.value == "syrup"
        assert m3.dose.value == "5 ml"
        assert m3.frequency.value == "TDS"
        # "No duration was mentioned for the syrup" must NOT extract a spurious duration
        assert m3.duration.value is None
        assert m3.duration.status == "not_mentioned"

    def test_eval_10_sahana_uncertain_age_handling(self, extractor: ClinicalExtractor):
        """Test 10: Uncertain age expression ('21 or 22. I'm not sure') flagged for review, not arbitrarily resolved."""
        transcript = "Patient name, Sahana, age 21 or 22. I'm not sure. Tablet medicine A, one tablet twice a day for three days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        assert draft.patient.name.value == "Sahana"
        # Age uncertainty flag
        assert draft.patient.age.status == "needs_review"
        assert draft.patient.age.confidence <= 0.50
        assert "21" in draft.patient.age.source_text and "22" in draft.patient.age.source_text

        assert len(draft.medicines) == 1
        m = draft.medicines[0]
        assert m.name.value == "Medicine A"
        assert m.form.value == "tablet"
        assert m.dose.value == "one tablet"
        assert m.frequency.value == "BD"
        assert m.duration.value == "3 days"


class TestValidationAndNormalizationSeparation:
    """Verifies that the validation and normalization layers run cleanly on regression drafts."""

    def test_eval_2_validation_flags_candidate_confirmation(self, extractor: ClinicalExtractor):
        transcript = "Patient name Rohit Shetty, age 30, male. Cough for four days. First medicine, tablet, citrazine, ten milligram, zero zero one, at night for five days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        norm_draft = PrescriptionNormalizer().normalize(draft)
        validator = ValidationPipeline()
        issues = validator.run_validation(norm_draft, raw_transcript=transcript)

        # Citrazine should trigger UNCERTAIN_MEDICINE_MATCH for confirmation without dropping the medication
        issue_codes = [i.get("code") for i in issues]
        assert "UNCERTAIN_MEDICINE_MATCH" in issue_codes
        # Medication itself must remain in the draft
        assert len(norm_draft.medicines) == 1

    def test_eval_10_validation_flags_ambiguous_age(self, extractor: ClinicalExtractor):
        transcript = "Patient name, Sahana, age 21 or 22. I'm not sure. Tablet medicine A, one tablet twice a day for three days."
        res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(res)

        norm_draft = PrescriptionNormalizer().normalize(draft)
        validator = ValidationPipeline()
        issues = validator.run_validation(norm_draft, raw_transcript=transcript)

        issue_codes = [i.get("code") for i in issues]
        assert "AMBIGUOUS_PATIENT_AGE" in issue_codes
