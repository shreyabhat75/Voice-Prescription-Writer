# Project: Voice Prescription Writer — Clinical Overhaul

## Architecture
- **Framework**: React 18 + Vite 6 + Tailwind CSS v4 + React Router DOM 6
- **Frontend Architecture**:
  - `LandingPage.tsx`: Public product showcase, redesigned with clean clinical theme, professional medical copy, and direct links to workstation sign-in (`/login`).
  - `LoginPage.tsx`: Clinical portal sign-in displaying a single prominent login button navigating to Doctor Station, plus a dedicated Admin Access toggle.
  - `DoctorStation.tsx` (or integrated station view): Dedicated authentication interface where doctors input their individual secret code. Valid codes route to `/dashboard`, invalid codes show error alerts without navigation.
  - `AdminBlock.tsx` / `AdminDashboard.tsx`: Administrative section for adding/removing doctors with profile metadata and secret codes, and viewing performance analytics (login counts and attended patient counts per doctor).
  - `AuthContext.tsx`: Persistent client-side doctor roster (`voicerx_doctor_roster`) and active session management (`voicerx_doctor_session`, `voicerx_doctor_session_auth`). Provides methods for secret code authentication, roster mutation (add/remove), and patient attendance recording.
  - `AppLayout.tsx`: Route protection guard (`isAuthenticated` check) redirecting unauthenticated traffic to `/login`.
  - `ConfirmationDialog.tsx` & `PrescriptionReview.tsx`: Prescription confirmation increments the attending doctor's `patientsAttendedCount`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Clinical Landing Page Theme | Redesign landing page from dark SaaS/neon to clean, professional clinical theme (slate-50 background, white clinical cards, subtle borders, navy text, medical blue accents) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Professional Clinical Content | Remove playful consumer emojis and casual tech badges, replace with professional clinical terminology, hospital workflow copy, and regulatory compliance framing | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Secure Landing Page Navigation | Ensure all CTA buttons route unauthenticated doctors to `/login` (leading to Doctor Station) rather than bypassing authentication directly to `/dashboard` | M1 | Survey 1 & ORIGINAL_REQUEST §R1 |
| 4 | Single Login Button | Replace multi-tab / 1-click demo login page with a streamlined clinical portal featuring a single login button that navigates directly to the doctor station | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Doctor Station Secret Code Authentication | Implement Doctor Station interface where doctors authenticate via individual secret code; route to `/dashboard` on success; display error on invalid code | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Route Protection Guard | Protect `/dashboard`, `/new`, `/prescription/:id`, and `/history` routes in `AppLayout` so unauthenticated visitors are redirected to `/login` | M2 | Survey 2 & ORIGINAL_REQUEST §R2 |
| 7 | Persistent Doctor Roster State | Extend `DoctorProfile` with `secretCode`, `loginCount`, `patientsAttendedCount`; manage persistent roster in `AuthContext` via `localStorage` | M2 | Survey 2 & 3 & ORIGINAL_REQUEST §R2/R3/R4 |
| 8 | Admin Access Button / Toggle | Provide a dedicated admin access button or toggle from the login or doctor station interface to access the admin section | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Admin Doctor Roster Management | Provide admin interface to add a new doctor (with full profile details and secret code) and remove existing doctors; immediately affects Doctor Station auth | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Admin Doctor Performance Analytics | Display doctor performance metrics: total login occurrences and total attended patient consultations per doctor | M3 | ORIGINAL_REQUEST §R4 |
| 11 | Patient Attendance Tracking Integration | Automatically increment the attending doctor's `patientsAttendedCount` upon prescription confirmation/authorization in the clinical workflow | M3 | Survey 3 & ORIGINAL_REQUEST §R4 |
| 12 | Clean Build & Lint Compliance | Ensure the entire codebase compiles cleanly with `npm run build` (`tsc -b && vite build`) and passes `npm run lint` with 0 errors | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| 13 | Comprehensive Verification Suite | Verify all acceptance criteria across all 4 tiers (Feature, Boundary, Combinatorial, Real-World) with Challenger adversarial testing | M4 | Orchestrator Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Professional Clinical Landing Page | Redesign `LandingPage.tsx` with professional clinical styling, clean palette, hospital copy, and secure `/login` routing | none | IN_PROGRESS |
| M2 | Doctor Station & Secret Code Auth | Single login button in `LoginPage.tsx`, `DoctorStation` secret code authentication, route protection in `AppLayout.tsx`, extended `DoctorProfile` & `AuthContext.tsx` | none | PLANNED |
| M3 | Admin Block & Doctor Performance Analytics | Admin access button/toggle, doctor addition & removal, doctor performance analytics table/cards (logins & patients attended), confirmation attendance hook | M2 | PLANNED |
| M4 | Integration, Build/Lint & Verification | Full verification of end-to-end user workflows, clean build/lint execution, adversarial challenger tests, and forensic integrity audit | M1, M2, M3 | PLANNED |

## Interface Contracts
### DoctorProfile & Roster Contract (`types/auth.ts` & `context/AuthContext.tsx`)
```typescript
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

export interface AuthContextType {
  doctor: DoctorProfile | null;
  isAuthenticated: boolean;
  roster: DoctorProfile[];
  authenticateWithSecretCode: (code: string) => { success: boolean; error?: string };
  logout: () => void;
  addDoctor: (newDoc: Omit<DoctorProfile, 'id' | 'loginCount' | 'patientsAttendedCount'> & { secretCode: string }) => boolean;
  removeDoctor: (id: string) => boolean;
  recordPatientAttended: (doctorId?: string) => void;
}
```

### Route & Navigation Contract
- `/` -> `LandingPage.tsx`: Clean clinical styling, CTA routes to `/login`.
- `/login` -> `LoginPage.tsx`: Single login button leading to Doctor Station view, plus dedicated Admin Access button/toggle.
- Doctor Station view (in `/login` or route `/doctor-station`): Secret code input field, Submit button, Back button, validation error display.
- Admin view (modal, sub-view in `/login`, or `/admin`): Roster table, Add Doctor modal/form, Remove Doctor action, Performance Analytics dashboard cards/table.
- `/dashboard`, `/new`, `/prescription/:id`, `/history`: Protected by `AppLayout.tsx`, redirects unauthenticated users to `/login`.

## Code Layout
- `frontend/src/pages/LandingPage.tsx`: Clinical landing page component
- `frontend/src/pages/LoginPage.tsx`: Clinical login portal & entry point
- `frontend/src/components/auth/DoctorStation.tsx`: Doctor station secret code authentication terminal
- `frontend/src/components/admin/AdminBlock.tsx` (and/or `AdminAnalytics.tsx`): Doctor roster management & performance metrics
- `frontend/src/context/AuthContext.tsx`: Persistent doctor roster, secret code auth, stats tracking
- `frontend/src/types/auth.ts`: Extended `DoctorProfile` interface and initial seed roster
- `frontend/src/components/layout/AppLayout.tsx`: Route protection wrapper
- `frontend/src/components/prescription/ConfirmationDialog.tsx`: Hooks into `recordPatientAttended`
