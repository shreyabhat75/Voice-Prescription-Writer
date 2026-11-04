export type FieldStatus = 'extracted' | 'not_mentioned' | 'unclear' | 'needs_review' | 'doctor_corrected';

export interface SourceEvidence {
  value: any;
  source_text: string | null;
  status: FieldStatus;
  confidence: number | null;
}

export interface MedicineItem {
  name: SourceEvidence;
  raw_phrase?: string | null;
  candidate_matches?: string[];
  strength: SourceEvidence;
  form: SourceEvidence;
  dose: SourceEvidence;
  frequency: SourceEvidence;
  frequency_normalized?: string | null;
  timing: SourceEvidence;
  duration: SourceEvidence;
  route: SourceEvidence;
  special_instructions?: SourceEvidence | null;
}

export interface PatientInfo {
  name: SourceEvidence;
  age: SourceEvidence;
  sex: SourceEvidence;
}

export interface ClinicalInfo {
  chief_complaints: SourceEvidence;
  diagnosis: SourceEvidence;
  investigations: SourceEvidence;
  advice: SourceEvidence;
  follow_up: SourceEvidence;
  unclear_phrases?: SourceEvidence[];
}

export type PrescriptionStatus = 'recording' | 'transcribing' | 'structuring' | 'review' | 'confirmed';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  medicine_index?: number;
  code?: string;
}

export interface ClarificationQuestion {
  field: string;
  question: string;
  medicine_index?: number;
  original_value?: string;
}

export interface Prescription {
  id: string;
  status: PrescriptionStatus;
  patient: PatientInfo;
  clinical: ClinicalInfo;
  medicines: MedicineItem[];
  raw_transcript: string | null;
  edited_transcript?: string | null;
  patient_id?: string | null;
  permanent_patient_id?: string | null;
  pdf_path?: string | null;
  audio_url: string | null;
  validation_issues: ValidationIssue[];
  clarification_questions: ClarificationQuestion[];
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  verified_at?: string | null;
  version: number;
}

export interface PrescriptionListItem {
  id: string;
  patient_name: string;
  status: PrescriptionStatus;
  version: number;
  medicine_count: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

