# E2E Test Infra: Voice Prescription Writer Clinical Overhaul

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Clinical Workload Testing.

## Feature Inventory & Test Coverage
| # | Feature | Source (Requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|----------------------|:----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Professional Clinical Landing Page | ORIGINAL_REQUEST §R1 | 5 cases | 5 cases | ✓ | ✓ |
| 2 | Single Login Button on Login Page | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 3 | Doctor Station Secret Code Authentication | ORIGINAL_REQUEST §R2 | 5 cases | 5 cases | ✓ | ✓ |
| 4 | Admin Block Doctor Roster Management | ORIGINAL_REQUEST §R3 | 5 cases | 5 cases | ✓ | ✓ |
| 5 | Admin Dashboard Doctor Performance Analytics | ORIGINAL_REQUEST §R4 | 5 cases | 5 cases | ✓ | ✓ |

## Test Architecture
- **Verification Harness**: Automated verification script and end-to-end component/integration suite running in frontend environment.
- **Verification Commands**: `npm run build` (`tsc -b && vite build`) and `npm run lint` (`eslint .`), along with automated test runner scripts.
- **Pass/Fail Semantics**: All suites pass with exit code 0, zero compilation errors, zero lint warnings.

## Tier Details
- **Tier 1: Feature Coverage (>=5 per feature)**:
  - Landing page renders professional clinical palette, clean typography, medical branding, no dark neon/emojis.
  - Login page displays a single primary login button that navigates directly to the doctor station.
  - Doctor station provides secret code input and authenticates valid codes, routing to `/dashboard`.
  - Admin button/toggle opens admin block; adding new doctor adds to roster; removing doctor deletes from roster.
  - Admin dashboard displays accurate login count and attended patient count for each doctor.
- **Tier 2: Boundary & Corner Cases (>=5 per feature)**:
  - Empty secret code submission (rejected with clear error).
  - Invalid/unknown secret code submission (rejected with clear error, no dashboard access).
  - Whitespace-trimmed secret code handling.
  - Duplicate doctor secret code or registration number handling during doctor addition.
  - Zero-login and zero-patients-attended initial state display in analytics.
- **Tier 3: Cross-Feature Combinations**:
  - Add new doctor in Admin -> Immediately authenticate that doctor at Doctor Station -> Verify login count increments in Admin Dashboard.
  - Remove doctor in Admin -> Attempt authentication with removed doctor's secret code -> Verify access denied.
  - Authenticate doctor -> Confirm prescription in clinical review -> Verify patients attended count increments for that specific doctor in Admin Dashboard.
- **Tier 4: Real-World Clinical Application Scenarios**:
  - Full clinical shift scenario: Dr. Rao logs in with secret code, attends patient consultation, confirms prescription, logs out. Admin checks dashboard: Dr. Rao login count = 1, patients attended = 1.
  - Multi-doctor hospital ward scenario: Multiple doctors log in sequentially with their distinct secret codes, attend patients, and admin views comparative performance analytics.
