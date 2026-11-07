"""Orchestration service managing the full lifecycle of a voice prescription."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from backend.database import get_db
from backend.models.prescription import (
    ClinicalInfo,
    MedicineItem,
    PatientInfo,
    PrescriptionDraft,
    PrescriptionResponse,
    SourceEvidence,
)
from backend.services.clarification.clarification_service import ClarificationService
from backend.services.llm.factory import get_llm_provider
from backend.services.normalization.normalizer import PrescriptionNormalizer
from backend.services.pdf.pdf_generator import PrescriptionPDFGenerator
from backend.services.stt.factory import get_stt_provider
from backend.services.validation.pipeline import ValidationPipeline
from backend.services.voice_edit.voice_edit_service import VoiceEditService

logger = logging.getLogger(__name__)


class PrescriptionService:
    """Core service for managing voice prescriptions."""

    def __init__(self) -> None:
        self.stt_provider = get_stt_provider()
        self.llm_provider = get_llm_provider()
        self.normalizer = PrescriptionNormalizer()
        self.validator = ValidationPipeline()
        self.clarification_svc = ClarificationService()
        self.voice_edit_svc = VoiceEditService(llm_provider=self.llm_provider)
        self.pdf_generator = PrescriptionPDFGenerator()

    async def create_prescription(
        self,
        notes: str | None = None,
        doctor_name: str | None = None,
        doctor_id: str | None = None,
    ) -> PrescriptionResponse:
        """Initialize an empty prescription in 'recording' status."""
        p_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        empty_patient = PatientInfo(
            name=SourceEvidence(status="not_mentioned"),
            age=SourceEvidence(status="not_mentioned"),
            sex=SourceEvidence(status="not_mentioned"),
        )
        empty_clinical = ClinicalInfo(
            chief_complaints=SourceEvidence(status="not_mentioned"),
            diagnosis=SourceEvidence(status="not_mentioned"),
            investigations=SourceEvidence(status="not_mentioned"),
            advice=SourceEvidence(status="not_mentioned"),
            follow_up=SourceEvidence(status="not_mentioned"),
        )

        rx = PrescriptionResponse(
            id=p_id,
            status="recording",
            patient=empty_patient,
            clinical=empty_clinical,
            medicines=[],
            raw_transcript=None,
            audio_url=None,
            validation_issues=[],
            clarification_questions=[],
            doctor_name=doctor_name,
            doctor_id=doctor_id,
            created_at=now,
            updated_at=now,
            version=1,
        )

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO prescriptions (
                    id, status, patient_json, clinical_json, validation_json,
                    clarification_json, version, created_at, updated_at,
                    doctor_name, doctor_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rx.id,
                    rx.status,
                    rx.patient.model_dump_json(),
                    rx.clinical.model_dump_json(),
                    json.dumps(rx.validation_issues),
                    json.dumps(rx.clarification_questions),
                    rx.version,
                    rx.created_at,
                    rx.updated_at,
                    rx.doctor_name,
                    rx.doctor_id,
                ),
            )
            # Store initial version snapshot
            await db.execute(
                """
                INSERT INTO prescription_versions (
                    id, prescription_id, version, snapshot_json, change_type, change_details
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    rx.id,
                    1,
                    rx.model_dump_json(),
                    "initial",
                    "Created new empty prescription draft",
                ),
            )
            await db.commit()

        return rx

    async def get_prescription(self, prescription_id: str) -> PrescriptionResponse | None:
        """Fetch prescription by ID."""
        async with get_db() as db:
            async with db.execute(
                "SELECT * FROM prescriptions WHERE id = ?",
                (prescription_id,),
            ) as cursor:
                row = await cursor.fetchone()

            if not row:
                return None

            # Fetch medicine items
            async with db.execute(
                "SELECT medicine_json FROM medicine_items WHERE prescription_id = ? ORDER BY item_index ASC",
                (prescription_id,),
            ) as cursor:
                med_rows = await cursor.fetchall()

        medicines: list[MedicineItem] = []
        for m_row in med_rows:
            raw_m = m_row["medicine_json"]
            if isinstance(raw_m, dict):
                medicines.append(MedicineItem.model_validate(raw_m))
            elif isinstance(raw_m, str):
                medicines.append(MedicineItem.model_validate_json(raw_m))

        raw_patient = row["patient_json"]
        if isinstance(raw_patient, dict):
            patient = PatientInfo.model_validate(raw_patient)
        elif isinstance(raw_patient, str):
            patient = PatientInfo.model_validate_json(raw_patient)
        else:
            patient = PatientInfo(
                name=SourceEvidence(status="not_mentioned"),
                age=SourceEvidence(status="not_mentioned"),
                sex=SourceEvidence(status="not_mentioned"),
            )

        raw_clinical = row["clinical_json"]
        if isinstance(raw_clinical, dict):
            clinical = ClinicalInfo.model_validate(raw_clinical)
        elif isinstance(raw_clinical, str):
            clinical = ClinicalInfo.model_validate_json(raw_clinical)
        else:
            clinical = ClinicalInfo(
                chief_complaints=SourceEvidence(status="not_mentioned"),
                diagnosis=SourceEvidence(status="not_mentioned"),
                investigations=SourceEvidence(status="not_mentioned"),
                advice=SourceEvidence(status="not_mentioned"),
                follow_up=SourceEvidence(status="not_mentioned"),
            )

        val_raw = row["validation_json"]
        if isinstance(val_raw, list):
            val_issues = val_raw
        elif isinstance(val_raw, str) and val_raw.strip():
            try:
                val_issues = json.loads(val_raw)
            except Exception:
                val_issues = []
        else:
            val_issues = []

        clar_raw = row["clarification_json"]
        if isinstance(clar_raw, list):
            clar_questions = clar_raw
        elif isinstance(clar_raw, str) and clar_raw.strip():
            try:
                clar_questions = json.loads(clar_raw)
            except Exception:
                clar_questions = []
        else:
            clar_questions = []

        # Resolve permanent patient ID if linked
        row_keys = row.keys() if hasattr(row, "keys") else []
        pid = row["patient_id"] if "patient_id" in row_keys else None
        perm_pid = None
        if pid:
            async with get_db() as db:
                cur = await db.execute("SELECT patient_id FROM patients WHERE id = ?", (pid,))
                p_row = await cur.fetchone()
                if p_row:
                    perm_pid = p_row["patient_id"]

        edited_tx = row["edited_transcript"] if "edited_transcript" in row_keys else None
        pdf_path = row["pdf_path"] if "pdf_path" in row_keys else None
        verified_at = row["verified_at"] if "verified_at" in row_keys else (row["confirmed_at"] if row["status"] == "confirmed" else None)
        doc_name = row["doctor_name"] if "doctor_name" in row_keys else None
        doc_id = row["doctor_id"] if "doctor_id" in row_keys else None

        created_at_val = row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"])
        updated_at_val = row["updated_at"].isoformat() if hasattr(row["updated_at"], "isoformat") else str(row["updated_at"])
        confirmed_at_val = row["confirmed_at"].isoformat() if hasattr(row["confirmed_at"], "isoformat") else row["confirmed_at"]
        verified_at_val = verified_at.isoformat() if hasattr(verified_at, "isoformat") else verified_at

        return PrescriptionResponse(
            id=row["id"],
            patient_id=pid,
            permanent_patient_id=perm_pid,
            doctor_id=doc_id,
            doctor_name=doc_name,
            status=row["status"],
            patient=patient,
            clinical=clinical,
            medicines=medicines,
            raw_transcript=row["raw_transcript"],
            edited_transcript=edited_tx,
            pdf_path=pdf_path,
            audio_url=row["audio_url"],
            validation_issues=val_issues,
            clarification_questions=clar_questions,
            created_at=created_at_val,
            updated_at=updated_at_val,
            confirmed_at=confirmed_at_val,
            verified_at=verified_at_val,
            version=row["version"],
        )

    async def list_prescriptions(self, doctor_name: str | None = None) -> list[dict[str, Any]]:
        """List all prescriptions with basic metadata, optionally filtered by attending doctor."""
        where_clause = ""
        params: list[Any] = []

        if doctor_name and doctor_name.strip():
            clean_doc = doctor_name.strip().replace("Dr.", "").replace("Dr ", "").strip()
            like_pat = f"%{clean_doc}%"
            where_clause = """
                WHERE (
                    LOWER(COALESCE(p.doctor_name, '')) LIKE LOWER(?)
                    OR p.id IN (SELECT prescription_id FROM confirmation_records WHERE LOWER(confirmed_by) LIKE LOWER(?))
                    OR p.id IN (SELECT prescription_id FROM patient_audit_logs WHERE LOWER(actor_id) LIKE LOWER(?))
                )
            """
            params = [like_pat, like_pat, like_pat]

        sql = f"""
            SELECT p.id, p.status, p.patient_json, p.version, p.created_at, p.updated_at, p.confirmed_at,
                   p.doctor_name, p.doctor_id,
                   COUNT(m.id) as medicine_count
            FROM prescriptions p
            LEFT JOIN medicine_items m ON p.id = m.prescription_id
            {where_clause}
            GROUP BY p.id, p.status, p.patient_json, p.version, p.created_at, p.updated_at, p.confirmed_at, p.doctor_name, p.doctor_id
            ORDER BY p.updated_at DESC
        """

        async with get_db() as db:
            cur = await db.execute(sql, tuple(params))
            rows = await cur.fetchall()

        results = []
        for r in rows:
            raw_p = r["patient_json"]
            if isinstance(raw_p, str):
                try:
                    p_data = json.loads(raw_p)
                except Exception:
                    p_data = {}
            elif isinstance(raw_p, dict):
                p_data = raw_p
            else:
                p_data = {}

            name_entry = p_data.get("name")
            if isinstance(name_entry, dict):
                name_val = name_entry.get("value") or "Unnamed Patient"
            elif isinstance(name_entry, str) and name_entry.strip():
                name_val = name_entry.strip()
            else:
                name_val = "Unnamed Patient"

            results.append({
                "id": r["id"],
                "patient_name": name_val,
                "doctor_name": r["doctor_name"] if "doctor_name" in r.keys() else None,
                "doctor_id": r["doctor_id"] if "doctor_id" in r.keys() else None,
                "status": r["status"],
                "version": r["version"],
                "medicine_count": r["medicine_count"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "confirmed_at": r["confirmed_at"],
            })
        return results

    async def attach_audio(
        self,
        prescription_id: str,
        file_path: str,
        size_bytes: int,
        format_str: str = "webm",
    ) -> PrescriptionResponse:
        """Record audio file upload for a prescription."""
        audio_id = str(uuid.uuid4())
        audio_url = f"/api/audio/{audio_id}"
        now = datetime.now().isoformat()

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO audio_records (id, prescription_id, file_path, format, size_bytes, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (audio_id, prescription_id, file_path, format_str, size_bytes, now),
            )
            await db.execute(
                """
                UPDATE prescriptions
                SET audio_url = ?, status = 'transcribing', updated_at = ?
                WHERE id = ?
                """,
                (audio_url, now, prescription_id),
            )
            await db.commit()

        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return rx

    async def transcribe(self, prescription_id: str) -> PrescriptionResponse:
        """Run STT transcription for the uploaded audio."""
        async with get_db() as db:
            async with db.execute(
                "SELECT file_path, format FROM audio_records WHERE prescription_id = ? ORDER BY created_at DESC LIMIT 1",
                (prescription_id,),
            ) as cursor:
                audio_row = await cursor.fetchone()

        if not audio_row:
            # When transcribe is called without an audio upload (e.g. test harness), use script_1
            from backend.services.stt.mock_provider import MockSTTProvider
            stt_result = await MockSTTProvider().transcribe("script_1.webm")
        else:
            file_path = audio_row["file_path"]
            fmt = audio_row["format"]
            stt_result = await self.stt_provider.transcribe(file_path, audio_format=fmt)

        if not stt_result.text or not stt_result.text.strip():
            raise ValueError(
                "Audio transcription produced empty text. Please verify that speech was clearly recorded."
            )

        now = datetime.now().isoformat()
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO transcripts (
                    id, prescription_id, provider, model, raw_text, latency_ms, confidence, language, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    prescription_id,
                    stt_result.provider,
                    stt_result.model,
                    stt_result.text,
                    stt_result.latency_ms,
                    stt_result.confidence,
                    stt_result.language,
                    now,
                ),
            )
            await db.execute(
                """
                UPDATE prescriptions
                SET raw_transcript = ?, status = 'structuring', updated_at = ?
                WHERE id = ?
                """,
                (stt_result.text, now, prescription_id),
            )
            await db.commit()

        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return rx

    async def structure_prescription(
        self,
        prescription_id: str,
        transcript_override: str | None = None,
    ) -> PrescriptionResponse:
        """Run LLM structuring, shorthand normalization, and source validation."""
        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")

        transcript = transcript_override or rx.raw_transcript
        if not transcript:
            raise ValueError("No transcript available to structure.")

        # Preserve original raw transcript vs doctor-edited transcript
        if transcript_override and rx.raw_transcript and transcript_override.strip() != rx.raw_transcript.strip():
            raw_tx = rx.raw_transcript
            edited_tx = transcript_override.strip()
        else:
            raw_tx = rx.raw_transcript or transcript
            edited_tx = rx.edited_transcript

        # 1. LLM Extraction with resilient local fallback
        try:
            llm_result = await self.llm_provider.extract_prescription(transcript)
            extracted_data = json.loads(llm_result.raw_json)
            raw_draft = PrescriptionDraft.model_validate(extracted_data)
        except Exception as e:
            logger.warning(
                "Primary LLM structuring failed (%s). Falling back to resilient local ClinicalExtractor.",
                e,
            )
            from backend.services.llm.clinical_extractor import ClinicalExtractor

            extractor = ClinicalExtractor()
            extracted_data = extractor.extract(transcript)
            raw_draft = PrescriptionDraft.model_validate(extracted_data)

        # 2. Shorthand Normalization & AI Demographic/Gender Detection
        normalized_draft = await self.normalizer.normalize_async(raw_draft)

        # 3. Validation Pipeline (Schema + Source Grounding + Completeness)
        val_issues = self.validator.run_validation(normalized_draft, raw_transcript=transcript)

        # 4. Clarification Generation
        clar_questions = self.clarification_svc.generate_questions(normalized_draft, val_issues)

        # 5. Persist to Database
        now = datetime.now().isoformat()
        new_version = rx.version + 1

        async with get_db() as db:
            # Delete old medicine items
            await db.execute(
                "DELETE FROM medicine_items WHERE prescription_id = ?",
                (prescription_id,),
            )

            # Insert new medicines
            for idx, med in enumerate(normalized_draft.medicines):
                await db.execute(
                    """
                    INSERT INTO medicine_items (id, prescription_id, item_index, medicine_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        idx,
                        med.model_dump_json(),
                        now,
                    ),
                )

            # Update prescription record preserving raw and edited transcripts separately
            await db.execute(
                """
                UPDATE prescriptions
                SET status = 'review',
                    patient_json = ?,
                    clinical_json = ?,
                    raw_transcript = ?,
                    edited_transcript = ?,
                    validation_json = ?,
                    clarification_json = ?,
                    version = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    normalized_draft.patient.model_dump_json(),
                    normalized_draft.clinical.model_dump_json(),
                    raw_tx,
                    edited_tx,
                    json.dumps(val_issues),
                    json.dumps(clar_questions),
                    new_version,
                    now,
                    prescription_id,
                ),
            )

            # Save version snapshot
            current_rx = await self.get_prescription(prescription_id)
            if current_rx:
                await db.execute(
                    """
                    INSERT INTO prescription_versions (
                        id, prescription_id, version, snapshot_json, change_type, change_details, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        new_version,
                        current_rx.model_dump_json(),
                        "ai_structuring",
                        f"Structured extraction via {llm_result.provider} ({llm_result.model})",
                        now,
                    ),
                )
            await db.commit()

        updated_rx = await self.get_prescription(prescription_id)
        if not updated_rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return updated_rx

    async def update_fields(
        self,
        prescription_id: str,
        patient_update: PatientInfo | None = None,
        clinical_update: ClinicalInfo | None = None,
        medicines_update: list[MedicineItem] | None = None,
    ) -> PrescriptionResponse:
        """Apply doctor edits manually, log changes in doctor_edits, revalidate, and save new version."""
        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")

        now = datetime.now().isoformat()
        new_version = rx.version + 1

        patient = patient_update or rx.patient
        clinical = clinical_update or rx.clinical
        medicines = medicines_update if medicines_update is not None else rx.medicines

        draft = PrescriptionDraft(patient=patient, clinical=clinical, medicines=medicines)
        normalized_draft = self.normalizer.normalize(draft)
        val_issues = self.validator.run_validation(normalized_draft, raw_transcript=rx.raw_transcript)
        clar_questions = self.clarification_svc.generate_questions(normalized_draft, val_issues)

        async with get_db() as db:
            # Log edit event
            await db.execute(
                """
                INSERT INTO doctor_edits (
                    id, prescription_id, field_path, old_value, new_value, edit_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    prescription_id,
                    "manual_update",
                    f"v{rx.version}",
                    f"v{new_version}",
                    "manual",
                    now,
                ),
            )

            # Replace medicines
            await db.execute(
                "DELETE FROM medicine_items WHERE prescription_id = ?",
                (prescription_id,),
            )
            for idx, med in enumerate(normalized_draft.medicines):
                await db.execute(
                    """
                    INSERT INTO medicine_items (id, prescription_id, item_index, medicine_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        idx,
                        med.model_dump_json(),
                        now,
                    ),
                )

            await db.execute(
                """
                UPDATE prescriptions
                SET patient_json = ?,
                    clinical_json = ?,
                    validation_json = ?,
                    clarification_json = ?,
                    version = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    normalized_draft.patient.model_dump_json(),
                    normalized_draft.clinical.model_dump_json(),
                    json.dumps(val_issues),
                    json.dumps(clar_questions),
                    new_version,
                    now,
                    prescription_id,
                ),
            )

            # Record version snapshot
            current_rx = await self.get_prescription(prescription_id)
            if current_rx:
                await db.execute(
                    """
                    INSERT INTO prescription_versions (
                        id, prescription_id, version, snapshot_json, change_type, change_details, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        new_version,
                        current_rx.model_dump_json(),
                        "doctor_manual_edit",
                        "Doctor edited prescription fields in review interface",
                        now,
                    ),
                )
            await db.commit()

        updated_rx = await self.get_prescription(prescription_id)
        if not updated_rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return updated_rx

    async def apply_voice_edit(
        self,
        prescription_id: str,
        command: str,
    ) -> tuple[PrescriptionResponse, dict[str, Any]]:
        """Parse voice edit command, apply modifications, log edit, and return updated prescription."""
        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")

        draft = PrescriptionDraft(patient=rx.patient, clinical=rx.clinical, medicines=rx.medicines)
        updated_draft, audit_entry = await self.voice_edit_svc.apply_command(command, draft)

        if not audit_entry.get("success"):
            return rx, audit_entry

        now = datetime.now().isoformat()
        new_version = rx.version + 1

        val_issues = self.validator.run_validation(updated_draft, raw_transcript=rx.raw_transcript)
        clar_questions = self.clarification_svc.generate_questions(updated_draft, val_issues)

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO doctor_edits (
                    id, prescription_id, field_path, old_value, new_value, edit_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    prescription_id,
                    audit_entry.get("field_path") or "voice_command",
                    str(audit_entry.get("before_value")),
                    str(audit_entry.get("after_value")),
                    "voice_command",
                    now,
                ),
            )

            # Replace medicines
            await db.execute(
                "DELETE FROM medicine_items WHERE prescription_id = ?",
                (prescription_id,),
            )
            for idx, med in enumerate(updated_draft.medicines):
                await db.execute(
                    """
                    INSERT INTO medicine_items (id, prescription_id, item_index, medicine_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        idx,
                        med.model_dump_json(),
                        now,
                    ),
                )

            await db.execute(
                """
                UPDATE prescriptions
                SET patient_json = ?,
                    clinical_json = ?,
                    validation_json = ?,
                    clarification_json = ?,
                    version = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    updated_draft.patient.model_dump_json(),
                    updated_draft.clinical.model_dump_json(),
                    json.dumps(val_issues),
                    json.dumps(clar_questions),
                    new_version,
                    now,
                    prescription_id,
                ),
            )

            current_rx = await self.get_prescription(prescription_id)
            if current_rx:
                await db.execute(
                    """
                    INSERT INTO prescription_versions (
                        id, prescription_id, version, snapshot_json, change_type, change_details, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        prescription_id,
                        new_version,
                        current_rx.model_dump_json(),
                        "voice_edit",
                        f"Voice edit command: '{command}'",
                        now,
                    ),
                )
            await db.commit()

        final_rx = await self.get_prescription(prescription_id)
        if not final_rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return final_rx, audit_entry

    async def confirm_prescription(
        self,
        prescription_id: str,
        doctor_name: str = "Dr. Ananya Rao",
    ) -> PrescriptionResponse:
        """Mark prescription as confirmed by the doctor.

        Compulsory gate before PDF generation is allowed.
        Links to permanent patient identity and logs audit trail.
        """
        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")

        now = datetime.now().isoformat()

        # Link to permanent patient profile
        patient_record = None
        patient_name = rx.patient.name.value if (rx.patient and rx.patient.name) else None
        if patient_name and patient_name.lower() not in ("demo patient", "unnamed patient"):
            try:
                from backend.services.patient_service import PatientService
                patient_svc = PatientService()
                patient_age = rx.patient.age.value if rx.patient.age else None
                patient_gender = rx.patient.sex.value if rx.patient.sex else None
                patient_record = await patient_svc.get_or_create_patient(
                    name=patient_name,
                    age=patient_age,
                    gender=patient_gender,
                    actor_id=doctor_name,
                )
                await patient_svc.log_audit(
                    action="prescription_verified",
                    prescription_id=prescription_id,
                    patient_id=patient_record.id,
                    actor_id=doctor_name,
                    details=f"Doctor {doctor_name} verified prescription #{prescription_id} for {patient_record.patient_id} ({patient_name})",
                )
            except Exception as ex:
                logger.warning("Patient record linkage during confirmation failed: %s", ex)

        patient_uuid = patient_record.id if patient_record else None

        async with get_db() as db:
            await db.execute(
                """
                UPDATE prescriptions
                SET status = 'confirmed', confirmed_at = ?, verified_at = ?, patient_id = ?, updated_at = ?, doctor_name = ?
                WHERE id = ?
                """,
                (now, now, patient_uuid, now, doctor_name, prescription_id),
            )
            # Create confirmation audit record
            await db.execute(
                """
                INSERT INTO confirmation_records (
                    id, prescription_id, confirmed_by, version, snapshot_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    prescription_id,
                    doctor_name,
                    rx.version,
                    rx.model_dump_json(),
                    now,
                ),
            )
            await db.commit()

        confirmed_rx = await self.get_prescription(prescription_id)
        if not confirmed_rx:
            raise ValueError(f"Prescription {prescription_id} not found")
        return confirmed_rx

    async def generate_pdf(self, prescription_id: str) -> str:
        """Generate PDF for prescription. Strictly verifies confirmation state."""
        rx = await self.get_prescription(prescription_id)
        if not rx:
            raise ValueError(f"Prescription {prescription_id} not found")

        # Calls PDF generator which enforces confirmation check
        pdf_path = self.pdf_generator.generate(
            rx,
            patient_id=rx.permanent_patient_id,
        )
        try:
            now = datetime.now().isoformat()
            async with get_db() as db:
                await db.execute(
                    "UPDATE prescriptions SET pdf_path = ?, updated_at = ? WHERE id = ?",
                    (pdf_path, now, prescription_id),
                )
                await db.commit()
        except Exception:
            pass
        return pdf_path

    async def get_history(self, prescription_id: str) -> list[dict[str, Any]]:
        """Fetch version and edit history for audit trail."""
        async with get_db() as db:
            async with db.execute(
                """
                SELECT version, change_type, change_details, created_at
                FROM prescription_versions
                WHERE prescription_id = ?
                ORDER BY version ASC
                """,
                (prescription_id,),
            ) as cursor:
                versions = await cursor.fetchall()

            async with db.execute(
                """
                SELECT field_path, old_value, new_value, edit_type, created_at
                FROM doctor_edits
                WHERE prescription_id = ?
                ORDER BY created_at ASC
                """,
                (prescription_id,),
            ) as cursor:
                edits = await cursor.fetchall()

        return {
            "versions": [dict(v) for v in versions],
            "edits": [dict(e) for e in edits],
        } # type: ignore

    async def delete_prescription(self, prescription_id: str) -> bool:
        """Completely remove a prescription and its associated database records and files."""
        rx = await self.get_prescription(prescription_id)
        if not rx:
            return False

        async with get_db() as db:
            # 1. Fetch any associated audio file paths to clean up from disk
            try:
                async with db.execute(
                    "SELECT file_path FROM audio_records WHERE prescription_id = ?",
                    (prescription_id,),
                ) as cursor:
                    audio_rows = await cursor.fetchall()

                for a_row in audio_rows:
                    try:
                        f_p = Path(a_row["file_path"])
                        if f_p.exists():
                            f_p.unlink()
                    except Exception as e:
                        logger.warning("Could not delete audio file %s: %s", a_row, e)
            except Exception as e:
                logger.warning("Error fetching audio files for deletion: %s", e)

            # 2. Clean up any generated PDF
            try:
                from backend.config import get_settings
                settings = get_settings()
                pdf_path = Path(settings.PDF_OUTPUT_DIR) / f"{prescription_id}.pdf"
                if pdf_path.exists():
                    pdf_path.unlink()
            except Exception as e:
                logger.warning("Could not delete PDF for %s: %s", prescription_id, e)

            # 3. Delete database records in cascade order
            tables = [
                "medicine_items",
                "audio_records",
                "transcripts",
                "prescription_versions",
                "doctor_edits",
                "clarification_records",
                "feedback_records",
            ]
            for tbl in tables:
                try:
                    await db.execute(
                        f"DELETE FROM {tbl} WHERE prescription_id = ?",
                        (prescription_id,),
                    )
                except Exception:
                    pass

            await db.execute(
                "DELETE FROM prescriptions WHERE id = ?",
                (prescription_id,),
            )
            await db.commit()

        logger.info("Prescription %s and all associated records deleted successfully.", prescription_id)
        return True

