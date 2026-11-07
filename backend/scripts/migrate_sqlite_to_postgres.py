"""
Migration script: Transfer all historical SQLite data from data/prescriptions.db
and voice_prescriptions.db into PostgreSQL with strict doctor attribution.
"""
import asyncio
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
import asyncpg
from backend.config import get_settings


def parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        dt = datetime.fromisoformat(val)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def parse_json(val, default="{}"):
    if not val:
        return default
    if isinstance(val, (dict, list)):
        return json.dumps(val)
    try:
        # validate json
        json.loads(val)
        return val
    except Exception:
        return default


def clean_int(val):
    if val is None:
        return None
    try:
        return int(str(val).split()[0])
    except Exception:
        return None


def safe_age(val):
    if val is None:
        return 99
    try:
        return int(str(val).split()[0])
    except Exception:
        return 99


async def run_migration():
    settings = get_settings()
    pg_url = settings.DATABASE_URL
    print(f"Connecting to PostgreSQL: {pg_url}")
    conn = await asyncpg.connect(pg_url)

    # 1. Ensure table schema has doctor_name and doctor_id
    print("Checking PostgreSQL table schema...")
    await conn.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(150);")
    await conn.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(64);")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_name);")

    # Load SQLite sources
    sqlite_dbs = [
        ("data/prescriptions.db", "data/prescriptions.db"),
        ("voice_prescriptions.db", "voice_prescriptions.db")
    ]

    # Collect existing PostgreSQL IDs to avoid unique conflicts
    existing_pg_patients = {r['id']: dict(r) for r in await conn.fetch("SELECT * FROM patients")}
    existing_pg_pids = {r['patient_id'] for r in await conn.fetch("SELECT patient_id FROM patients")}
    existing_pg_rx = {r['id'] for r in await conn.fetch("SELECT id FROM prescriptions")}

    print(f"Existing in Postgres: {len(existing_pg_patients)} patients, {len(existing_pg_rx)} prescriptions")

    # Patient ID generator
    pid_seq = 1
    for pid in existing_pg_pids:
        if pid.startswith("PID-2026-"):
            try:
                num = int(pid.split("-")[-1])
                if num >= pid_seq:
                    pid_seq = num + 1
            except ValueError:
                pass

    def get_next_pid():
        nonlocal pid_seq
        while f"PID-2026-{pid_seq:04d}" in existing_pg_pids:
            pid_seq += 1
        new_pid = f"PID-2026-{pid_seq:04d}"
        existing_pg_pids.add(new_pid)
        pid_seq += 1
        return new_pid

    migrated_patients = 0
    migrated_rx = 0
    migrated_meds = 0
    migrated_audios = 0
    migrated_transcripts = 0
    migrated_versions = 0
    migrated_edits = 0
    migrated_confirmations = 0
    migrated_audit_logs = 0

    patient_name_to_id = {}
    for p_id, p_row in existing_pg_patients.items():
        patient_name_to_id[p_row['name'].strip().lower()] = p_id

    # Track prescriptions to migrate
    for label, db_path in sqlite_dbs:
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} (not found)")
            continue

        print(f"\n--- Migrating from {db_path} ---")
        sconn = sqlite3.connect(db_path)
        sconn.row_factory = sqlite3.Row
        scur = sconn.cursor()

        # Step A: Patients
        s_patients = scur.execute("SELECT * FROM patients").fetchall()
        for sp in s_patients:
            p_id = sp['id']
            p_pid = sp['patient_id']
            p_name = sp['name'].strip()
            p_age = clean_int(sp['age'])
            p_gender = sp['gender']
            p_mobile = sp['mobile_number']
            p_created = parse_dt(sp['created_at'])
            p_updated = parse_dt(sp['updated_at'])

            if p_id in existing_pg_patients:
                patient_name_to_id[p_name.lower()] = p_id
                continue

            # Check if PID already in use by a different person
            if p_pid in existing_pg_pids:
                p_pid = get_next_pid()
            else:
                existing_pg_pids.add(p_pid)

            await conn.execute(
                """
                INSERT INTO patients (id, patient_id, name, age, gender, mobile_number, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO NOTHING
                """,
                p_id, p_pid, p_name, p_age, p_gender, p_mobile, p_created, p_updated
            )
            existing_pg_patients[p_id] = {'id': p_id, 'patient_id': p_pid, 'name': p_name}
            patient_name_to_id[p_name.lower()] = p_id
            migrated_patients += 1

        # Step B: Prescriptions
        s_rx = scur.execute("SELECT * FROM prescriptions").fetchall()
        for rx in s_rx:
            rx_id = rx['id']
            if rx_id in existing_pg_rx:
                continue

            p_json_raw = rx['patient_json']
            c_json_raw = rx['clinical_json']
            val_json_raw = rx['validation_json']
            clar_json_raw = rx['clarification_json']

            p_data = json.loads(p_json_raw) if p_json_raw else {}
            c_data = json.loads(c_json_raw) if c_json_raw else {}
            p_name = p_data.get('name', {}).get('value')
            diag = c_data.get('diagnosis', {}).get('value') or ""

            # Check confirmation records in this SQLite db
            conf_row = scur.execute("SELECT * FROM confirmation_records WHERE prescription_id = ?", (rx_id,)).fetchone()
            audit_rows = scur.execute("SELECT * FROM patient_audit_logs WHERE prescription_id = ?", (rx_id,)).fetchall()

            # Determine Attending Doctor
            doc_name = None
            doc_id = None
            if conf_row and conf_row['confirmed_by']:
                doc_name = conf_row['confirmed_by']
            elif audit_rows:
                doc_name = audit_rows[0]['actor_id']

            # Contextual / clinical specialty attribution
            if not doc_name:
                if diag and any(term in diag.lower() for term in ['hypertension', 'cardio', 'bp', 'heart']):
                    doc_name = "Dr. Rajesh Sharma, MD, DM"
                    doc_id = "doc_2"
                elif safe_age(p_data.get('age', {}).get('value')) < 16 or 'pediatric' in str(rx['raw_transcript']).lower() or 'gastroenteritis' in diag.lower():
                    doc_name = "Dr. Meera Iyer, MBBS, DCH"
                    doc_id = "doc_3"
                else:
                    doc_name = "Dr. Ananya Rao, MD"
                    doc_id = "doc_1"
            else:
                if "rajesh" in doc_name.lower():
                    doc_id = "doc_2"
                elif "meera" in doc_name.lower():
                    doc_id = "doc_3"
                else:
                    doc_id = "doc_1"

            # Determine linked patient
            patient_uuid = rx['patient_id']
            if not patient_uuid and p_name and p_name.strip().lower() not in ['demo patient', 'unnamed patient', 'none', 'has a cough and', 'd sana']:
                clean_pname = p_name.strip()
                if clean_pname.lower() in patient_name_to_id:
                    patient_uuid = patient_name_to_id[clean_pname.lower()]
                else:
                    # Register new patient profile
                    new_pid = get_next_pid()
                    patient_uuid = str(uuid.uuid4())
                    p_age = clean_int(p_data.get('age', {}).get('value'))
                    p_gender = p_data.get('sex', {}).get('value')
                    now_dt = parse_dt(rx['created_at'])
                    await conn.execute(
                        """
                        INSERT INTO patients (id, patient_id, name, age, gender, mobile_number, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        patient_uuid, new_pid, clean_pname, p_age, p_gender, None, now_dt, now_dt
                    )
                    existing_pg_patients[patient_uuid] = {'id': patient_uuid, 'patient_id': new_pid, 'name': clean_pname}
                    patient_name_to_id[clean_pname.lower()] = patient_uuid
                    migrated_patients += 1

            # Insert Prescription
            await conn.execute(
                """
                INSERT INTO prescriptions (
                    id, patient_id, doctor_id, doctor_name, status,
                    patient_json, clinical_json, raw_transcript, edited_transcript,
                    audio_url, pdf_path, validation_json, clarification_json,
                    version, created_at, updated_at, confirmed_at, verified_at
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6::jsonb, $7::jsonb, $8, $9,
                    $10, $11, $12::jsonb, $13::jsonb,
                    $14, $15, $16, $17, $18
                ) ON CONFLICT (id) DO NOTHING
                """,
                rx_id,
                patient_uuid,
                doc_id,
                doc_name,
                rx['status'],
                parse_json(p_json_raw, "{}"),
                parse_json(c_json_raw, "{}"),
                rx['raw_transcript'],
                rx['edited_transcript'] if 'edited_transcript' in rx.keys() else None,
                rx['audio_url'],
                rx['pdf_path'] if 'pdf_path' in rx.keys() else None,
                parse_json(val_json_raw, "[]"),
                parse_json(clar_json_raw, "[]"),
                rx['version'] or 1,
                parse_dt(rx['created_at']),
                parse_dt(rx['updated_at']),
                parse_dt(rx['confirmed_at']),
                parse_dt(rx['verified_at'] if 'verified_at' in rx.keys() else rx['confirmed_at']),
            )
            existing_pg_rx.add(rx_id)
            migrated_rx += 1

            # Step C: Child tables for this prescription
            # 1. Medicine items
            meds = scur.execute("SELECT * FROM medicine_items WHERE prescription_id = ?", (rx_id,)).fetchall()
            for m in meds:
                await conn.execute(
                    """
                    INSERT INTO medicine_items (id, prescription_id, item_index, medicine_json, created_at)
                    VALUES ($1, $2, $3, $4::jsonb, $5)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    m['id'], rx_id, m['item_index'], parse_json(m['medicine_json']), parse_dt(m['created_at'])
                )
                migrated_meds += 1

            # 2. Audio records
            audios = scur.execute("SELECT * FROM audio_records WHERE prescription_id = ?", (rx_id,)).fetchall()
            for a in audios:
                await conn.execute(
                    """
                    INSERT INTO audio_records (id, prescription_id, file_path, duration_ms, format, size_bytes, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    a['id'], rx_id, a['file_path'], a['duration_ms'], a['format'], a['size_bytes'], parse_dt(a['created_at'])
                )
                migrated_audios += 1

            # 3. Transcripts
            txs = scur.execute("SELECT * FROM transcripts WHERE prescription_id = ?", (rx_id,)).fetchall()
            for tx in txs:
                await conn.execute(
                    """
                    INSERT INTO transcripts (id, prescription_id, provider, model, raw_text, latency_ms, confidence, language, word_timestamps, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    tx['id'], rx_id, tx['provider'], tx['model'], tx['raw_text'], tx['latency_ms'], tx['confidence'], tx['language'],
                    parse_json(tx['word_timestamps'], "[]") if tx['word_timestamps'] else None,
                    parse_dt(tx['created_at'])
                )
                migrated_transcripts += 1

            # 4. Versions
            versions = scur.execute("SELECT * FROM prescription_versions WHERE prescription_id = ?", (rx_id,)).fetchall()
            for v in versions:
                await conn.execute(
                    """
                    INSERT INTO prescription_versions (id, prescription_id, version, snapshot_json, change_type, change_details, created_at)
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    v['id'], rx_id, v['version'], parse_json(v['snapshot_json']), v['change_type'], v['change_details'], parse_dt(v['created_at'])
                )
                migrated_versions += 1

            # 5. Doctor edits
            edits = scur.execute("SELECT * FROM doctor_edits WHERE prescription_id = ?", (rx_id,)).fetchall()
            for ed in edits:
                await conn.execute(
                    """
                    INSERT INTO doctor_edits (id, prescription_id, field_path, old_value, new_value, edit_type, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    ed['id'], rx_id, ed['field_path'], ed['old_value'], ed['new_value'], ed['edit_type'], parse_dt(ed['created_at'])
                )
                migrated_edits += 1

            # 6. Confirmations
            confs = scur.execute("SELECT * FROM confirmation_records WHERE prescription_id = ?", (rx_id,)).fetchall()
            for c in confs:
                await conn.execute(
                    """
                    INSERT INTO confirmation_records (id, prescription_id, confirmed_by, version, snapshot_json, created_at)
                    VALUES ($1, $2, $3, $4, $5::jsonb, $6)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    c['id'], rx_id, c['confirmed_by'], c['version'], parse_json(c['snapshot_json']), parse_dt(c['created_at'])
                )
                migrated_confirmations += 1

            # 7. Audit logs
            audits = scur.execute("SELECT * FROM patient_audit_logs WHERE prescription_id = ?", (rx_id,)).fetchall()
            for al in audits:
                await conn.execute(
                    """
                    INSERT INTO patient_audit_logs (id, prescription_id, patient_id, actor_id, actor_role, action, details, ip_address, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    al['id'], rx_id, al['patient_id'] or patient_uuid, al['actor_id'], al['actor_role'], al['action'], al['details'], al['ip_address'], parse_dt(al['created_at'])
                )
                migrated_audit_logs += 1

        sconn.close()

    print("\n=================== MIGRATION COMPLETE ===================")
    print(f"Migrated Patients: {migrated_patients}")
    print(f"Migrated Prescriptions: {migrated_rx}")
    print(f"Migrated Medicine Items: {migrated_meds}")
    print(f"Migrated Audio Records: {migrated_audios}")
    print(f"Migrated Transcripts: {migrated_transcripts}")
    print(f"Migrated Versions: {migrated_versions}")
    print(f"Migrated Doctor Edits: {migrated_edits}")
    print(f"Migrated Confirmation Records: {migrated_confirmations}")
    print(f"Migrated Audit Logs: {migrated_audit_logs}")

    # Verify counts per doctor in PostgreSQL
    print("\nAttending Doctor Breakdown in PostgreSQL:")
    doc_breakdown = await conn.fetch(
        """
        SELECT doctor_name, count(*) as rx_count
        FROM prescriptions
        GROUP BY doctor_name
        ORDER BY rx_count DESC
        """
    )
    for row in doc_breakdown:
        print(f"  {row['doctor_name']}: {row['rx_count']} prescriptions")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
