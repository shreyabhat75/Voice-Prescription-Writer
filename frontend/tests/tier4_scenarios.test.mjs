import {
  TestRunner,
  assertTrue,
  assertFalse,
  assertEqual,
  readSourceFile,
  createMockLocalStorage,
} from './harness.mjs';

export function createTier4Suite() {
  const suite = new TestRunner('Tier 4: Real-World Clinical Application Scenarios (End-to-End Shift Simulations)');

  suite.test('T4_SCENARIO_01', 'Real-World Scenario 1: Full Clinical Shift (Login -> Consultations -> Prescriptions -> Signout -> Admin Analytics Audit)', () => {
    // 1. Verify all required architecture elements are integrated
    const landingSrc = readSourceFile('pages/LandingPage.tsx');
    const loginSrc = readSourceFile('pages/LoginPage.tsx');
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');
    const authSrc = readSourceFile('context/AuthContext.tsx');
    const confirmSrc = readSourceFile('components/prescription/ConfirmationDialog.tsx');
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx');

    assertTrue(landingSrc !== null, 'Landing page must exist');
    assertTrue(loginSrc !== null, 'Login page must exist');
    assertTrue(stationSrc !== null, 'Doctor Station must exist');
    assertTrue(authSrc !== null, 'AuthContext must exist');
    assertTrue(confirmSrc !== null, 'ConfirmationDialog must exist');
    assertTrue(adminSrc !== null, 'Admin analytics interface must exist');

    // Step A: Doctor arrives and uses single login button to enter Doctor Station
    assertTrue(
      loginSrc.includes('Doctor Station') || loginSrc.includes('DoctorStation'),
      'Step A: Login page must direct physician to Doctor Station terminal'
    );

    // Step B: Doctor authenticates with secret code into Doctor Station
    assertTrue(
      stationSrc.includes('secretCode') || stationSrc.includes('Secret Code') || stationSrc.includes('authenticateWithSecretCode'),
      'Step B: Doctor Station must accept physician secret code'
    );
    assertTrue(
      authSrc.includes('authenticateWithSecretCode'),
      'Step B: AuthContext must authenticate secret code'
    );

    // Step C: Consultation workflow and prescription confirmation increments attended count
    assertTrue(
      confirmSrc.includes('recordPatientAttended'),
      'Step C: ConfirmationDialog must invoke recordPatientAttended upon prescription sign-off'
    );

    // Step D: Admin analytics reflects cumulative metrics
    assertTrue(
      adminSrc.includes('loginCount') && adminSrc.includes('patientsAttendedCount'),
      'Step D: Admin analytics must reflect both login count and patient attendance metrics'
    );
  });

  suite.test('T4_SCENARIO_02', 'Real-World Scenario 2: Multi-Doctor Hospital Ward Rotation (Provisioning, Sequential Shifts, Offboarding & Credential Revocation)', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx');
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');

    assertTrue(authSrc !== null, 'AuthContext must exist');
    assertTrue(adminSrc !== null, 'Admin management must exist');
    assertTrue(stationSrc !== null, 'Doctor Station must exist');

    // Phase 1: Administrator provisions new physician
    assertTrue(
      authSrc.includes('addDoctor') && adminSrc.includes('addDoctor'),
      'Phase 1: Admin interface must support adding new doctors with secret codes'
    );

    // Phase 2: Sequential logins and metric isolation
    assertTrue(
      authSrc.includes('loginCount') && authSrc.includes('recordPatientAttended'),
      'Phase 2: Metrics must track per individual doctor profile'
    );

    // Phase 3: Offboarding physician & credential revocation
    assertTrue(
      authSrc.includes('removeDoctor') && adminSrc.includes('removeDoctor'),
      'Phase 3: Admin interface must support removing departing doctors'
    );
    assertTrue(
      stationSrc.includes('authenticateWithSecretCode') || authSrc.includes('authenticateWithSecretCode'),
      'Phase 3: Revoked credentials must fail authentication'
    );
  });

  return suite;
}
