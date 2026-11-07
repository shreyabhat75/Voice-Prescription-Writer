import axios from 'axios';
import {
  ClinicalInfo,
  MedicineItem,
  PatientInfo,
  Prescription,
  PrescriptionListItem,
} from '../types';

// Use environment variable VITE_API_BASE_URL if configured, otherwise fallback to local/proxy
const rawBase = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = rawBase.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
});

// Automatically inject active doctor credentials into all outbound API calls
api.interceptors.request.use((config) => {
  try {
    const sessionStr = localStorage.getItem('voicerx_doctor_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session?.name) {
        config.headers['X-Doctor-Name'] = session.name;
      }
      if (session?.id) {
        config.headers['X-Doctor-Id'] = session.id;
      }
    } else {
      const lastDoc = localStorage.getItem('voicerx_last_doctor');
      if (lastDoc) {
        config.headers['X-Doctor-Name'] = lastDoc;
      }
    }
  } catch {
    // Ignore storage parse exceptions
  }
  return config;
});

export const apiClient = {
  // Health & Connectivity Check
  async checkHealth(): Promise<{
    status: string;
    service: string;
    stt_provider: string;
    llm_provider: string;
    demo_mode: boolean;
  }> {
    const healthUrl = API_BASE_URL ? `${API_BASE_URL}/health` : '/health';
    const res = await axios.get(healthUrl, { timeout: 4000 });
    return res.data;
  },

  // Prescriptions
  async createPrescription(notes?: string, doctorName?: string, doctorId?: string): Promise<Prescription> {
    const res = await api.post<Prescription>('/prescriptions', {
      notes,
      doctor_name: doctorName,
      doctor_id: doctorId,
    });
    return res.data;
  },

  async getPrescription(id: string): Promise<Prescription> {
    const res = await api.get<Prescription>(`/prescriptions/${id}`);
    return res.data;
  },

  async listPrescriptions(doctorName?: string): Promise<PrescriptionListItem[]> {
    const params = doctorName ? { doctor_name: doctorName } : undefined;
    const res = await api.get<PrescriptionListItem[]>('/prescriptions', { params });
    return res.data;
  },

  async deletePrescription(id: string): Promise<{ status: string; deleted_id: string }> {
    const res = await api.delete<{ status: string; deleted_id: string }>(`/prescriptions/${id}`);
    return res.data;
  },

  // Audio Upload using standard FormData without manual Content-Type header
  async uploadAudio(prescriptionId: string, audioBlob: Blob): Promise<Prescription> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'dictation.webm');

    // Let the browser set the boundary header automatically!
    const res = await api.post<Prescription>(
      `/prescriptions/${prescriptionId}/upload-audio`,
      formData
    );
    return res.data;
  },

  // Direct Standalone Speech-to-Text Transcription
  async transcribeAudio(audioBlob: Blob): Promise<{
    status: string;
    transcript: string;
    provider: string;
    model: string;
    latency_ms: number;
    audio_url: string;
    demo_mode: boolean;
    demo_notice?: string;
  }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'dictation.webm');

    const res = await api.post('/transcribe', formData);
    return res.data;
  },

  // Prescription Workflow Transcription
  async transcribe(prescriptionId: string): Promise<Prescription> {
    const res = await api.post<Prescription>(`/prescriptions/${prescriptionId}/transcribe`);
    return res.data;
  },

  // Structuring
  async structurePrescription(
    prescriptionId: string,
    transcriptOverride?: string
  ): Promise<Prescription> {
    const res = await api.post<Prescription>(`/prescriptions/${prescriptionId}/structure`, {
      transcript_override: transcriptOverride,
    });
    return res.data;
  },

  // Updating Individual Sections
  async updatePatient(prescriptionId: string, patient: PatientInfo): Promise<Prescription> {
    const res = await api.put<Prescription>(`/prescriptions/${prescriptionId}/patient`, patient);
    return res.data;
  },

  async updateClinical(prescriptionId: string, clinical: ClinicalInfo): Promise<Prescription> {
    const res = await api.put<Prescription>(`/prescriptions/${prescriptionId}/clinical`, clinical);
    return res.data;
  },

  async updateMedicine(
    prescriptionId: string,
    index: number,
    medicine: MedicineItem
  ): Promise<Prescription> {
    const res = await api.put<Prescription>(
      `/prescriptions/${prescriptionId}/medicines/${index}`,
      medicine
    );
    return res.data;
  },

  async updatePrescriptionFields(
    prescriptionId: string,
    updates: {
      patient?: PatientInfo;
      clinical?: ClinicalInfo;
      medicines?: MedicineItem[];
    }
  ): Promise<Prescription> {
    const res = await api.put<Prescription>(`/prescriptions/${prescriptionId}`, updates);
    return res.data;
  },

  // Voice Edit
  async applyVoiceEdit(
    prescriptionId: string,
    command: string
  ): Promise<{ prescription: Prescription; audit_entry: any }> {
    const res = await api.post<{ prescription: Prescription; audit_entry: any }>(
      `/prescriptions/${prescriptionId}/voice-edit`,
      { command }
    );
    return res.data;
  },

  // Doctor Confirmation Gate
  async confirmPrescription(
    prescriptionId: string,
    doctorName: string = 'Dr. Ananya Rao'
  ): Promise<Prescription> {
    const res = await api.post<Prescription>(`/prescriptions/${prescriptionId}/confirm`, {
      doctor_name: doctorName,
      confirm_all_reviewed: true,
    });
    return res.data;
  },

  // PDF Export
  getPdfDownloadUrl(prescriptionId: string): string {
    const base = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
    return `${base}/prescriptions/${prescriptionId}/pdf`;
  },

  // History & Audit
  async getHistory(prescriptionId: string): Promise<{ versions: any[]; edits: any[] }> {
    const res = await api.get<{ versions: any[]; edits: any[] }>(
      `/prescriptions/${prescriptionId}/history`
    );
    return res.data;
  },

  // Feedback
  async submitFeedback(
    prescriptionId: string,
    feedback: { rating: number; category?: string; comment?: string }
  ): Promise<any> {
    const res = await api.post(`/prescriptions/${prescriptionId}/feedback`, feedback);
    return res.data;
  },

  // Patient Records & Medical History
  async searchPatients(params: {
    query?: string;
    patient_id?: string;
    mobile_number?: string;
    doctor_name?: string;
  }): Promise<any[]> {
    const res = await api.get('/patients/search', { params });
    return res.data;
  },

  async getPatient(patientIdentifier: string): Promise<any> {
    const res = await api.get(`/patients/${patientIdentifier}`);
    return res.data;
  },

  async getPatientPrescriptions(patientIdentifier: string): Promise<any[]> {
    const res = await api.get(`/patients/${patientIdentifier}/prescriptions`);
    return res.data;
  },

  async getPatientAuditTrail(patientIdentifier: string): Promise<any[]> {
    const res = await api.get(`/patients/${patientIdentifier}/audit`);
    return res.data;
  },
};
