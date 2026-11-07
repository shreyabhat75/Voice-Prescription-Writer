export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  department: string;
  registrationNumber: string;
  hospital: string;
  avatarInitials: string;
  secretCode: string;
  loginCount: number;
  patientsAttendedCount: number;
}

export const DEMO_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc_1',
    name: 'Dr. Ananya Rao, MD',
    title: 'Senior Consultant Physician',
    department: 'General & Internal Medicine',
    registrationNumber: 'KMC-2018-84920',
    hospital: 'Apex Specialty Hospital & Research Institute',
    avatarInitials: 'AR',
    secretCode: 'DOC-101',
    loginCount: 0,
    patientsAttendedCount: 0,
  },
  {
    id: 'doc_2',
    name: 'Dr. Rajesh Sharma, MD, DM',
    title: 'Attending Cardiologist',
    department: 'Cardiology & Intensive Care',
    registrationNumber: 'DMC-2014-51203',
    hospital: 'Metro Heart Institute & Healthcare',
    avatarInitials: 'RS',
    secretCode: 'DOC-202',
    loginCount: 0,
    patientsAttendedCount: 0,
  },
  {
    id: 'doc_3',
    name: 'Dr. Meera Iyer, MBBS, DCH',
    title: 'Consultant Pediatrician',
    department: 'Pediatrics & Neonatology',
    registrationNumber: 'MMC-2019-33819',
    hospital: 'Rainbow Children & Family Clinic',
    avatarInitials: 'MI',
    secretCode: 'DOC-303',
    loginCount: 0,
    patientsAttendedCount: 0,
  },
];
