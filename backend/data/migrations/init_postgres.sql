-- Voice Prescription Writer – PostgreSQL Database Schema Initialisation
-- Enforces relational integrity, JSONB structured storage, and audit logs.

CREATE TABLE IF NOT EXISTS patients (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    age             INTEGER,
    gender          VARCHAR(50),
    mobile_number   VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_patients_pid ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile_number);

CREATE TABLE IF NOT EXISTS prescriptions (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id       VARCHAR(64),
    doctor_name     VARCHAR(150),
    status          VARCHAR(50) NOT NULL DEFAULT 'recording'
        CHECK (status IN ('recording','transcribing','structuring','review','confirmed')),
    patient_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
    clinical_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_transcript  TEXT,
    edited_transcript TEXT,
    audio_url       TEXT,
    pdf_path        TEXT,
    validation_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    clarification_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at    TIMESTAMPTZ,
    verified_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_name);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status_date ON prescriptions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS medicine_items (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    item_index      INTEGER NOT NULL DEFAULT 0,
    medicine_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medicine_items_rx ON medicine_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medicine_items_rx_idx ON medicine_items(prescription_id, item_index);

CREATE TABLE IF NOT EXISTS audio_records (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL,
    duration_ms     INTEGER,
    format          VARCHAR(20) NOT NULL DEFAULT 'webm',
    size_bytes      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audio_records_rx ON audio_records(prescription_id);

CREATE TABLE IF NOT EXISTS transcripts (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,
    model           VARCHAR(50),
    raw_text        TEXT NOT NULL,
    latency_ms      REAL,
    confidence      REAL,
    language        VARCHAR(50),
    word_timestamps JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transcripts_rx ON transcripts(prescription_id);

CREATE TABLE IF NOT EXISTS prescription_versions (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    snapshot_json   JSONB NOT NULL,
    change_type     VARCHAR(50) NOT NULL DEFAULT 'initial',
    change_details  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_versions_rx ON prescription_versions(prescription_id);

CREATE TABLE IF NOT EXISTS doctor_edits (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    field_path      TEXT NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    edit_type       VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_doctor_edits_rx ON doctor_edits(prescription_id);

CREATE TABLE IF NOT EXISTS clarification_events (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    question        TEXT NOT NULL,
    field_path      TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','answered','dismissed')),
    answer          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clarification_rx ON clarification_events(prescription_id);

CREATE TABLE IF NOT EXISTS feedback_records (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    category        VARCHAR(100),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_rx ON feedback_records(prescription_id);

CREATE TABLE IF NOT EXISTS confirmation_records (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    confirmed_by    VARCHAR(100) NOT NULL DEFAULT 'doctor',
    version         INTEGER NOT NULL,
    snapshot_json   JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_confirmation_rx ON confirmation_records(prescription_id);

CREATE TABLE IF NOT EXISTS patient_audit_logs (
    id              VARCHAR(64) PRIMARY KEY,
    prescription_id VARCHAR(64) REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id      VARCHAR(64) REFERENCES patients(id) ON DELETE CASCADE,
    actor_id        VARCHAR(100) NOT NULL DEFAULT 'dr_ananya_rao',
    actor_role      VARCHAR(50) NOT NULL DEFAULT 'doctor',
    action          VARCHAR(100) NOT NULL,
    details         TEXT,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_prescription ON patient_audit_logs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_audit_patient ON patient_audit_logs(patient_id);

