"""Safe SQLite to PostgreSQL Data Migration Script.

Migrates all historical patient records, prescriptions, medicine orders, transcripts,
and audit trails from SQLite to PostgreSQL without modifying or destroying the source database.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sqlite3
import sys
from pathlib import Path
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sqlite_to_pg_migrator")


def load_postgres_schema() -> str:
    """Read the PostgreSQL initialisation migration script."""
    schema_path = Path(__file__).parent.parent / "data" / "migrations" / "init_postgres.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"PostgreSQL migration schema not found at {schema_path}")
    return schema_path.read_text(encoding="utf-8")


async def migrate_data(sqlite_path: str, pg_dsn: str) -> dict[str, int]:
    """Execute topological migration from SQLite to PostgreSQL."""
    try:
        import asyncpg
    except ImportError:
        logger.error("asyncpg is required to run the migration script. Please install: pip install asyncpg")
        sys.exit(1)

    src_file = Path(sqlite_path)
    if not src_file.exists():
        raise FileNotFoundError(f"Source SQLite database not found: {sqlite_path}")

    logger.info("Opening source SQLite database: %s", sqlite_path)
    src_conn = sqlite3.connect(sqlite_path)
    src_conn.row_factory = sqlite3.Row

    logger.info("Connecting to target PostgreSQL database...")
    try:
        pg_conn = await asyncpg.connect(dsn=pg_dsn, timeout=10)
    except Exception as e:
        logger.error("Failed to connect to PostgreSQL at %s: %s", pg_dsn, e)
        raise

    # 1. Apply PostgreSQL schema
    logger.info("Ensuring PostgreSQL tables and indexes exist...")
    schema_sql = load_postgres_schema()
    await pg_conn.execute(schema_sql)

    counts: dict[str, int] = {}

    try:
        async with pg_conn.transaction():
            # 2. Patients
            p_rows = src_conn.execute("SELECT * FROM patients").fetchall()
            for r in p_rows:
                await pg_conn.execute(
                    """
                    INSERT INTO patients (id, patient_id, name, age, gender, mobile_number, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], r["patient_id"], r["name"], r["age"], r["gender"],
                    r["mobile_number"], r["created_at"], r["updated_at"]
                )
            counts["patients"] = len(p_rows)
            logger.info("Migrated %d patients", len(p_rows))

            # 3. Prescriptions
            rx_rows = src_conn.execute("SELECT * FROM prescriptions").fetchall()
            for r in rx_rows:
                patient_json = r["patient_json"] or "{}"
                clinical_json = r["clinical_json"] or "{}"
                validation_json = r["validation_json"] or "[]"
                clarification_json = r["clarification_json"] or "[]"

                # Parse JSON if string to ensure valid JSONB
                pj = json.loads(patient_json) if isinstance(patient_json, str) else patient_json
                cj = json.loads(clinical_json) if isinstance(clinical_json, str) else clinical_json
                vj = json.loads(validation_json) if isinstance(validation_json, str) else validation_json
                clj = json.loads(clarification_json) if isinstance(clarification_json, str) else clarification_json

                # Optional columns
                r_keys = r.keys()
                p_id = r["patient_id"] if "patient_id" in r_keys else None
                ed_tx = r["edited_transcript"] if "edited_transcript" in r_keys else None
                pdf_p = r["pdf_path"] if "pdf_path" in r_keys else None
                ver_at = r["verified_at"] if "verified_at" in r_keys else None

                await pg_conn.execute(
                    """
                    INSERT INTO prescriptions (
                        id, patient_id, status, patient_json, clinical_json,
                        raw_transcript, edited_transcript, audio_url, pdf_path,
                        validation_json, clarification_json, version,
                        created_at, updated_at, confirmed_at, verified_at
                    )
                    VALUES (
                        $1, $2, $3, $4::jsonb, $5::jsonb,
                        $6, $7, $8, $9,
                        $10::jsonb, $11::jsonb, $12,
                        $13::timestamptz, $14::timestamptz, $15::timestamptz, $16::timestamptz
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], p_id, r["status"], json.dumps(pj), json.dumps(cj),
                    r["raw_transcript"], ed_tx, r["audio_url"], pdf_p,
                    json.dumps(vj), json.dumps(clj), r["version"],
                    r["created_at"], r["updated_at"], r["confirmed_at"], ver_at
                )
            counts["prescriptions"] = len(rx_rows)
            logger.info("Migrated %d prescriptions", len(rx_rows))

            # 4. Medicine Items
            med_rows = src_conn.execute("SELECT * FROM medicine_items").fetchall()
            for r in med_rows:
                mj = json.loads(r["medicine_json"]) if isinstance(r["medicine_json"], str) else r["medicine_json"]
                await pg_conn.execute(
                    """
                    INSERT INTO medicine_items (id, prescription_id, item_index, medicine_json, created_at)
                    VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], r["prescription_id"], r["item_index"], json.dumps(mj), r["created_at"]
                )
            counts["medicine_items"] = len(med_rows)
            logger.info("Migrated %d medicine_items", len(med_rows))

            # 5. Audio Records
            audio_rows = src_conn.execute("SELECT * FROM audio_records").fetchall()
            for r in audio_rows:
                await pg_conn.execute(
                    """
                    INSERT INTO audio_records (id, prescription_id, file_path, duration_ms, format, size_bytes, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], r["prescription_id"], r["file_path"], r["duration_ms"], r["format"], r["size_bytes"], r["created_at"]
                )
            counts["audio_records"] = len(audio_rows)
            logger.info("Migrated %d audio_records", len(audio_rows))

            # 6. Transcripts
            tx_rows = src_conn.execute("SELECT * FROM transcripts").fetchall()
            for r in tx_rows:
                w_ts = json.loads(r["word_timestamps"]) if r["word_timestamps"] else None
                await pg_conn.execute(
                    """
                    INSERT INTO transcripts (id, prescription_id, provider, model, raw_text, latency_ms, confidence, language, word_timestamps, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], r["prescription_id"], r["provider"], r["model"], r["raw_text"],
                    r["latency_ms"], r["confidence"], r["language"], json.dumps(w_ts) if w_ts else None, r["created_at"]
                )
            counts["transcripts"] = len(tx_rows)
            logger.info("Migrated %d transcripts", len(tx_rows))

            # 7. Audit Logs
            audit_rows = src_conn.execute("SELECT * FROM patient_audit_logs").fetchall()
            for r in audit_rows:
                await pg_conn.execute(
                    """
                    INSERT INTO patient_audit_logs (id, prescription_id, patient_id, actor_id, actor_role, action, details, ip_address, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    r["id"], r["prescription_id"], r["patient_id"], r["actor_id"], r["actor_role"],
                    r["action"], r["details"], r["ip_address"], r["created_at"]
                )
            counts["patient_audit_logs"] = len(audit_rows)
            logger.info("Migrated %d patient_audit_logs", len(audit_rows))

        logger.info("Migration completed successfully with transaction committed!")
    finally:
        src_conn.close()
        await pg_conn.close()

    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate Voice Prescription Writer database from SQLite to PostgreSQL.")
    parser.add_argument("--sqlite-path", default="./voice_prescriptions.db", help="Path to source SQLite file")
    parser.add_argument("--pg-dsn", default="postgresql://postgres:postgres@localhost:5432/voice_prescriptions", help="PostgreSQL DSN")
    args = parser.parse_args()

    asyncio.run(migrate_data(args.sqlite_path, args.pg_dsn))

