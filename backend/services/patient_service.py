"""Patient service managing permanent patient identity, record history, and audit logging."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from backend.database import get_db
from backend.models.patient import PatientAuditLogEntry, PatientCreateRequest, PatientRecord

logger = logging.getLogger(__name__)


class PatientService:
    """Manages patient identities, deduplication, search, and clinical audit history."""

    async def generate_patient_id(self) -> str:
        """Generate a sequential, permanent human-readable patient identifier e.g. PID-2026-0001."""
        year = datetime.now().year
        async with get_db() as db:
            cur = await db.execute(
                "SELECT COUNT(*) as count FROM patients WHERE patient_id LIKE ?",
                (f"PID-{year}-%",),
            )
            row = await cur.fetchone()
            count = row["count"] if row else 0
            seq = count + 1
            return f"PID-{year}-{seq:04d}"

    async def register_patient(
        self,
        name: str,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        mobile_number: Optional[str] = None,
        actor_id: str = "dr_ananya_rao",
    ) -> PatientRecord:
        """Register a new permanent patient record."""
        patient_uuid = str(uuid.uuid4())
        patient_id = await self.generate_patient_id()
        now = datetime.now().isoformat()

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO patients (id, patient_id, name, age, gender, mobile_number, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (patient_uuid, patient_id, name.strip(), age, gender, mobile_number, now, now),
            )
            await db.commit()

        # Log audit entry
        await self.log_audit(
            action="patient_registered",
            patient_id=patient_uuid,
            actor_id=actor_id,
            details=f"Registered patient {name.strip()} with ID {patient_id}",
        )

        return PatientRecord(
            id=patient_uuid,
            patient_id=patient_id,
            name=name.strip(),
            age=age,
            gender=gender,
            mobile_number=mobile_number,
            created_at=now,
            updated_at=now,
        )

    async def get_or_create_patient(
        self,
        name: str,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        mobile_number: Optional[str] = None,
        actor_id: str = "dr_ananya_rao",
    ) -> PatientRecord:
        """Find an existing patient by mobile number or name, or create a new permanent record.

        Avoids creating duplicate patient profiles when a known patient returns.
        """
        clean_name = name.strip()
        async with get_db() as db:
            # 1. Search by mobile number if provided (highest precision)
            if mobile_number:
                cur = await db.execute(
                    "SELECT * FROM patients WHERE mobile_number = ? ORDER BY created_at ASC LIMIT 1",
                    (mobile_number.strip(),),
                )
                row = await cur.fetchone()
                if row:
                    return PatientRecord(
                        id=row["id"],
                        patient_id=row["patient_id"],
                        name=row["name"],
                        age=row["age"],
                        gender=row["gender"],
                        mobile_number=row["mobile_number"],
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                    )

            # 2. Search by exact normalized name and age if provided
            if age is not None:
                cur = await db.execute(
                    "SELECT * FROM patients WHERE LOWER(name) = LOWER(?) AND age = ? ORDER BY created_at ASC LIMIT 1",
                    (clean_name, age),
                )
            else:
                cur = await db.execute(
                    "SELECT * FROM patients WHERE LOWER(name) = LOWER(?) ORDER BY created_at ASC LIMIT 1",
                    (clean_name,),
                )
            row = await cur.fetchone()
            if row:
                return PatientRecord(
                    id=row["id"],
                    patient_id=row["patient_id"],
                    name=row["name"],
                    age=row["age"],
                    gender=row["gender"],
                    mobile_number=row["mobile_number"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )

        # 3. Not found: Register new patient
        return await self.register_patient(
            name=clean_name,
            age=age,
            gender=gender,
            mobile_number=mobile_number,
            actor_id=actor_id,
        )

    async def search_patients(
        self,
        query: Optional[str] = None,
        patient_id: Optional[str] = None,
        mobile_number: Optional[str] = None,
        limit: int = 20,
    ) -> list[PatientRecord]:
        """Search patients by name, unique patient ID, or mobile number."""
        sql = "SELECT * FROM patients WHERE 1=1"
        params: list[Any] = []

        if patient_id:
            sql += " AND (patient_id = ? OR patient_id LIKE ?)"
            params.extend([patient_id.strip(), f"%{patient_id.strip()}%"])

        if mobile_number:
            sql += " AND (mobile_number = ? OR mobile_number LIKE ?)"
            params.extend([mobile_number.strip(), f"%{mobile_number.strip()}%"])

        if query:
            q = query.strip()
            sql += " AND (LOWER(name) LIKE LOWER(?) OR patient_id LIKE ? OR mobile_number LIKE ?)"
            params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])

        sql += " ORDER BY updated_at DESC LIMIT ?"
        params.append(limit)

        async with get_db() as db:
            cur = await db.execute(sql, tuple(params))
            rows = await cur.fetchall()

        return [
            PatientRecord(
                id=r["id"],
                patient_id=r["patient_id"],
                name=r["name"],
                age=r["age"],
                gender=r["gender"],
                mobile_number=r["mobile_number"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    async def get_patient_by_id(self, patient_identifier: str) -> Optional[PatientRecord]:
        """Fetch patient profile by internal UUID or unique human-readable patient_id."""
        async with get_db() as db:
            cur = await db.execute(
                "SELECT * FROM patients WHERE id = ? OR patient_id = ? LIMIT 1",
                (patient_identifier, patient_identifier),
            )
            row = await cur.fetchone()
            if not row:
                return None

            return PatientRecord(
                id=row["id"],
                patient_id=row["patient_id"],
                name=row["name"],
                age=row["age"],
                gender=row["gender"],
                mobile_number=row["mobile_number"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )

    async def get_patient_prescriptions(
        self,
        patient_identifier: str,
        actor_id: str = "dr_ananya_rao",
    ) -> list[dict[str, Any]]:
        """Retrieve verified prescription history for an authorized patient."""
        patient = await self.get_patient_by_id(patient_identifier)
        if not patient:
            return []

        # Audit access to patient history
        await self.log_audit(
            action="view_patient_history",
            patient_id=patient.id,
            actor_id=actor_id,
            details=f"Viewed prescription history for {patient.patient_id} ({patient.name})",
        )

        async with get_db() as db:
            cur = await db.execute(
                """
                SELECT id, patient_id, status, patient_json, clinical_json,
                       raw_transcript, edited_transcript, pdf_path, version,
                       created_at, updated_at, confirmed_at, verified_at
                FROM prescriptions
                WHERE patient_id = ? OR (patient_json LIKE ? AND patient_json NOT LIKE '%Demo Patient%')
                ORDER BY created_at DESC
                """,
                (patient.id, f'%"{patient.name}"%'),
            )
            rows = await cur.fetchall()

        results: list[dict[str, Any]] = []
        for r in rows:
            p_json = json.loads(r["patient_json"]) if r["patient_json"] else {}
            c_json = json.loads(r["clinical_json"]) if r["clinical_json"] else {}
            results.append({
                "id": r["id"],
                "patient_id": patient.patient_id,
                "status": r["status"],
                "patient": p_json,
                "clinical": c_json,
                "raw_transcript": r["raw_transcript"],
                "edited_transcript": r["edited_transcript"],
                "pdf_path": r["pdf_path"],
                "version": r["version"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "verified_at": r["verified_at"] or r["confirmed_at"],
            })

        return results

    async def link_prescription_to_patient(
        self,
        prescription_id: str,
        patient_id: str,
        actor_id: str = "dr_ananya_rao",
    ) -> None:
        """Associate a prescription with a permanent patient profile."""
        now = datetime.now().isoformat()
        async with get_db() as db:
            await db.execute(
                """
                UPDATE prescriptions
                SET patient_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (patient_id, now, prescription_id),
            )
            await db.commit()

        await self.log_audit(
            action="prescription_linked_to_patient",
            prescription_id=prescription_id,
            patient_id=patient_id,
            actor_id=actor_id,
            details=f"Linked prescription {prescription_id} to patient {patient_id}",
        )

    async def log_audit(
        self,
        action: str,
        prescription_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        actor_id: str = "dr_ananya_rao",
        actor_role: str = "doctor",
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Record a secure audit log entry for prescription/patient actions."""
        audit_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        try:
            async with get_db() as db:
                await db.execute(
                    """
                    INSERT INTO patient_audit_logs (id, prescription_id, patient_id, actor_id, actor_role, action, details, ip_address, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (audit_id, prescription_id, patient_id, actor_id, actor_role, action, details, ip_address, now),
                )
                await db.commit()
        except Exception as e:
            logger.error("Failed to write audit log entry: %s", e)

    async def get_audit_trail(
        self,
        prescription_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[PatientAuditLogEntry]:
        """Fetch audit history for compliance and verification review."""
        sql = "SELECT * FROM patient_audit_logs WHERE 1=1"
        params: list[Any] = []

        if prescription_id:
            sql += " AND prescription_id = ?"
            params.append(prescription_id)

        if patient_id:
            sql += " AND patient_id = ?"
            params.append(patient_id)

        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        async with get_db() as db:
            cur = await db.execute(sql, tuple(params))
            rows = await cur.fetchall()

        return [
            PatientAuditLogEntry(
                id=r["id"],
                prescription_id=r["prescription_id"],
                patient_id=r["patient_id"],
                actor_id=r["actor_id"],
                actor_role=r["actor_role"],
                action=r["action"],
                details=r["details"],
                ip_address=r["ip_address"],
                created_at=r["created_at"],
            )
            for r in rows
        ]
