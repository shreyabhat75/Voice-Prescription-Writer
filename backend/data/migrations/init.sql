-- Voice Prescription Writer – database initialisation
-- All tables use TEXT primary keys (UUIDs generated in application code).

CREATE TABLE IF NOT EXISTS prescriptions (
    id              TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'recording'
        CHECK (status IN ('recording','transcribing','structuring','review','confirmed')),
    patient_json    TEXT NOT NULL DEFAULT '{}',
    clinical_json   TEXT NOT NULL DEFAULT '{}',
    raw_transcript  TEXT,
    audio_url       TEXT,
    validation_json TEXT NOT NULL DEFAULT '[]',
    clarification_json TEXT NOT NULL DEFAULT '[]',
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    confirmed_at    TEXT
);

CREATE TABLE IF NOT EXISTS medicine_items (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    item_index      INTEGER NOT NULL DEFAULT 0,
    medicine_json   TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_medicine_items_rx ON medicine_items(prescription_id);

CREATE TABLE IF NOT EXISTS audio_records (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    duration_ms     INTEGER,
    format          TEXT NOT NULL DEFAULT 'webm',
    size_bytes      INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_audio_records_rx ON audio_records(prescription_id);

CREATE TABLE IF NOT EXISTS transcripts (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    provider        TEXT NOT NULL,
    model           TEXT,
    raw_text        TEXT NOT NULL,
    latency_ms      REAL,
    confidence      REAL,
    language        TEXT,
    word_timestamps TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transcripts_rx ON transcripts(prescription_id);

CREATE TABLE IF NOT EXISTS prescription_versions (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    version         INTEGER NOT NULL,
    snapshot_json   TEXT NOT NULL,
    change_type     TEXT NOT NULL DEFAULT 'initial',
    change_details  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_versions_rx ON prescription_versions(prescription_id);

CREATE TABLE IF NOT EXISTS doctor_edits (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    field_path      TEXT NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    edit_type       TEXT NOT NULL DEFAULT 'manual',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_doctor_edits_rx ON doctor_edits(prescription_id);

CREATE TABLE IF NOT EXISTS clarification_events (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    question        TEXT NOT NULL,
    field_path      TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','answered','dismissed')),
    answer          TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_clarification_rx ON clarification_events(prescription_id);

CREATE TABLE IF NOT EXISTS feedback_records (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    category        TEXT,
    comment         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feedback_rx ON feedback_records(prescription_id);

CREATE TABLE IF NOT EXISTS confirmation_records (
    id              TEXT PRIMARY KEY,
    prescription_id TEXT NOT NULL,
    confirmed_by    TEXT NOT NULL DEFAULT 'doctor',
    version         INTEGER NOT NULL,
    snapshot_json   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_confirmation_rx ON confirmation_records(prescription_id);
