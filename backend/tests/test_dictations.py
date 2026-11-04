"""Tests evaluating all 7 medical dictation scripts from the assignment specifications."""

from __future__ import annotations

import json
import pytest
from backend.services.llm.mock_provider import MockLLMProvider
from backend.services.normalization.normalizer import PrescriptionNormalizer
from backend.services.stt.mock_provider import (
    MockSTTProvider,
    SCRIPT_1,
    SCRIPT_2,
    SCRIPT_3,
    SCRIPT_4,
    SCRIPT_5,
    SCRIPT_6,
    SCRIPT_7,
)
from backend.services.validation.pipeline import ValidationPipeline
from backend.models.prescription import PrescriptionDraft


@pytest.mark.asyncio
async def test_script_1_basic_extraction():
    """Script 1: Basic extraction with Dolo 650 TDS and Cetirizine 10mg HS."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()
    normalizer = PrescriptionNormalizer()
    validator = ValidationPipeline()

    stt_res = await stt.transcribe("test_script_1.webm")
    assert "Rajesh Kumar" in stt_res.text
    assert "Dolo 650" in stt_res.text

    llm_res = await llm.extract_prescription(stt_res.text)
    data = json.loads(llm_res.raw_json)
    draft = PrescriptionDraft.model_validate(data)

    # Patient assertions
    assert draft.patient.name.value == "Rajesh Kumar"
    assert draft.patient.age.value == 45
    assert draft.patient.sex.value == "male"

    # Medicine assertions
    assert len(draft.medicines) == 2
    dolo = draft.medicines[0]
    assert dolo.name.value == "Dolo"
    assert dolo.strength.value == "650mg"
    assert dolo.duration.value == "5 days"

    # Shorthand normalization
    normalized = normalizer.normalize(draft)
    assert "Three Times Daily" in (normalized.medicines[0].frequency_normalized or "")

    # Validation
    issues = validator.run_validation(normalized, raw_transcript=stt_res.text)
    error_issues = [i for i in issues if i.get("severity") == "error"]
    assert len(error_issues) == 0


@pytest.mark.asyncio
async def test_script_2_ac_and_sos():
    """Script 2: Before breakfast (AC) and SOS syrup instruction."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()
    normalizer = PrescriptionNormalizer()

    stt_res = await stt.transcribe("test_script_2.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))
    normalized = normalizer.normalize(draft)

    # Pantoprazole AC check
    panto = normalized.medicines[0]
    assert panto.name.value == "Pantoprazole"
    assert "before breakfast" in (panto.timing.value or "").lower()

    # Combiflam SOS check
    combi = normalized.medicines[1]
    assert combi.name.value == "Combiflam"
    assert combi.frequency.value == "SOS"


@pytest.mark.asyncio
async def test_script_3_multiple_meds_and_investigations():
    """Script 3: Multiple medicines, IV Hydrocortisone, Duolin nebulization, investigations."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()

    stt_res = await stt.transcribe("test_script_3.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))

    assert draft.clinical.diagnosis.value == "COPD with acute exacerbation"
    assert "CBC" in (draft.clinical.investigations.value or "")
    assert len(draft.medicines) >= 4

    # IV Stat check
    hydro = draft.medicines[0]
    assert hydro.name.value == "Hydrocortisone"
    assert hydro.frequency.value == "STAT"
    assert hydro.route.value == "intravenous"


@pytest.mark.asyncio
async def test_script_4_self_correction_and_removal():
    """Script 4: Self-correction (Sumatriptan 50mg, NOT 25mg) and removal of Amitriptyline."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()

    stt_res = await stt.transcribe("test_script_4.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))

    med_names = [m.name.value for m in draft.medicines]
    assert "Sumatriptan" in med_names
    assert "Amitriptyline" not in med_names, "Amitriptyline should have been removed per doctor instruction"

    # Strength check
    suma = next(m for m in draft.medicines if m.name.value == "Sumatriptan")
    assert suma.strength.value == "50mg", "Doctor corrected dose to 50mg"


@pytest.mark.asyncio
async def test_script_5_iv_stat_and_conditional():
    """Script 5: Injection Ondansetron IV stat and conditional Paracetamol."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()

    stt_res = await stt.transcribe("test_script_5.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))

    ond = next(m for m in draft.medicines if m.name.value == "Ondansetron")
    assert ond.frequency.value == "STAT"
    assert ond.route.value == "intravenous"

    pcm = next(m for m in draft.medicines if m.name.value == "Paracetamol")
    assert "fever above 100" in (pcm.timing.value or "")


@pytest.mark.asyncio
async def test_script_6_strict_non_inference_duration():
    """Script 6: Missing duration must remain empty (NEVER infer duration)."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()
    validator = ValidationPipeline()

    stt_res = await stt.transcribe("test_script_6.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))

    # Strict check: Amlodipine duration MUST be not_mentioned
    amlo = next(m for m in draft.medicines if m.name.value == "Amlodipine")
    assert amlo.duration.value is None or amlo.duration.status == "not_mentioned"
    assert amlo.duration.status == "not_mentioned"

    ecos = next(m for m in draft.medicines if m.name.value == "Ecosprin")
    assert ecos.duration.value is None or ecos.duration.status == "not_mentioned"

    # Completeness validator should flag missing duration as warning, but not crash
    issues = validator.run_validation(draft, raw_transcript=stt_res.text)
    dur_issues = [i for i in issues if "duration" in i.get("field", "").lower()]
    assert len(dur_issues) > 0


@pytest.mark.asyncio
async def test_script_7_code_mixed_hindi_english():
    """Script 7: Hindi-English code-mixed dictation."""
    stt = MockSTTProvider()
    llm = MockLLMProvider()
    normalizer = PrescriptionNormalizer()

    stt_res = await stt.transcribe("test_script_7.webm")
    llm_res = await llm.extract_prescription(stt_res.text)
    draft = PrescriptionDraft.model_validate(json.loads(llm_res.raw_json))
    normalized = normalizer.normalize(draft)

    assert draft.patient.name.value == "Ravi Shankar"
    assert draft.patient.age.value == 50

    panto = next(m for m in normalized.medicines if m.name.value == "Pantoprazole")
    assert "khali pet" in (panto.timing.source_text or "")

