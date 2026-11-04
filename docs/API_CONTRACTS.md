# REST API Contracts — Voice Prescription Writer

> **Version:** 1.0  
> **Base URL:** `http://localhost:8000/api`  
> **Content-Type:** `application/json` (unless stated otherwise)  
> **Last Updated:** 2026-11-03

---

## Table of Contents

1. [Common Types](#1-common-types)
2. [POST /api/prescriptions/new](#2-create-new-prescription)
3. [POST /api/prescriptions/{id}/upload-audio](#3-upload-audio-recording)
4. [POST /api/prescriptions/{id}/transcribe](#4-trigger-stt-transcription)
5. [POST /api/prescriptions/{id}/structure](#5-trigger-llm-structuring)
6. [GET /api/prescriptions/{id}](#6-get-prescription-details)
7. [PUT /api/prescriptions/{id}/medicines/{idx}](#7-edit-a-medicine)
8. [PUT /api/prescriptions/{id}/patient](#8-edit-patient-info)
9. [PUT /api/prescriptions/{id}/clinical](#9-edit-clinical-fields)
10. [POST /api/prescriptions/{id}/voice-edit](#10-apply-voice-edit-command)
11. [POST /api/prescriptions/{id}/clarify](#11-submit-clarification-response)
12. [POST /api/prescriptions/{id}/confirm](#12-doctor-confirmation)
13. [GET /api/prescriptions/{id}/pdf](#13-generate-and-download-pdf)
14. [GET /api/prescriptions](#14-list-all-prescriptions)
15. [GET /api/prescriptions/{id}/history](#15-version-history)
16. [POST /api/prescriptions/{id}/feedback](#16-submit-doctor-feedback)

---

## 1. Common Types

### 1.1 Standard Error Response

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional detailed information"
  }
}
```

### 1.2 Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `TRANSCRIPTION_FAILED` | 502 | STT provider returned an error |
| `STRUCTURING_FAILED` | 502 | LLM provider returned an error |
| `NOT_CONFIRMED` | 409 | Operation requires confirmed prescription |
| `ALREADY_CONFIRMED` | 409 | Prescription already confirmed, cannot edit |
| `NO_AUDIO` | 409 | Transcription requires uploaded audio |
| `NO_TRANSCRIPT` | 409 | Structuring requires a transcript |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `INVALID_FORMAT` | 415 | Unsupported audio format |

### 1.3 Prescription Status Enum

```
"draft" | "confirmed"
```

### 1.4 Medicine Schema

```typescript
interface Medicine {
  idx: number;                        // 0-based index
  name: string;                       // e.g. "Dolo 650"
  name_source_text: string | null;    // Exact phrase from transcript
  strength: string | null;            // e.g. "650mg"
  strength_source_text: string | null;
  form: string | null;                // e.g. "Tablet", "Syrup", "Injection"
  dose: string | null;                // e.g. "1 tablet", "2 teaspoons"
  dose_source_text: string | null;
  frequency: string | null;           // e.g. "Three times a day"
  frequency_normalized: string | null;// e.g. "TDS"
  frequency_source_text: string | null;
  timing: string | null;              // e.g. "before breakfast", "at bedtime"
  timing_source_text: string | null;
  duration: string | null;            // e.g. "5 days"
  duration_source_text: string | null;
  route: string | null;               // e.g. "oral", "IV"
  route_source_text: string | null;
  special_instructions: string | null;// e.g. "SOS", "STAT", "if fever above 100"
  status: "active" | "removed";       // "removed" if doctor explicitly removed it
  notes: string | null;               // Additional notes
}
```

### 1.5 Prescription Full Response Schema

```typescript
interface PrescriptionResponse {
  id: string;                         // UUID
  patient: PatientInfo;
  clinical: ClinicalInfo;
  medicines: Medicine[];
  transcript: TranscriptInfo | null;
  audio: AudioInfo | null;
  status: "draft" | "confirmed";
  current_version: number;
  has_uncertainties: boolean;
  uncertainties: Uncertainty[];
  created_at: string;                 // ISO 8601
  updated_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

interface PatientInfo {
  name: string;
  age: string;                        // e.g. "45 years"
  sex: string;                        // e.g. "Male", "Female"
}

interface ClinicalInfo {
  chief_complaints: string | null;
  diagnosis: string | null;
  investigations: string | null;
  advice: string | null;
  follow_up: string | null;
}

interface TranscriptInfo {
  id: string;
  raw_text: string;
  provider: string;
  provider_model: string;
  latency_ms: number;
  word_count: number;
  created_at: string;
}

interface AudioInfo {
  id: string;
  duration_seconds: number;
  format: string;
  size_bytes: number;
  created_at: string;
}

interface Uncertainty {
  field_path: string;                 // e.g. "medicines[0].strength"
  question: string;                   // e.g. "What is the strength of Dolo?"
  original_value: string | null;
}
```

---

## 2. Create New Prescription

**`POST /api/prescriptions/new`**

Creates a new prescription in `draft` status with patient information.

### Request

```json
{
  "patient_name": "Ramesh Kumar",
  "patient_age": "45 years",
  "patient_sex": "Male"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `patient_name` | string | Yes | Patient full name |
| `patient_age` | string | Yes | Age with unit (e.g. "45 years", "6 months") |
| `patient_sex` | string | Yes | "Male", "Female", or "Other" |

### Response — `201 Created`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "patient": {
    "name": "Ramesh Kumar",
    "age": "45 years",
    "sex": "Male"
  },
  "clinical": {
    "chief_complaints": null,
    "diagnosis": null,
    "investigations": null,
    "advice": null,
    "follow_up": null
  },
  "medicines": [],
  "transcript": null,
  "audio": null,
  "status": "draft",
  "current_version": 0,
  "has_uncertainties": false,
  "uncertainties": [],
  "created_at": "2026-11-03T14:30:00Z",
  "updated_at": "2026-11-03T14:30:00Z",
  "confirmed_at": null,
  "confirmed_by": null
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing required fields or invalid values |

---

## 3. Upload Audio Recording

**`POST /api/prescriptions/{id}/upload-audio`**

Uploads an audio recording for a prescription. Content-Type must be `multipart/form-data`.

### Request

- **Content-Type:** `multipart/form-data`
- **Form Field:** `audio` — the audio file (WebM or WAV)

```
POST /api/prescriptions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/upload-audio
Content-Type: multipart/form-data; boundary=----Boundary

------Boundary
Content-Disposition: form-data; name="audio"; filename="recording.webm"
Content-Type: audio/webm

<binary audio data>
------Boundary--
```

### Response — `201 Created`

```json
{
  "audio_id": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "duration_seconds": 32.5,
  "format": "webm",
  "size_bytes": 256000,
  "created_at": "2026-11-03T14:31:00Z"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription ID does not exist |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 413 | `FILE_TOO_LARGE` | File exceeds 50MB limit |
| 415 | `INVALID_FORMAT` | File is not WebM or WAV |

---

## 4. Trigger STT Transcription

**`POST /api/prescriptions/{id}/transcribe`**

Sends the most recent audio recording to the configured STT provider for transcription.

### Request

```json
{
  "language": "en-IN"
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `language` | string | No | `"en-IN"` | BCP-47 language code |

### Response — `200 OK`

```json
{
  "transcript_id": "c3d4e5f6-a1b2-7890-cdef-123456789abc",
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "audio_id": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
  "raw_text": "Patient Ramesh Kumar, male, 45 years old. Chief complaint is fever and body ache since 3 days. I am prescribing tablet Dolo 650, one tablet three times a day for 5 days. Also give tablet Cetirizine 10mg, one tablet at bedtime for 3 days.",
  "provider": "google",
  "provider_model": "chirp_2",
  "latency_ms": 3200,
  "word_count": 48,
  "created_at": "2026-11-03T14:32:00Z"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription ID does not exist |
| 409 | `NO_AUDIO` | No audio uploaded for this prescription |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 502 | `TRANSCRIPTION_FAILED` | STT provider returned an error |

---

## 5. Trigger LLM Structuring

**`POST /api/prescriptions/{id}/structure`**

Sends the transcript to the configured LLM provider for structured extraction. Creates version 1 of the structured prescription.

### Request

No request body required. Uses the latest transcript for this prescription.

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 1,
  "source": "ai_generated",
  "patient": {
    "name": "Ramesh Kumar",
    "age": "45 years",
    "sex": "Male"
  },
  "clinical": {
    "chief_complaints": "Fever and body ache since 3 days",
    "diagnosis": null,
    "investigations": null,
    "advice": null,
    "follow_up": null
  },
  "medicines": [
    {
      "idx": 0,
      "name": "Dolo 650",
      "name_source_text": "tablet Dolo 650",
      "strength": "650mg",
      "strength_source_text": "Dolo 650",
      "form": "Tablet",
      "dose": "1 tablet",
      "dose_source_text": "one tablet",
      "frequency": "Three times a day",
      "frequency_normalized": "TDS",
      "frequency_source_text": "three times a day",
      "timing": null,
      "timing_source_text": null,
      "duration": "5 days",
      "duration_source_text": "for 5 days",
      "route": "Oral",
      "route_source_text": null,
      "special_instructions": null,
      "status": "active",
      "notes": null
    },
    {
      "idx": 1,
      "name": "Cetirizine",
      "name_source_text": "tablet Cetirizine 10mg",
      "strength": "10mg",
      "strength_source_text": "Cetirizine 10mg",
      "form": "Tablet",
      "dose": "1 tablet",
      "dose_source_text": "one tablet",
      "frequency": "Once daily",
      "frequency_normalized": "OD (HS)",
      "frequency_source_text": "at bedtime",
      "timing": "at bedtime",
      "timing_source_text": "at bedtime",
      "duration": "3 days",
      "duration_source_text": "for 3 days",
      "route": "Oral",
      "route_source_text": null,
      "special_instructions": null,
      "status": "active",
      "notes": null
    }
  ],
  "has_uncertainties": false,
  "uncertainties": [],
  "llm_provider": "openai",
  "llm_model": "gpt-4o",
  "llm_latency_ms": 4800
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription ID does not exist |
| 409 | `NO_TRANSCRIPT` | No transcript available for this prescription |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 502 | `STRUCTURING_FAILED` | LLM provider returned an error or invalid JSON |

---

## 6. Get Prescription Details

**`GET /api/prescriptions/{id}`**

Returns the full current state of a prescription.

### Response — `200 OK`

Returns the full `PrescriptionResponse` object (see [Section 1.5](#15-prescription-full-response-schema)).

### Example

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "patient": {
    "name": "Ramesh Kumar",
    "age": "45 years",
    "sex": "Male"
  },
  "clinical": {
    "chief_complaints": "Fever and body ache since 3 days",
    "diagnosis": null,
    "investigations": null,
    "advice": null,
    "follow_up": null
  },
  "medicines": [
    {
      "idx": 0,
      "name": "Dolo 650",
      "name_source_text": "tablet Dolo 650",
      "strength": "650mg",
      "strength_source_text": "Dolo 650",
      "form": "Tablet",
      "dose": "1 tablet",
      "dose_source_text": "one tablet",
      "frequency": "Three times a day",
      "frequency_normalized": "TDS",
      "frequency_source_text": "three times a day",
      "timing": null,
      "timing_source_text": null,
      "duration": "5 days",
      "duration_source_text": "for 5 days",
      "route": "Oral",
      "route_source_text": null,
      "special_instructions": null,
      "status": "active",
      "notes": null
    }
  ],
  "transcript": {
    "id": "c3d4e5f6-a1b2-7890-cdef-123456789abc",
    "raw_text": "Patient Ramesh Kumar...",
    "provider": "google",
    "provider_model": "chirp_2",
    "latency_ms": 3200,
    "word_count": 48,
    "created_at": "2026-11-03T14:32:00Z"
  },
  "audio": {
    "id": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
    "duration_seconds": 32.5,
    "format": "webm",
    "size_bytes": 256000,
    "created_at": "2026-11-03T14:31:00Z"
  },
  "status": "draft",
  "current_version": 1,
  "has_uncertainties": false,
  "uncertainties": [],
  "created_at": "2026-11-03T14:30:00Z",
  "updated_at": "2026-11-03T14:33:00Z",
  "confirmed_at": null,
  "confirmed_by": null
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription ID does not exist |

---

## 7. Edit a Medicine

**`PUT /api/prescriptions/{id}/medicines/{idx}`**

Edit a specific medicine entry by its 0-based index. Creates a new prescription version.

### Request

All fields are optional — only include fields you want to update:

```json
{
  "name": "Dolo",
  "strength": "500mg",
  "form": "Tablet",
  "dose": "1 tablet",
  "frequency": "Twice a day",
  "timing": "after food",
  "duration": "3 days",
  "route": "Oral",
  "special_instructions": null,
  "status": "active",
  "notes": "Changed from 650mg to 500mg"
}
```

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 2,
  "source": "doctor_edited",
  "medicine_idx": 0,
  "updated_fields": ["strength", "notes"],
  "medicine": {
    "idx": 0,
    "name": "Dolo",
    "strength": "500mg",
    "form": "Tablet",
    "dose": "1 tablet",
    "frequency": "Twice a day",
    "frequency_normalized": "BD",
    "timing": "after food",
    "duration": "3 days",
    "route": "Oral",
    "special_instructions": null,
    "status": "active",
    "notes": "Changed from 650mg to 500mg"
  },
  "edit_recorded": {
    "edit_id": "e1d2c3b4-a5f6-7890-edcb-a09876543210",
    "field_changes": [
      {
        "field_path": "medicines[0].strength",
        "original_value": "650mg",
        "corrected_value": "500mg"
      }
    ]
  }
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription or medicine index not found |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

## 8. Edit Patient Info

**`PUT /api/prescriptions/{id}/patient`**

Update patient information. Creates a new prescription version.

### Request

```json
{
  "name": "Ramesh Kumar Singh",
  "age": "46 years",
  "sex": "Male"
}
```

All fields are optional — only include fields to update.

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 3,
  "source": "doctor_edited",
  "patient": {
    "name": "Ramesh Kumar Singh",
    "age": "46 years",
    "sex": "Male"
  },
  "updated_fields": ["name", "age"]
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 422 | `VALIDATION_ERROR` | Invalid values |

---

## 9. Edit Clinical Fields

**`PUT /api/prescriptions/{id}/clinical`**

Update clinical information (complaints, diagnosis, investigations, advice, follow-up). Creates a new version.

### Request

```json
{
  "chief_complaints": "Fever and body ache since 3 days, cough since 2 days",
  "diagnosis": "Acute upper respiratory infection",
  "investigations": null,
  "advice": "Plenty of warm fluids, rest",
  "follow_up": "After 3 days if not improving"
}
```

All fields are optional — only include fields to update.

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 4,
  "source": "doctor_edited",
  "clinical": {
    "chief_complaints": "Fever and body ache since 3 days, cough since 2 days",
    "diagnosis": "Acute upper respiratory infection",
    "investigations": null,
    "advice": "Plenty of warm fluids, rest",
    "follow_up": "After 3 days if not improving"
  },
  "updated_fields": ["chief_complaints", "diagnosis", "advice", "follow_up"]
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |

---

## 10. Apply Voice Edit Command

**`POST /api/prescriptions/{id}/voice-edit`**

Apply a voice-based edit command. The command is sent as text (after STT). The backend parses the intent and applies the edit.

### Request

```json
{
  "command_text": "Change the dosage of Dolo to twice a day",
  "command_audio_id": "optional-audio-uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `command_text` | string | Yes | The edit command as text |
| `command_audio_id` | string | No | ID of the audio recording for this command |

### Supported Command Patterns

| Pattern | Example |
|---|---|
| Change field | "Change the strength of Dolo to 500mg" |
| Remove medicine | "Remove Amitriptyline" |
| Add medicine | "Add tablet Paracetamol 500mg TDS for 3 days" |
| Change duration | "Change duration of Augmentin to 10 days" |
| Change frequency | "Make Cetirizine twice daily instead of once" |

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 5,
  "source": "voice_edited",
  "parsed_intent": {
    "action": "modify",
    "target_medicine": "Dolo",
    "target_field": "frequency",
    "new_value": "Twice a day"
  },
  "changes_applied": [
    {
      "field_path": "medicines[0].frequency",
      "original_value": "Three times a day",
      "new_value": "Twice a day"
    },
    {
      "field_path": "medicines[0].frequency_normalized",
      "original_value": "TDS",
      "new_value": "BD"
    }
  ],
  "medicines": [
    {
      "idx": 0,
      "name": "Dolo 650",
      "strength": "650mg",
      "form": "Tablet",
      "dose": "1 tablet",
      "frequency": "Twice a day",
      "frequency_normalized": "BD",
      "duration": "5 days",
      "route": "Oral",
      "status": "active"
    }
  ]
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |
| 422 | `VALIDATION_ERROR` | Could not parse command |
| 502 | `STRUCTURING_FAILED` | LLM failed to parse the voice edit |

---

## 11. Submit Clarification Response

**`POST /api/prescriptions/{id}/clarify`**

Submit a response to a clarification question about an uncertain field.

### Request

```json
{
  "field_path": "medicines[0].strength",
  "clarified_value": "650mg",
  "clarification_text": "It is 650mg Dolo",
  "clarification_audio_id": null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `field_path` | string | Yes | The dot-path of the uncertain field |
| `clarified_value` | string | Yes | The resolved value |
| `clarification_text` | string | No | Free-text clarification from doctor |
| `clarification_audio_id` | string | No | Audio ID if clarification was spoken |

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "version": 6,
  "source": "clarification",
  "clarification_id": "d4c3b2a1-f6e5-0987-dcba-654321fedcba",
  "field_path": "medicines[0].strength",
  "original_value": "unclear",
  "clarified_value": "650mg",
  "remaining_uncertainties": []
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription or field path not found |
| 409 | `ALREADY_CONFIRMED` | Prescription is already confirmed |

---

## 12. Doctor Confirmation

**`POST /api/prescriptions/{id}/confirm`**

Locks the prescription, marks it as confirmed. No further edits are allowed.

### Request

```json
{
  "confirmed_by": "Dr. Sharma",
  "confirmation_method": "manual_review"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `confirmed_by` | string | Yes | Name of confirming doctor |
| `confirmation_method` | string | No | "manual_review" (default) |

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "confirmed",
  "confirmed_at": "2026-11-03T14:40:00Z",
  "confirmed_by": "Dr. Sharma",
  "confirmation_method": "manual_review",
  "prescription_hash": "sha256:a1b2c3d4e5f6...",
  "final_version": 6
}
```

> [!WARNING]
> Confirmation is **irreversible**. All edit endpoints will return `409 ALREADY_CONFIRMED` after this.

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |
| 409 | `ALREADY_CONFIRMED` | Already confirmed |
| 422 | `VALIDATION_ERROR` | Missing `confirmed_by` or unresolved uncertainties |

---

## 13. Generate and Download PDF

**`GET /api/prescriptions/{id}/pdf`**

Generates a PDF of the confirmed prescription and returns it as a binary stream.

### Response — `200 OK`

- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="prescription_a1b2c3d4.pdf"`
- **Body:** Binary PDF data

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |
| 409 | `NOT_CONFIRMED` | Prescription has not been confirmed yet |

---

## 14. List All Prescriptions

**`GET /api/prescriptions`**

Returns a paginated list of all prescriptions.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | string | all | Filter by "draft" or "confirmed" |
| `page` | integer | 1 | Page number (1-based) |
| `page_size` | integer | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field |
| `sort_order` | string | `desc` | "asc" or "desc" |

### Response — `200 OK`

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "patient_name": "Ramesh Kumar",
      "patient_age": "45 years",
      "patient_sex": "Male",
      "status": "confirmed",
      "medicine_count": 2,
      "created_at": "2026-11-03T14:30:00Z",
      "updated_at": "2026-11-03T14:40:00Z",
      "confirmed_at": "2026-11-03T14:40:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

---

## 15. Version History

**`GET /api/prescriptions/{id}/history`**

Returns the full version history of a prescription, showing all changes over time.

### Response — `200 OK`

```json
{
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "versions": [
    {
      "version_number": 1,
      "source": "ai_generated",
      "data_summary": {
        "medicine_count": 2,
        "patient_name": "Ramesh Kumar",
        "has_diagnosis": false
      },
      "created_at": "2026-11-03T14:33:00Z"
    },
    {
      "version_number": 2,
      "source": "doctor_edited",
      "changes": [
        {
          "field_path": "medicines[0].strength",
          "original_value": "650mg",
          "new_value": "500mg"
        }
      ],
      "created_at": "2026-11-03T14:35:00Z"
    },
    {
      "version_number": 3,
      "source": "voice_edited",
      "changes": [
        {
          "field_path": "medicines[0].frequency",
          "original_value": "TDS",
          "new_value": "BD"
        }
      ],
      "created_at": "2026-11-03T14:37:00Z"
    }
  ],
  "edits": [
    {
      "edit_id": "e1d2c3b4-a5f6-7890-edcb-a09876543210",
      "field_path": "medicines[0].strength",
      "original_value": "650mg",
      "corrected_value": "500mg",
      "source_transcript_phrase": "Dolo 650",
      "error_category": "strength_correction",
      "created_at": "2026-11-03T14:35:00Z"
    }
  ]
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription not found |

---

## 16. Submit Doctor Feedback

**`POST /api/prescriptions/{id}/feedback`**

Submit feedback about the AI-generated output quality. Used for continuous improvement tracking.

### Request

```json
{
  "edit_id": "e1d2c3b4-a5f6-7890-edcb-a09876543210",
  "feedback_type": "ai_error",
  "feedback_text": "AI misheard 'Dolo 650' as 'Dolo 650mg tablets' and incorrectly set dose"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `edit_id` | string | No | Links feedback to a specific doctor edit |
| `feedback_type` | string | Yes | One of: `ai_error`, `stt_error`, `ui_issue`, `general` |
| `feedback_text` | string | Yes | Free-text feedback |

### Response — `201 Created`

```json
{
  "feedback_id": "fb123456-a1b2-c3d4-e5f6-789012345678",
  "prescription_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "edit_id": "e1d2c3b4-a5f6-7890-edcb-a09876543210",
  "feedback_type": "ai_error",
  "feedback_text": "AI misheard 'Dolo 650' as 'Dolo 650mg tablets' and incorrectly set dose",
  "created_at": "2026-11-03T14:45:00Z"
}
```

### Errors

| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | Prescription or edit not found |
| 422 | `VALIDATION_ERROR` | Invalid feedback_type |

---

## Appendix: TypeScript API Client Interface

```typescript
// frontend/src/services/prescriptionApi.ts

export interface PrescriptionApi {
  createPrescription(patient: PatientInfo): Promise<PrescriptionResponse>;
  uploadAudio(prescriptionId: string, audioBlob: Blob): Promise<AudioInfo>;
  transcribe(prescriptionId: string, language?: string): Promise<TranscriptInfo>;
  structure(prescriptionId: string): Promise<StructuredResult>;
  getPrescription(prescriptionId: string): Promise<PrescriptionResponse>;
  editMedicine(prescriptionId: string, idx: number, updates: Partial<Medicine>): Promise<EditResult>;
  editPatient(prescriptionId: string, updates: Partial<PatientInfo>): Promise<EditResult>;
  editClinical(prescriptionId: string, updates: Partial<ClinicalInfo>): Promise<EditResult>;
  voiceEdit(prescriptionId: string, commandText: string, audioId?: string): Promise<VoiceEditResult>;
  clarify(prescriptionId: string, fieldPath: string, value: string): Promise<ClarificationResult>;
  confirm(prescriptionId: string, confirmedBy: string): Promise<ConfirmResult>;
  downloadPdf(prescriptionId: string): Promise<Blob>;
  listPrescriptions(params?: ListParams): Promise<PaginatedList<PrescriptionSummary>>;
  getHistory(prescriptionId: string): Promise<VersionHistory>;
  submitFeedback(prescriptionId: string, feedback: FeedbackRequest): Promise<FeedbackResponse>;
}
```

---

## Appendix: Python Pydantic Schemas

```python
# backend/app/models/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class PrescriptionStatus(str, Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"

class MedicineStatus(str, Enum):
    ACTIVE = "active"
    REMOVED = "removed"

class CreatePrescriptionRequest(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=200)
    patient_age: str = Field(..., min_length=1, max_length=50)
    patient_sex: str = Field(..., pattern=r"^(Male|Female|Other)$")

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    strength: Optional[str] = None
    form: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    timing: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    special_instructions: Optional[str] = None
    status: Optional[MedicineStatus] = None
    notes: Optional[str] = None

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    sex: Optional[str] = None

class ClinicalUpdate(BaseModel):
    chief_complaints: Optional[str] = None
    diagnosis: Optional[str] = None
    investigations: Optional[str] = None
    advice: Optional[str] = None
    follow_up: Optional[str] = None

class VoiceEditRequest(BaseModel):
    command_text: str = Field(..., min_length=1)
    command_audio_id: Optional[str] = None

class ClarificationRequest(BaseModel):
    field_path: str = Field(..., min_length=1)
    clarified_value: str = Field(..., min_length=1)
    clarification_text: Optional[str] = None
    clarification_audio_id: Optional[str] = None

class ConfirmRequest(BaseModel):
    confirmed_by: str = Field(..., min_length=1, max_length=200)
    confirmation_method: str = Field(default="manual_review")

class FeedbackType(str, Enum):
    AI_ERROR = "ai_error"
    STT_ERROR = "stt_error"
    UI_ISSUE = "ui_issue"
    GENERAL = "general"

class FeedbackRequest(BaseModel):
    edit_id: Optional[str] = None
    feedback_type: FeedbackType
    feedback_text: str = Field(..., min_length=1, max_length=2000)
```
