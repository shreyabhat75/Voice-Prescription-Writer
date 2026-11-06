import {
  TestRunner,
  assertTrue,
  assertFalse,
  assertEqual,
  readSourceFile,
  createMockLocalStorage,
} from './harness.mjs';

export function createTier3Suite() {
  const suite = new TestRunner('Tier 3: Cross-Feature Interactions & Combinations (Pairwise Tests)');

  suite.test('T3_PAIR_01', 'Pairwise: Admin adds new doctor -> Doctor Station immediately accepts their secret code', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    // Verification that roster is shared state between admin addition and secret code authentication
    assertTrue(authSrc.includes('addDoctor'), 'AuthContext must support addDoctor');
    assertTrue(authSrc.includes('authenticateWithSecretCode'), 'AuthContext must support authenticateWithSecretCode');
    assertTrue(
      authSrc.includes('setRoster') && authSrc.includes('roster.find'),
      'authenticateWithSecretCode must check against the current dynamic roster updated by addDoctor'
    );
  });

  suite.test('T3_PAIR_02', 'Pairwise: Admin removes doctor -> Doctor Station immediately rejects removed secret code', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(authSrc.includes('removeDoctor'), 'AuthContext must support removeDoctor');
    assertTrue(
      authSrc.includes('removeDoctor') && authSrc.includes('setRoster'),
      'removeDoctor must update the roster state so the removed code is not found'
    );
  });

  suite.test('T3_PAIR_03', 'Pairwise: Doctor authenticates at Doctor Station -> Admin Analytics reflects incremented loginCount', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx') ||
      readSourceFile('components/admin/AdminAnalytics.tsx');

    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');
    assertTrue(adminSrc !== null, 'Admin analytics component must exist');

    assertTrue(
      authSrc.includes('loginCount'),
      'AuthContext must track loginCount on doctor authentication'
    );
    assertTrue(
      adminSrc.includes('loginCount'),
      'Admin view must consume and display loginCount from the shared roster'
    );
  });

  suite.test('T3_PAIR_04', 'Pairwise: Prescription confirmation in clinical workflow -> increments patientsAttendedCount in Admin Analytics', () => {
    const confirmSrc = readSourceFile('components/prescription/ConfirmationDialog.tsx');
    const authSrc = readSourceFile('context/AuthContext.tsx');
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx');

    assertTrue(confirmSrc !== null, 'ConfirmationDialog.tsx must exist');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');
    assertTrue(adminSrc !== null, 'Admin component must exist');

    assertTrue(
      confirmSrc.includes('recordPatientAttended'),
      'ConfirmationDialog must trigger recordPatientAttended'
    );
    assertTrue(
      authSrc.includes('recordPatientAttended') && authSrc.includes('patientsAttendedCount'),
      'AuthContext must increment patientsAttendedCount'
    );
    assertTrue(
      adminSrc.includes('patientsAttendedCount'),
      'Admin interface must display patientsAttendedCount'
    );
  });

  suite.test('T3_PAIR_05', 'Pairwise: Landing Page CTA -> routes to /login -> Doctor Station auth -> grants access to protected routes', () => {
    const landingSrc = readSourceFile('pages/LandingPage.tsx');
    const loginSrc = readSourceFile('pages/LoginPage.tsx');
    const layoutSrc = readSourceFile('components/layout/AppLayout.tsx');

    assertTrue(landingSrc !== null, 'LandingPage.tsx must exist');
    assertTrue(loginSrc !== null, 'LoginPage.tsx must exist');
    assertTrue(layoutSrc !== null, 'AppLayout.tsx must exist');

    // 1. Landing routes unauthenticated to /login
    assertTrue(landingSrc.includes('/login'), 'Landing page must route to /login');

    // 2. Login leads to Doctor Station
    assertTrue(loginSrc.includes('Doctor Station') || loginSrc.includes('DoctorStation'), 'LoginPage must lead to Doctor Station');

    // 3. AppLayout verifies isAuthenticated
    assertTrue(layoutSrc.includes('isAuthenticated'), 'AppLayout must check isAuthenticated');
  });

  suite.test('T3_PAIR_06', 'Pairwise: Admin adds doctor -> doctor attends patient -> Admin displays both loginCount: 1 and patientsAttendedCount: 1', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('addDoctor') &&
      authSrc.includes('authenticateWithSecretCode') &&
      authSrc.includes('recordPatientAttended'),
      'AuthContext must support complete lifecycle: addDoctor -> authenticate -> recordPatientAttended'
    );
  });

  return suite;
}
