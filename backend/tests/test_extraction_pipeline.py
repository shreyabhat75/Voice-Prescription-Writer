"""Comprehensive automated tests for speech recognition, extraction accuracy, and clinical safety."""

from __future__ import annotations

import pytest
from backend.services.llm.clinical_extractor import ClinicalExtractor
from backend.services.normalization.normalizer import PrescriptionNormalizer
from backend.services.validation.pipeline import ValidationPipeline
from backend.models.prescription import PrescriptionDraft


class TestClinicalExtractor:
    """Tests for deterministic ClinicalExtractor."""

    @pytest.fixture
    def extractor(self) -> ClinicalExtractor:
        return ClinicalExtractor()

    def test_no_demo_patient_on_custom_dictation(self, extractor: ClinicalExtractor):
        """Verify that arbitrary doctor dictations NEVER produce 'Demo Patient', age 35, or male."""
        transcript = (
            "Patient Sinchana, 21, female. Complaints of fever for 3 days. "
            "Tablet Paracetamol 650mg 1-0-1 for 3 days. Syrup Benadryl 1-1-1 10ml for 3 days."
        )
        res = extractor.extract(transcript)
        p = res["patient"]

        assert p["name"]["value"] == "Sinchana"
        assert p["name"]["value"] != "Demo Patient"
        assert p["age"]["value"] == 21
        assert p["age"]["value"] != 35
        assert p["sex"]["value"] == "female"

    def test_missing_patient_fields_remain_null(self, extractor: ClinicalExtractor):
        """Verify unmentioned patient name, age, or sex strictly remain None / not_mentioned."""
        transcript = (
            "Complaints of severe acidity since morning. "
            "Tab Pantoprazole 40mg before breakfast once daily for 14 days."
        )
        res = extractor.extract(transcript)
        p = res["patient"]

        assert p["name"]["value"] is None
        assert p["name"]["status"] == "not_mentioned"
        assert p["name"]["value"] != "Demo Patient"

        assert p["age"]["value"] is None
        assert p["age"]["status"] == "not_mentioned"
        assert p["age"]["value"] != 35

        assert p["sex"]["value"] is None
        assert p["sex"]["status"] == "not_mentioned"
        assert p["sex"]["value"] != "male"

    def test_strict_non_inference_diagnosis(self, extractor: ClinicalExtractor):
        """Verify unstated diagnosis is NEVER inferred from complaints."""
        # Case A: Doctor dictates complaints only (no diagnosis)
        transcript = (
            "Patient Rajesh, 40, male. Complaints of fever, cough, and body ache for 2 days. "
            "Tab Paracetamol 650mg TDS."
        )
        res = extractor.extract(transcript)
        assert res["clinical"]["diagnosis"]["value"] is None
        assert res["clinical"]["diagnosis"]["status"] == "not_mentioned"

        # Case B: Doctor explicitly dictates diagnosis
        transcript_dx = (
            "Patient Rajesh, 40, male. Complaints of fever. Diagnosis acute bronchitis. "
            "Tab Augmentin 625mg BD for 5 days."
        )
        res_dx = extractor.extract(transcript_dx)
        assert res_dx["clinical"]["diagnosis"]["value"] is not None
        assert "acute bronchitis" in res_dx["clinical"]["diagnosis"]["value"].lower()

    def test_medicine_name_strength_dose_frequency_separation(self, extractor: ClinicalExtractor):
        """Verify distinct extraction of name, strength, dose, frequency, timing, and duration."""
        transcript = "Tab Dolo 650, one tablet three times a day after food for five days."
        res = extractor.extract(transcript)

        assert len(res["medicines"]) == 1
        med = res["medicines"][0]
        assert med["name"]["value"] == "Dolo"
        assert med["strength"]["value"] in ("650mg", "650")
        assert med["form"]["value"] == "tablet"
        assert "one tablet" in med["dose"]["value"].lower()
        assert med["frequency"]["value"] == "TDS"
        assert med["timing"]["value"] == "after food"
        assert med["duration"]["value"] == "5 days"

    def test_multiple_medicines_independent_extraction(self, extractor: ClinicalExtractor):
        """Verify multiple medications are extracted independently with their own parameters."""
        transcript = (
            "Tablet Pan-D before food 1-0-1 for 10 days, "
            "Paracetamol 650mg 0-0-1 for 3 days, "
            "and Syrup Benadryl 1-1-1 10ml for 3 days."
        )
        res = extractor.extract(transcript)
        meds = res["medicines"]

        assert len(meds) == 3
        names = [m["name"]["value"] for m in meds]
        assert "Pan-D" in names
        assert "Paracetamol" in names
        assert "Benadryl" in names

        # Benadryl should have dose 10ml and form syrup
        benadryl = next(m for m in meds if m["name"]["value"] == "Benadryl")
        assert benadryl["form"]["value"] == "syrup"
        assert "10" in benadryl["dose"]["value"]
        assert benadryl["frequency"]["value"] == "1-1-1"

    def test_strict_non_inference_duration(self, extractor: ClinicalExtractor):
        """Verify duration is never invented when not dictated."""
        transcript = "Tab Telma AM once daily, continue."
        res = extractor.extract(transcript)
        med = res["medicines"][0]

        assert med["name"]["value"] == "Telma AM"
        assert med["frequency"]["value"] == "OD"
        assert med["duration"]["value"] is None
        assert med["duration"]["status"] == "not_mentioned"

    def test_self_correction_and_removal(self, extractor: ClinicalExtractor):
        """Verify corrections and removals are respected."""
        transcript = (
            "Start Tab Metformin 500 BD. Sorry, make that Metformin 1000. "
            "Also remove the Montair. Tab Propranolol 20mg BD for 30 days."
        )
        res = extractor.extract(transcript)
        meds = res["medicines"]

        names = [m["name"]["value"] for m in meds]
        assert "Montair" not in names
        assert "Metformin" in names
        metformin = next(m for m in meds if m["name"]["value"] == "Metformin")
        assert metformin["strength"]["value"] == "1000mg"

    def test_empty_transcript_raises_error(self, extractor: ClinicalExtractor):
        """Verify empty transcript is rejected with ValueError."""
        from backend.services.llm.mock_provider import MockLLMProvider
        provider = MockLLMProvider()
        coro = provider.extract_prescription("   ")
        with pytest.raises(ValueError):
            coro.send(None)

    def test_shreya_bhatt_critical_target_dictation(self, extractor: ClinicalExtractor):
        """Verify the exact doctor dictation with Shreya Bhatt, 21, Dolo 650, Dolo 2, Montelukast, Benadryl."""
        from backend.services.clarification.clarification_service import ClarificationService

        transcript = (
            "Patient Shreya Bhatt, 21. Fever from 3 days. "
            "Tab Dolo 650 mg, 1-0-1 after food for 3 days. "
            "Tab Dolo 2, Montelukast, 0-0-1 after food for 3 days. "
            "Syrup Benadryl, 10 ml, 3 times a day after food."
        )

        raw_res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(raw_res)

        # 1. Patient verification: Name and age extracted, sex NOT inferred (None)
        assert draft.patient.name.value == "Shreya Bhatt"
        assert draft.patient.name.status == "extracted"
        assert draft.patient.age.value == 21
        assert draft.patient.age.status == "extracted"
        assert draft.patient.sex.value is None
        assert draft.patient.sex.status == "not_mentioned"

        # 2. Clinical verification
        assert "Fever" in draft.clinical.chief_complaints.value

        # 3. Medicine verification (All 4 items preserved in order)
        assert len(draft.medicines) == 4
        m1, m2, m3, m4 = draft.medicines

        # Item 1: Dolo 650 mg 1-0-1 after food for 3 days
        assert m1.name.value == "Dolo"
        assert m1.strength.value in ("650 mg", "650mg")
        assert m1.frequency.value == "1-0-1"
        assert m1.timing.value == "after food"
        assert m1.duration.value == "3 days"
        assert m1.form.value == "tablet"

        # Item 2: Tab Dolo 2 (Ambiguous phrase preserved and flagged for review)
        assert m2.name.value == "Dolo 2"
        assert m2.name.status == "needs_review"
        assert m2.form.value == "tablet"
        assert m2.special_instructions is not None
        assert m2.special_instructions.status == "needs_review"

        # Item 3: Montelukast 0-0-1 after food for 3 days
        assert m3.name.value == "Montelukast"
        assert m3.frequency.value == "0-0-1"
        assert m3.timing.value == "after food"
        assert m3.duration.value == "3 days"
        assert m3.form.value == "tablet"

        # Item 4: Syrup Benadryl 10 ml 3 times a day after food (duration strictly None)
        assert m4.name.value == "Benadryl"
        assert m4.form.value == "syrup"
        assert m4.dose.value == "10 ml"
        assert m4.frequency.value == "TDS"
        assert m4.timing.value == "after food"
        assert m4.duration.value is None
        assert m4.duration.status == "not_mentioned"

        # 4. Normalization and Clarification question generation
        normalizer = PrescriptionNormalizer()
        norm_draft = normalizer.normalize(draft)

        validator = ValidationPipeline()
        issues = validator.run_validation(norm_draft, raw_transcript=transcript)

        clarifier = ClarificationService()
        questions = clarifier.generate_questions(norm_draft, issues)

        assert any("Dolo 2" in q["question"] for q in questions)

    def test_sintana_bhatt_latest_failing_transcript(self, extractor: ClinicalExtractor):
        """Verify the latest failing transcript with Sintana Bhatt, 22-1, Diary of 3 days, Pandy/Double Pandy, etc."""
        from backend.services.clarification.clarification_service import ClarificationService

        transcript = (
            "Sintana Bhatt 22-1, Diary of 3 days, Pandy, Double Pandy, before food, 10-1. "
            "Second one is Paracetamol 650mg, 10-1, 3 days and Benadryl syrup, 1-1-1 10ml for 3 days. "
            "And she is familiar."
        )

        raw_res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(raw_res)

        # 1. Patient verification
        assert draft.patient.name.value == "Sintana Bhatt"
        assert draft.patient.name.status == "extracted"

        # 22-1 must NOT be treated as a confirmed age without review
        assert draft.patient.age.value == 22
        assert draft.patient.age.source_text == "22-1"
        assert draft.patient.age.status == "needs_review"
        assert draft.patient.age.confidence == 0.50

        # Sex must strictly remain None (do not infer from name or "she is familiar")
        assert draft.patient.sex.value is None
        assert draft.patient.sex.status == "not_mentioned"

        # 2. Clinical verification
        # Chief complaints must capture "Diary of 3 days" and NOT swallow medicines
        assert "3 days" in draft.clinical.chief_complaints.value
        assert draft.clinical.chief_complaints.source_text == "Diary of 3 days"
        assert draft.clinical.chief_complaints.status == "needs_review"

        # Unclear phrase "she is familiar" must be preserved and flagged, NOT interpreted as advice
        assert len(draft.clinical.unclear_phrases) >= 1
        unclear_item = draft.clinical.unclear_phrases[0]
        assert "she is familiar" in unclear_item.value
        assert unclear_item.status == "needs_review"
        assert draft.clinical.advice.value is None
        assert draft.clinical.advice.status == "not_mentioned"

        # 3. Medicine verification (3 distinct medications in dictation order)
        assert len(draft.medicines) == 3
        m1, m2, m3 = draft.medicines

        # Medicine 1: Pandy / Double Pandy
        assert "Pandy" in m1.raw_phrase and "Double Pandy" in m1.raw_phrase
        assert m1.name.value == "Double Pandy"
        assert m1.name.status == "needs_review"
        assert "Pan-D" in m1.candidate_matches
        assert m1.timing.value == "before food"
        assert m1.frequency.value == "1-0-1"

        # Medicine 2: Paracetamol 650mg
        assert m2.name.value == "Paracetamol"
        assert m2.strength.value == "650mg"
        assert m2.frequency.value == "1-0-1"
        assert m2.duration.value == "3 days"
        assert m2.form.value == "tablet"

        # Medicine 3: Benadryl syrup, 1-1-1 10ml for 3 days
        assert m3.name.value == "Benadryl"
        assert m3.form.value == "syrup"
        assert m3.dose.value == "10ml"
        assert m3.frequency.value == "1-1-1"
        assert m3.duration.value == "3 days"

        # 4. Normalization & Validation
        norm_draft = PrescriptionNormalizer().normalize(draft)
        validator = ValidationPipeline()
        issues = validator.run_validation(norm_draft, raw_transcript=transcript)

        # Must flag uncertain medicine match, ambiguous age, and unclear dictation remark
        issue_codes = [i.get("code") for i in issues]
        assert "UNCERTAIN_MEDICINE_MATCH" in issue_codes
        assert "AMBIGUOUS_PATIENT_AGE" in issue_codes
        assert "UNCLEAR_DICTATION_PHRASE" in issue_codes

        # 5. Clarification Question Generation
        clarifier = ClarificationService()
        questions = clarifier.generate_questions(norm_draft, issues)
        q_fields = [q["field"] for q in questions]

        assert "patient.age" in q_fields
        assert any("Pan-D" in q["question"] for q in questions)
        assert "clinical.unclear_phrases" in q_fields

    def test_normalization_pipeline_on_extracted_draft(self, extractor: ClinicalExtractor):
        """Verify that normalizer properly standardizes frequencies, routes, and timings."""
        transcript = "Tab Dolo 650 one-zero-one after food for five days, Inj Ceftriaxone 1g IV stat."
        raw_res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(raw_res)

        normalizer = PrescriptionNormalizer()
        norm_draft = normalizer.normalize(draft)

        assert len(norm_draft.medicines) == 2
        dolo = norm_draft.medicines[0]
        assert dolo.frequency.value in ("1-0-1", "BD") or dolo.frequency.code == "1-0-1"

        ceft = norm_draft.medicines[1]
        assert ceft.route.value == "intravenous"
        assert ceft.frequency.value == "STAT" or ceft.frequency.code == "STAT"

    def test_validation_flags_unverified_source_text(self, extractor: ClinicalExtractor):
        """Verify that source-based validation flags values that do not occur in the transcript."""
        transcript = "Tab Dolo 650 TDS for 5 days."
        raw_res = extractor.extract(transcript)
        # Artificially alter duration to 10 days
        raw_res["medicines"][0]["duration"]["value"] = "10 days"
        raw_res["medicines"][0]["duration"]["source_text"] = "for 10 days"

        draft = PrescriptionDraft.model_validate(raw_res)
        validator = ValidationPipeline()
        issues = validator.run_validation(draft, raw_transcript=transcript)

        # Should flag unverified source text
        unverified = [i for i in issues if i.get("code") == "UNVERIFIED_SOURCE_TEXT"]
        assert len(unverified) > 0

    def test_shaya_mohanrat_spoken_numbered_dictation(self, extractor: ClinicalExtractor):
        """Verify dictation with spoken numbers, 'tablet one/two', 'six fifty mg', 'Serab benedryl'."""
        transcript = (
            "Patient Shaya Mohanrat, 21 female. Fever from three days. "
            "Medications, tablet one, paracetamol six fifty mg, one zero one, three days after food. "
            "Para... Tablet two, montelicast zero zero one after food, three days. "
            "Serab benedryl, one one one, ten ml, three days."
        )

        raw_res = extractor.extract(transcript)
        draft = PrescriptionDraft.model_validate(raw_res)

        # 1. Patient verification
        assert draft.patient.name.value == "Shaya Mohanrat"
        assert draft.patient.age.value == 21
        assert draft.patient.sex.value == "female"

        # 2. Clinical verification
        assert "Fever from three days" in draft.clinical.chief_complaints.value

        # 3. Medicine verification (All 3 separate ordered medicines)
        assert len(draft.medicines) == 3

        # Item 1: Paracetamol
        m1 = draft.medicines[0]
        assert m1.name.value == "Paracetamol"
        assert m1.strength.value == "650mg"
        assert m1.form.value == "tablet"
        assert m1.frequency.value == "1-0-1"
        assert m1.timing.value == "after food"
        assert m1.duration.value == "3 days"

        # Item 2: Montelukast (dictated as 'montelicast', flagged with candidate match)
        m2 = draft.medicines[1]
        assert "montelicast" in m2.name.value.lower() or "montelukast" in m2.name.value.lower()
        assert m2.form.value == "tablet"
        assert m2.frequency.value == "0-0-1"
        assert m2.timing.value == "after food"
        assert m2.duration.value == "3 days"
        assert any("Montelukast" in c for c in m2.candidate_matches)

        # Item 3: Benadryl (dictated as 'Serab benedryl')
        m3 = draft.medicines[2]
        assert "benedryl" in m3.name.value.lower() or "benadryl" in m3.name.value.lower()
        assert m3.form.value == "syrup"
        assert m3.dose.value == "10 ml"
        assert m3.frequency.value == "1-1-1"
        assert m3.duration.value == "3 days"
        assert any("Benadryl" in c for c in m3.candidate_matches)
