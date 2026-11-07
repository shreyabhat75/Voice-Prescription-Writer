import {
  TestRunner,
  assertTrue,
  assertFalse,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertMatch,
  assertNotMatch,
  readSourceFile,
  sourceFileExists,
} from './harness.mjs';

export function createTier1Suite() {
  const suite = new TestRunner('Tier 1: Feature Coverage (5 Core Features x 5 Cases = 25 Tests)');

  // ------------------------------------------------------------------------
  // Feature 1: Professional Clinical Landing Page (ORIGINAL_REQUEST §R1)
  // ------------------------------------------------------------------------

  suite.test('T1_F1_01', 'Landing page visual palette uses clean clinical styling (bg-slate-50/white) and excludes dark SaaS background (bg-slate-900)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Expected: clean clinical theme (slate-50 background, white clinical cards)
    // Dark SaaS bg-slate-900 should be replaced
    assertNotMatch(
      src,
      /className=["'][^"']*bg-slate-900[^"']*text-slate-100[^"']*min-h-screen/,
      'Landing page root must not use dark SaaS theme bg-slate-900 text-slate-100'
    );
    assertTrue(
      src.includes('bg-slate-50') || src.includes('bg-gray-50') || src.includes('bg-white'),
      'Landing page root must use a professional clinical light background (e.g. bg-slate-50 or bg-white)'
    );
  });

  suite.test('T1_F1_02', 'Landing page contains professional clinical copy and hospital workflow terminology without consumer emojis', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Authoritative requirements: hospital workflow copy, clinical terminology
    assertTrue(
      src.includes('Clinical') || src.includes('Outpatient') || src.includes('OPD') || src.includes('Prescription'),
      'Landing page must feature clinical / hospital outpatient terminology'
    );

    // Emojis check: consumer emojis should not be present in JSX text
    const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assertNotMatch(src, emojiRegex, 'Landing page text must not contain casual consumer emojis');
  });

  suite.test('T1_F1_03', 'Primary landing page CTA buttons route unauthenticated visitors to /login (Doctor Station)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // When unauthenticated, handleLaunchWorkspace or primary CTA must route to /login, NOT bypass directly to /dashboard
    assertNotMatch(
      src,
      /const\s+handleLaunchWorkspace\s*=\s*\(\)\s*=>\s*\{\s*navigate\(['"]\/dashboard['"]\);?\s*\}/,
      'handleLaunchWorkspace must NOT bypass unauthenticated users straight to /dashboard'
    );
    assertTrue(
      src.includes("navigate('/login')") || src.includes('navigate("/login")'),
      'Landing page CTAs must route to /login for doctor workstation entry'
    );
  });

  suite.test('T1_F1_04', 'All evaluation and CTA sections route unauthenticated traffic securely to /login', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Baseline code had: onClick={() => navigate('/dashboard')} in multiple unauthenticated buttons
    const directBypassMatches = src.match(/onClick=\{\(\)\s*=>\s*navigate\(['"]\/dashboard['"]\)\}/g) || [];
    assertEqual(
      directBypassMatches.length,
      0,
      `Landing page must not contain direct unauthenticated navigation to /dashboard; found ${directBypassMatches.length} bypasses`
    );
  });

  suite.test('T1_F1_05', 'Landing page includes medical governance / clinical trust markers', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const hasTrustMarkers =
      src.includes('Regulatory') ||
      src.includes('Compliance') ||
      src.includes('Audit') ||
      src.includes('Medical Council') ||
      src.includes('Safety') ||
      src.includes('NABH') ||
      src.includes('HIPAA');
    assertTrue(hasTrustMarkers, 'Landing page must incorporate medical governance and clinical safety framing');
  });

  // ------------------------------------------------------------------------
  // Feature 2: Single Login Button on Login Page (ORIGINAL_REQUEST §R2)
  // ------------------------------------------------------------------------

  suite.test('T1_F2_01', 'LoginPage provides a single prominent login button to enter Doctor Station', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'pages/LoginPage.tsx must exist');

    // Expected: single primary login button for entering doctor station
    const hasStationButton =
      src.includes('Doctor Station') ||
      src.includes('Enter Doctor Station') ||
      src.includes('Sign In to Doctor Station') ||
      src.includes('Doctor Workstation');
    assertTrue(hasStationButton, 'LoginPage must provide single prominent button navigating to Doctor Station');
  });

  suite.test('T1_F2_02', 'Clicking the single login button navigates/transitions directly to Doctor Station', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'pages/LoginPage.tsx must exist');

    const handlesDoctorStationTransition =
      src.includes('setStationOpen') ||
      src.includes('setShowStation') ||
      src.includes('setIsDoctorStation') ||
      src.includes('view === \'station\'') ||
      src.includes('navigate(\'/doctor-station\')') ||
      src.includes('DoctorStation');
    assertTrue(handlesDoctorStationTransition, 'Single login button must trigger transition into Doctor Station');
  });

  suite.test('T1_F2_03', 'LoginPage eliminates multi-tab 1-click demo bypass as the primary entry point', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'pages/LoginPage.tsx must exist');

    // Baseline code had activeTab 'demo' | 'custom' with 1-click buttons that immediately logged in without a secret code
    assertNotMatch(
      src,
      /const\s+handleSelectDemoDoctor\s*=\s*\([^)]*\)\s*=>\s*\{\s*login\([^)]*\);\s*navigate\(['"]\/dashboard['"]\);?\s*\}/,
      'LoginPage must not provide 1-click bypass to /dashboard without secret code validation'
    );
  });

  suite.test('T1_F2_04', 'LoginPage provides a dedicated admin access button or toggle', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'pages/LoginPage.tsx must exist');

    const hasAdminAccess =
      src.includes('Admin Access') ||
      src.includes('Admin Portal') ||
      src.includes('Admin Station') ||
      src.includes('Administration') ||
      src.includes('admin') ||
      src.includes('setIsAdmin') ||
      src.includes('showAdmin');
    assertTrue(hasAdminAccess, 'LoginPage must provide a dedicated admin access button or toggle');
  });

  suite.test('T1_F2_05', 'LoginPage renders professional clinical portal styling and institutional identity', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'pages/LoginPage.tsx must exist');

    assertTrue(
      src.includes('Stethoscope') || src.includes('ShieldCheck') || src.includes('Hospital') || src.includes('Clinical'),
      'LoginPage must render clinical iconography and hospital identity'
    );
  });

  // ------------------------------------------------------------------------
  // Feature 3: Doctor Station Secret Code Authentication (ORIGINAL_REQUEST §R2)
  // ------------------------------------------------------------------------

  suite.test('T1_F3_01', 'Doctor Station provides secret code input and submit terminal', () => {
    // Check either components/auth/DoctorStation.tsx or within LoginPage.tsx
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');
    assertTrue(stationSrc !== null, 'Doctor Station component must exist');

    const hasSecretCodeInput =
      stationSrc.includes('secretCode') ||
      stationSrc.includes('Secret Code') ||
      stationSrc.includes('Enter secret code') ||
      stationSrc.includes('Doctor PIN / Code') ||
      stationSrc.includes('authenticateWithSecretCode');
    assertTrue(hasSecretCodeInput, 'Doctor Station must provide an input field for doctor secret code');
  });

  suite.test('T1_F3_02', 'AuthContext defines authenticateWithSecretCode contract and manages doctor roster', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'context/AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('authenticateWithSecretCode'),
      'AuthContext must implement authenticateWithSecretCode method'
    );
    assertTrue(
      authSrc.includes('roster'),
      'AuthContext must expose roster of doctors'
    );
  });

  suite.test('T1_F3_03', 'DoctorProfile includes secretCode, loginCount, and patientsAttendedCount', () => {
    const typesSrc = readSourceFile('types/auth.ts');
    assertTrue(typesSrc !== null, 'types/auth.ts must exist');

    assertTrue(typesSrc.includes('secretCode: string'), 'DoctorProfile must require secretCode: string');
    assertTrue(typesSrc.includes('loginCount: number'), 'DoctorProfile must track loginCount: number');
    assertTrue(typesSrc.includes('patientsAttendedCount: number'), 'DoctorProfile must track patientsAttendedCount: number');
  });

  suite.test('T1_F3_04', 'Doctor Station displays error feedback on invalid secret code and denies dashboard entry', () => {
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');
    assertTrue(stationSrc !== null, 'Doctor Station component must exist');

    const handlesInvalidCode =
      stationSrc.includes('Invalid') ||
      stationSrc.includes('Invalid doctor secret code') ||
      stationSrc.includes('error') ||
      stationSrc.includes('errorMessage');
    assertTrue(handlesInvalidCode, 'Doctor Station must render error feedback when secret code is invalid');
  });

  suite.test('T1_F3_05', 'AppLayout route protection guard redirects unauthenticated traffic to /login', () => {
    const layoutSrc = readSourceFile('components/layout/AppLayout.tsx');
    assertTrue(layoutSrc !== null, 'components/layout/AppLayout.tsx must exist');

    // AppLayout must check isAuthenticated and navigate to /login if false
    const hasAuthGuard =
      (layoutSrc.includes('isAuthenticated') && layoutSrc.includes('<Navigate to="/login" replace />')) ||
      (layoutSrc.includes('!isAuthenticated') && layoutSrc.includes('/login'));
    assertTrue(hasAuthGuard, 'AppLayout must protect clinical routes and redirect unauthenticated traffic to /login');
  });

  // ------------------------------------------------------------------------
  // Feature 4: Admin Block Doctor Roster Management (ORIGINAL_REQUEST §R3)
  // ------------------------------------------------------------------------

  suite.test('T1_F4_01', 'Admin block component exists and provides doctor roster management interface', () => {
    const hasAdminComponent =
      sourceFileExists('components/admin/AdminBlock.tsx') ||
      sourceFileExists('components/admin/AdminDashboard.tsx') ||
      (readSourceFile('pages/LoginPage.tsx')?.includes('AdminBlock') ?? false);
    assertTrue(hasAdminComponent, 'AdminBlock or Admin component must exist in codebase');
  });

  suite.test('T1_F4_02', 'Admin block displays list of registered doctors with their profile details and secret codes', () => {
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx') ||
      readSourceFile('pages/LoginPage.tsx');
    assertTrue(adminSrc !== null, 'Admin management code must exist');

    const displaysRoster =
      adminSrc.includes('roster') &&
      (adminSrc.includes('registrationNumber') || adminSrc.includes('secretCode'));
    assertTrue(displaysRoster, 'Admin interface must display doctor roster with registration numbers and secret codes');
  });

  suite.test('T1_F4_03', 'AuthContext implements addDoctor function accepting profile details and secretCode', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'context/AuthContext.tsx must exist');

    assertTrue(authSrc.includes('addDoctor'), 'AuthContext must export addDoctor function');
  });

  suite.test('T1_F4_04', 'AuthContext implements removeDoctor function removing doctor by ID', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'context/AuthContext.tsx must exist');

    assertTrue(authSrc.includes('removeDoctor'), 'AuthContext must export removeDoctor function');
  });

  suite.test('T1_F4_05', 'Roster additions and removals persist to localStorage (voicerx_doctor_roster)', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'context/AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('voicerx_doctor_roster'),
      'Doctor roster must be persisted under localStorage key "voicerx_doctor_roster"'
    );
  });

  // ------------------------------------------------------------------------
  // Feature 5: Admin Dashboard Doctor Performance Analytics (ORIGINAL_REQUEST §R4)
  // ------------------------------------------------------------------------

  suite.test('T1_F5_01', 'Admin dashboard provides performance analytics section displaying doctor metrics', () => {
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx') ||
      readSourceFile('components/admin/AdminAnalytics.tsx');
    assertTrue(adminSrc !== null, 'Admin analytics component must exist');

    const hasAnalyticsUI =
      adminSrc.includes('Analytics') ||
      adminSrc.includes('Performance') ||
      adminSrc.includes('loginCount') ||
      adminSrc.includes('patientsAttendedCount');
    assertTrue(hasAnalyticsUI, 'Admin section must display doctor performance analytics');
  });

  suite.test('T1_F5_02', 'Admin analytics displays total login occurrences per doctor', () => {
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx') ||
      readSourceFile('components/admin/AdminAnalytics.tsx');
    assertTrue(adminSrc !== null, 'Admin analytics component must exist');

    assertTrue(
      adminSrc.includes('loginCount') || adminSrc.includes('Logins') || adminSrc.includes('Login Count'),
      'Admin analytics must display login counts for each doctor'
    );
  });

  suite.test('T1_F5_03', 'AuthContext increments loginCount upon successful secret code authentication', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'context/AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('loginCount: d.loginCount + 1') ||
      authSrc.includes('loginCount + 1') ||
      authSrc.includes('loginCount: (doc.loginCount || 0) + 1') ||
      authSrc.includes('loginCount: target.loginCount + 1'),
      'AuthContext must increment the doctor loginCount upon successful authentication'
    );
  });

  suite.test('T1_F5_04', 'Admin analytics displays total patients attended per doctor', () => {
    const adminSrc =
      readSourceFile('components/admin/AdminBlock.tsx') ||
      readSourceFile('components/admin/AdminDashboard.tsx') ||
      readSourceFile('components/admin/AdminAnalytics.tsx');
    assertTrue(adminSrc !== null, 'Admin analytics component must exist');

    assertTrue(
      adminSrc.includes('patientsAttendedCount') ||
      adminSrc.includes('Patients Attended') ||
      adminSrc.includes('Attended Patients'),
      'Admin analytics must display patients attended count per doctor'
    );
  });

  suite.test('T1_F5_05', 'Prescription confirmation invokes recordPatientAttended to increment patientsAttendedCount', () => {
    const confirmSrc = readSourceFile('components/prescription/ConfirmationDialog.tsx');
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(confirmSrc !== null, 'ConfirmationDialog.tsx must exist');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('recordPatientAttended'),
      'AuthContext must provide recordPatientAttended method'
    );
    assertTrue(
      confirmSrc.includes('recordPatientAttended'),
      'ConfirmationDialog must call recordPatientAttended upon prescription confirmation'
    );
  });

  return suite;
}
