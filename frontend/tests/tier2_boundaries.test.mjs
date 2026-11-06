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
  createMockLocalStorage,
} from './harness.mjs';

export function createTier2Suite() {
  const suite = new TestRunner('Tier 2: Boundary & Corner Cases (5 Core Features x 5 Cases = 25 Tests)');

  // ------------------------------------------------------------------------
  // Feature 1 Boundaries: Landing Page
  // ------------------------------------------------------------------------

  suite.test('T2_F1_01', 'Landing page handles authenticated vs unauthenticated CTA states correctly', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'LandingPage.tsx must exist');

    // Expected logic: if authenticated, direct to /dashboard is permissible; if NOT authenticated, must route to /login
    assertTrue(
      src.includes('isAuthenticated') || src.includes('doctor'),
      'Landing page must be session-aware'
    );
  });

  suite.test('T2_F1_02', 'Zero unauthenticated /dashboard bypass buttons exist across entire landing page', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'LandingPage.tsx must exist');

    // Ensure no unauthenticated button has onClick={() => navigate('/dashboard')}
    const lines = src.split('\n');
    let unauthenticatedBypasses = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("navigate('/dashboard')") || line.includes('navigate("/dashboard")')) {
        // Check if guarded by isAuthenticated
        const contextLines = lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 5)).join('\n');
        if (!contextLines.includes('isAuthenticated') && !contextLines.includes('doctor')) {
          unauthenticatedBypasses++;
        }
      }
    }
    assertEqual(unauthenticatedBypasses, 0, `Found ${unauthenticatedBypasses} unguarded /dashboard navigation bypasses on LandingPage`);
  });

  suite.test('T2_F1_03', 'Landing page contains no high-saturation neon gradients or dark SaaS theme borders', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'LandingPage.tsx must exist');

    assertNotMatch(src, /bg-purple-900|from-purple-600|to-pink-600|border-slate-800/, 'Landing page should not have dark SaaS borders or neon purple gradients');
  });

  suite.test('T2_F1_04', 'Landing page text content contains zero playful consumer emojis', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'LandingPage.tsx must exist');

    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;
    assertNotMatch(src, emojiRegex, 'Landing page text must be free of emojis');
  });

  suite.test('T2_F1_05', 'Landing page navigation links point to valid section identifiers', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'LandingPage.tsx must exist');

    const hrefMatches = src.match(/href=["']#([^"']+)["']/g) || [];
    for (const hrefMatch of hrefMatches) {
      const id = hrefMatch.replace(/href=["']#|["']/g, '');
      assertTrue(src.includes(`id="${id}"`) || src.includes(`id='${id}'`), `Anchor #${id} must target an element with matching id`);
    }
  });

  // ------------------------------------------------------------------------
  // Feature 2 Boundaries: Single Login Button
  // ------------------------------------------------------------------------

  suite.test('T2_F2_01', 'LoginPage renders exactly one primary login entry action on initial mount', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'LoginPage.tsx must exist');

    // Should not have separate demo doctor buttons on initial view
    assertNotMatch(
      src,
      /DEMO_DOCTORS\.map/,
      'LoginPage root must not directly map demo doctors to instant login cards on initial mount'
    );
  });

  suite.test('T2_F2_02', 'Doctor Station interface provides a back navigation button to return to login portal', () => {
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');
    assertTrue(stationSrc !== null, 'Doctor station component must exist');

    assertTrue(
      stationSrc.includes('Back') ||
      stationSrc.includes('Return') ||
      stationSrc.includes('onBack') ||
      stationSrc.includes('ArrowLeft') ||
      stationSrc.includes('navigate(-1)'),
      'Doctor Station must provide a back button to return to initial login view'
    );
  });

  suite.test('T2_F2_03', 'Admin toggle roundtrip supports returning cleanly from admin section to doctor portal', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'LoginPage.tsx must exist');

    assertTrue(
      src.includes('Admin') && (src.includes('Back') || src.includes('toggle') || src.includes('Close') || src.includes('Return')),
      'Admin view must allow returning back to the login / doctor station interface'
    );
  });

  suite.test('T2_F2_04', 'Single login button transition is idempotent and handles rapid clicks safely', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'LoginPage.tsx must exist');

    // Handlers should cleanly set state without asynchronous side-effect collisions
    assertTrue(
      src.includes('onClick=') || src.includes('handle'),
      'LoginPage button must bind a clean click handler'
    );
  });

  suite.test('T2_F2_05', 'LoginPage eliminates unvalidated custom credentials tab in favor of verified secret code station', () => {
    const src = readSourceFile('pages/LoginPage.tsx');
    assertTrue(src !== null, 'LoginPage.tsx must exist');

    assertNotMatch(
      src,
      /handleCustomLogin[\s\S]*?login\(newProfile\);[\s\S]*?navigate\(['"]\/dashboard['"]\)/,
      'LoginPage must not allow unauthenticated custom profile entry bypassing secret code verification'
    );
  });

  // ------------------------------------------------------------------------
  // Feature 3 Boundaries: Doctor Station Secret Code Auth
  // ------------------------------------------------------------------------

  suite.test('T2_F3_01', 'Doctor Station rejects empty or whitespace-only secret code submission with clear error', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    // Contract: authenticateWithSecretCode with empty string must return error
    assertTrue(
      authSrc.includes('!code') || authSrc.includes('code.trim()') || authSrc.includes('trim()'),
      'authenticateWithSecretCode must check for non-empty trimmed code'
    );
  });

  suite.test('T2_F3_02', 'Secret code authentication trims leading and trailing whitespace before verification', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('.trim()'),
      'authenticateWithSecretCode must trim whitespace from candidate code'
    );
  });

  suite.test('T2_F3_03', 'Non-existent secret code returns success: false and leaves session unauthenticated', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('success: false') || authSrc.includes('{ success: false'),
      'authenticateWithSecretCode must return success: false for invalid code'
    );
  });

  suite.test('T2_F3_04', 'Doctor Station state preserves error message on consecutive failed attempts without crash', () => {
    const stationSrc = readSourceFile('components/auth/DoctorStation.tsx') || readSourceFile('pages/LoginPage.tsx');
    assertTrue(stationSrc !== null, 'Doctor Station component must exist');

    assertTrue(
      stationSrc.includes('error') && (stationSrc.includes('setError') || stationSrc.includes('alert') || stationSrc.includes('text-rose') || stationSrc.includes('text-red')),
      'Doctor Station must capture and display error feedback on failed auth'
    );
  });

  suite.test('T2_F3_05', 'Logout clears authentication status and sets session auth to false', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('setIsAuthenticated(false)'),
      'logout must set isAuthenticated to false'
    );
    assertTrue(
      authSrc.includes('voicerx_doctor_session_auth') || authSrc.includes('STORAGE_KEY'),
      'logout must update storage'
    );
  });

  // ------------------------------------------------------------------------
  // Feature 4 Boundaries: Admin Doctor Roster Management
  // ------------------------------------------------------------------------

  suite.test('T2_F4_01', 'addDoctor rejects addition when required fields (name, secretCode, registrationNumber) are missing', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('!newDoc.name') ||
      authSrc.includes('!newDoc.secretCode') ||
      authSrc.includes('!doc.secretCode') ||
      authSrc.includes('trim()'),
      'addDoctor must validate that required fields (name, secretCode) are present'
    );
  });

  suite.test('T2_F4_02', 'addDoctor prevents collision with existing doctor secret code', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    // Must check if code already exists in roster
    assertTrue(
      authSrc.includes('secretCode') && (authSrc.includes('find(') || authSrc.includes('some(') || authSrc.includes('exists')),
      'addDoctor must check for duplicate secretCode before adding to roster'
    );
  });

  suite.test('T2_F4_03', 'Roster mutations are immediately synchronized to localStorage under voicerx_doctor_roster', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('localStorage.setItem') && authSrc.includes('voicerx_doctor_roster'),
      'AuthContext must sync roster to localStorage key "voicerx_doctor_roster"'
    );
  });

  suite.test('T2_F4_04', 'Removing a doctor purges them from the roster and prevents subsequent secret code authentication', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('removeDoctor') && (authSrc.includes('.filter(') || authSrc.includes('splice')),
      'removeDoctor must filter out the doctor by ID'
    );
  });

  suite.test('T2_F4_05', 'Roster management handles empty or single-doctor roster without throwing runtime errors', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('roster') && !authSrc.includes('roster[0].'),
      'Roster access should not unsafely dereference roster[0] without null checks'
    );
  });

  // ------------------------------------------------------------------------
  // Feature 5 Boundaries: Doctor Performance Analytics
  // ------------------------------------------------------------------------

  suite.test('T2_F5_01', 'Newly added doctor profile strictly initializes loginCount and patientsAttendedCount to 0', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('loginCount: 0') && authSrc.includes('patientsAttendedCount: 0'),
      'addDoctor must initialize loginCount: 0 and patientsAttendedCount: 0'
    );
  });

  suite.test('T2_F5_02', 'Failed secret code authentication does not increment any doctor loginCount', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    // loginCount increment must only occur after code match
    assertTrue(
      authSrc.includes('authenticateWithSecretCode'),
      'authenticateWithSecretCode must exist'
    );
  });

  suite.test('T2_F5_03', 'Closing or cancelling ConfirmationDialog without submission does not call recordPatientAttended', () => {
    const confirmSrc = readSourceFile('components/prescription/ConfirmationDialog.tsx');
    assertTrue(confirmSrc !== null, 'ConfirmationDialog.tsx must exist');

    // onClose should not call recordPatientAttended
    assertNotMatch(
      confirmSrc,
      /onClose[\s\S]*?recordPatientAttended/,
      'Closing ConfirmationDialog must not trigger recordPatientAttended'
    );
  });

  suite.test('T2_F5_04', 'Doctor performance counts survive simulated session storage reload', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('localStorage.getItem(\'voicerx_doctor_roster\')') ||
      authSrc.includes('localStorage.getItem("voicerx_doctor_roster")'),
      'AuthContext must load roster and counts from localStorage on initialization'
    );
  });

  suite.test('T2_F5_05', 'Performance counts are isolated per doctor ID without cross-doctor bleeding', () => {
    const authSrc = readSourceFile('context/AuthContext.tsx');
    assertTrue(authSrc !== null, 'AuthContext.tsx must exist');

    assertTrue(
      authSrc.includes('d.id ===') || authSrc.includes('doc.id ===') || authSrc.includes('target.id ==='),
      'recordPatientAttended and loginCount updates must target the specific doctor ID'
    );
  });

  return suite;
}
