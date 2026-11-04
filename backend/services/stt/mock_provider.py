"""Mock STT provider that returns pre-defined transcripts for testing."""

from __future__ import annotations

import time
from pathlib import Path

from backend.services.stt.base import STTProvider, STTResult

# ---------------------------------------------------------------------------
# Pre-defined dictation scripts (7 test cases)
# ---------------------------------------------------------------------------

SCRIPT_1 = (
    "Patient name Rajesh Kumar age 45 years male. "
    "Chief complaints fever and body ache for 3 days. "
    "Diagnosis viral fever. "
    "Prescription: "
    "Tab Dolo 650 one tablet three times a day for 5 days. "
    "Tab Cetirizine 10mg one tablet at night for 5 days. "
    "Advice rest and plenty of fluids. "
    "Follow up after 5 days."
)

SCRIPT_2 = (
    "Patient Sunita Sharma age 38 female. "
    "Chief complaint acidity and gastric pain since 1 week. "
    "Diagnosis GERD. "
    "Prescription: "
    "Tab Pantoprazole 40mg one tablet before breakfast for 14 days. "
    "Tab Combiflam one tablet SOS for pain. "
    "Advice avoid spicy and oily food. "
    "Follow up after 2 weeks."
)

SCRIPT_3 = (
    "Patient Mohan Lal age 62 male. "
    "Chief complaints breathlessness and cough with sputum for 10 days. "
    "Diagnosis COPD with acute exacerbation. "
    "Prescription: "
    "Inj Hydrocortisone 100mg IV stat. "
    "Neb Duolin plus Budecort nebulization three times a day. "
    "Tab Azithromycin 500mg once daily for 5 days. "
    "Tab Deriphyllin retard 150mg twice daily for 7 days. "
    "Syrup Ambrodil-S 10ml three times a day for 7 days. "
    "Investigations: CBC, chest X-ray PA view, sputum culture. "
    "Advice no smoking, avoid dust and cold air. "
    "Follow up after 1 week with reports."
)

SCRIPT_4 = (
    "Patient Priya Menon age 29 female. "
    "Chief complaints headache on and off for 1 month, more on the right side. "
    "Diagnosis migraine. "
    "Prescription: "
    "Tab Sumatriptan 25mg... no wait, make that Sumatriptan 50mg one tablet SOS for headache. "
    "Tab Amitriptyline 10mg one tablet at night for 30 days. "
    "Actually remove the Amitriptyline. "
    "Tab Propranolol 20mg one tablet twice daily for 30 days. "
    "Advice maintain headache diary, avoid triggers. "
    "Follow up after 1 month."
)

SCRIPT_5 = (
    "Patient Arjun Patel age 8 years male. "
    "Chief complaints vomiting and loose stools since morning. "
    "Diagnosis acute gastroenteritis. "
    "Prescription: "
    "Inj Ondansetron 2mg IV stat. "
    "Syrup Econorm one sachet twice daily for 5 days. "
    "ORS solution ad lib. "
    "Tab Paracetamol 250mg if fever above 100 degrees, SOS, maximum three times a day. "
    "Advice continue breastfeeding, give ORS after every loose stool. "
    "Follow up tomorrow or earlier if not improving."
)

SCRIPT_6 = (
    "Patient Kamala Devi age 55 years female. "
    "Chief complaints headache and dizziness for 2 days. "
    "BP 160 by 100. "
    "Diagnosis hypertension. "
    "Prescription: "
    "Tab Amlodipine 5mg once daily. "
    "Tab Ecosprin 75mg once daily after food. "
    "Advice low salt diet, regular exercise, daily BP monitoring. "
    "Follow up after 1 week with BP chart."
)

SCRIPT_7 = (
    "Patient ka naam Ravi Shankar hai, age 50 saal, male. "
    "Chief complaint pet mein dard aur gas ban rahi hai do dinon se. "
    "Diagnosis peptic ulcer disease. "
    "Dawai likhiye: "
    "Tab Pantoprazole 40mg subah khali pet ek tablet 14 din tak. "
    "Syrup Sucralfate 10ml khana khane se pehle din mein teen baar 14 din. "
    "Tab Domperidone 10mg khana khane se pehle din mein teen baar 7 din. "
    "Advice: khana time pe khayein, mirchi masala band, smoking band. "
    "Follow up 2 hafte baad."
)

# Map from known audio file names/identifiers to scripts
SCRIPT_MAP: dict[str, str] = {
    "script_1": SCRIPT_1,
    "script_2": SCRIPT_2,
    "script_3": SCRIPT_3,
    "script_4": SCRIPT_4,
    "script_5": SCRIPT_5,
    "script_6": SCRIPT_6,
    "script_7": SCRIPT_7,
    "test_1": SCRIPT_1,
    "test_2": SCRIPT_2,
    "test_3": SCRIPT_3,
    "test_4": SCRIPT_4,
    "test_5": SCRIPT_5,
    "test_6": SCRIPT_6,
    "test_7": SCRIPT_7,
}

DEFAULT_TRANSCRIPT = (
    "Patient name Test Patient age 30 years male. "
    "Chief complaints fever for 2 days. "
    "Diagnosis viral fever. "
    "Prescription: "
    "Tab Paracetamol 500mg one tablet three times a day for 3 days. "
    "Advice rest and drink fluids. "
    "Follow up after 3 days."
)


class MockSTTProvider(STTProvider):
    """Mock STT provider for development and testing.

    Returns pre-defined transcripts based on the audio file name.
    If the file name is not recognized, a default transcript is returned.
    """

    async def transcribe(
        self,
        audio_path: str,
        audio_format: str = "webm",
    ) -> STTResult:
        """Return a canned transcript matching the audio file name."""
        start = time.monotonic()

        stem = Path(audio_path).stem.lower()

        # Try to match the file name to a known script (for unit/integration testing)
        for key, script in SCRIPT_MAP.items():
            if key in stem:
                elapsed_ms = (time.monotonic() - start) * 1000
                return STTResult(
                    text=script,
                    provider="mock",
                    model="mock-v1",
                    latency_ms=round(elapsed_ms, 2),
                    confidence=0.98,
                    language="en-IN",
                )

        # If this is a real user recording (not a test script file name), transcribe with Whisper
        # instead of silently returning a canned demo transcript!
        audio_file = Path(audio_path)
        if audio_file.exists() and audio_file.stat().st_size > 100:
            try:
                from backend.services.stt.whisper_provider import WhisperSTTProvider
                return await WhisperSTTProvider().transcribe(audio_path, audio_format)
            except Exception as e:
                raise ValueError(
                    f"Speech-to-Text transcription failed for recorded audio: {e}"
                ) from e

        # If file is empty or missing, raise explicit error - never silently return mock data
        raise ValueError(
            f"Audio file '{audio_path}' could not be transcribed. File is empty or unrecognized."
        )
