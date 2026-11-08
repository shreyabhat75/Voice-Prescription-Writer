"""Generate structured JSON and verified PDF sample outputs for all 7 test dictation scripts."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.models.prescription import PrescriptionDraft, PrescriptionResponse
from backend.services.normalization.normalizer import PrescriptionNormalizer
from backend.services.pdf.pdf_generator import PrescriptionPDFGenerator
from backend.services.stt.mock_provider import (
    SCRIPT_1,
    SCRIPT_2,
    SCRIPT_3,
    SCRIPT_4,
    SCRIPT_5,
    SCRIPT_6,
    SCRIPT_7,
    MockSTTProvider,
)
from backend.services.llm.mock_provider import MockLLMProvider


SCRIPTS = [
    ("script_1", "Basic Prescription (Dolo 650 TDS, Cetirizine 10mg HS)", SCRIPT_1),
    ("script_2", "Before Breakfast (AC) and SOS Instructions (Pantoprazole, Combiflam)", SCRIPT_2),
    ("script_3", "Multiple Medicines, Inhalers & Diagnostic Tests (COPD Exacerbation)", SCRIPT_3),
    ("script_4", "Self-Correction & Drug Removal (Sumatriptan 50mg, remove Amitriptyline)", SCRIPT_4),
    ("script_5", "Pediatric Acute Gastroenteritis (IV Stat, ORS, Conditional Paracetamol)", SCRIPT_5),
    ("script_6", "Strict Non-Inference for Missing Duration (Amlodipine, Ecosprin)", SCRIPT_6),
    ("script_7", "Hindi-English Code-Mixed Dictation (Pantoprazole, Metformin)", SCRIPT_7),
]


async def main():
    samples_dir = PROJECT_ROOT / "samples"
    samples_dir.mkdir(exist_ok=True)

    stt = MockSTTProvider()
    llm = MockLLMProvider()
    normalizer = PrescriptionNormalizer()
    pdf_gen = PrescriptionPDFGenerator()

    manifest = []

    print(f"Generating sample outputs in {samples_dir}...")

    for script_id, title, raw_transcript in SCRIPTS:
        print(f"\nProcessing {script_id}: {title}...")
        
        # 1. LLM extraction
        llm_res = await llm.extract_prescription(raw_transcript)
        raw_dict = json.loads(llm_res.raw_json)
        draft = PrescriptionDraft.model_validate(raw_dict)

        # 2. Shorthand normalization & AI demographic reasoning
        normalized_draft = await normalizer.normalize_async(draft)

        # 3. Create confirmed PrescriptionResponse
        rx_id = f"rx-{script_id}-sample"
        rx_response = PrescriptionResponse(
            id=rx_id,
            patient=normalized_draft.patient,
            clinical=normalized_draft.clinical,
            medicines=normalized_draft.medicines,
            raw_transcript=raw_transcript,
            status="confirmed",
            doctor_name="Dr. Ananya Rao, MD",
            doctor_id="dr_ananya_rao",
            permanent_patient_id=f"PID-2026-{script_id.split('_')[-1].zfill(4)}",
            confirmed_at="2026-11-08T18:00:00",
            version=1,
        )

        # 4. Save JSON output
        json_path = samples_dir / f"{script_id}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(rx_response.model_dump_json(indent=2))
        print(f"  [✓] JSON generated: {json_path.name} ({json_path.stat().st_size} bytes)")

        # 5. Generate verified PDF output
        gen_pdf_path = pdf_gen.generate(rx_response, patient_id=rx_response.permanent_patient_id)
        target_pdf_path = samples_dir / f"{script_id}.pdf"
        import shutil
        shutil.copyfile(gen_pdf_path, target_pdf_path)
        print(f"  [✓] PDF generated: {target_pdf_path.name} ({target_pdf_path.stat().st_size} bytes)")

        manifest.append({
            "script_id": script_id,
            "title": title,
            "patient_name": normalized_draft.patient.name.value,
            "age": normalized_draft.patient.age.value,
            "sex": normalized_draft.patient.sex.value,
            "medicines_count": len(normalized_draft.medicines),
            "json_file": f"{script_id}.json",
            "pdf_file": f"{script_id}.pdf",
        })

    # Save manifest index
    manifest_path = samples_dir / "samples_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"samples": manifest}, f, indent=2)
    print(f"\n[✓] Manifest saved to {manifest_path.name}")
    print(f"\nSuccessfully generated {len(SCRIPTS)} sample JSONs and {len(SCRIPTS)} sample PDFs in 'samples/' folder.")


if __name__ == "__main__":
    asyncio.run(main())
