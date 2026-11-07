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
} from './harness.mjs';

export function createAdversarialLandingPageSuite() {
  const suite = new TestRunner('Adversarial Stress Test: LandingPage Clinical Compliance & Security Boundary');

  // =========================================================================
  // 1. Consumer Emojis & Playful Glyphs Adversarial Audit
  // =========================================================================

  suite.test('ADV_EMOJI_01', 'Verify complete absence of specific consumer emojis (💊, 🫄, 🫁, ✏️, 💉, ⚠️, 🌐)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const specificEmojis = ['💊', '🫄', '🫁', '✏️', '💉', '⚠️', '🌐'];
    for (const emoji of specificEmojis) {
      assertFalse(
        src.includes(emoji),
        `Found surviving forbidden consumer emoji: ${emoji}`
      );
    }
  });

  suite.test('ADV_EMOJI_02', 'Verify zero unicode characters from Miscellaneous Symbols and Pictographs (U+1F300 - U+1F5FF)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const regex = /[\u{1F300}-\u{1F5FF}]/u;
    assertNotMatch(src, regex, 'LandingPage.tsx must not contain any character from U+1F300-U+1F5FF');
  });

  suite.test('ADV_EMOJI_03', 'Verify zero unicode characters from Emoticons block (U+1F600 - U+1F64F)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const regex = /[\u{1F600}-\u{1F64F}]/u;
    assertNotMatch(src, regex, 'LandingPage.tsx must not contain any character from U+1F600-U+1F64F');
  });

  suite.test('ADV_EMOJI_04', 'Verify zero unicode characters from Transport and Map Symbols (U+1F680 - U+1F6FF)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const regex = /[\u{1F680}-\u{1F6FF}]/u;
    assertNotMatch(src, regex, 'LandingPage.tsx must not contain any character from U+1F680-U+1F6FF');
  });

  suite.test('ADV_EMOJI_05', 'Verify zero unicode characters from Supplemental Symbols and Pictographs (U+1F900 - U+1F9FF)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const regex = /[\u{1F900}-\u{1F9FF}]/u;
    assertNotMatch(src, regex, 'LandingPage.tsx must not contain any character from U+1F900-U+1F9FF');
  });

  suite.test('ADV_EMOJI_06', 'Verify zero unicode characters from Symbols and Pictographs Extended-A (U+1FA70 - U+1FAFF)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const regex = /[\u{1FA70}-\u{1FAFF}]/u;
    assertNotMatch(src, regex, 'LandingPage.tsx must not contain any character from U+1FA70-U+1FAFF');
  });

  suite.test('ADV_EMOJI_07', 'Verify zero emoji Dingbats (U+2700 - U+27BF) excluding accepted typographical characters', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Filter out standard typographical/math symbols if any, targeting emoji dingbats (pencils, checkmarks as emojis, scissors, etc.)
    const dingbatEmojiRegex = /[\u{2700}-\u{270E}\u{2710}-\u{2712}\u{2714}-\u{27BF}]/u;
    assertNotMatch(src, dingbatEmojiRegex, 'LandingPage.tsx must not contain dingbat emojis');
  });

  suite.test('ADV_EMOJI_08', 'Verify zero emoji Miscellaneous Symbols (U+2600 - U+26FF)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const miscEmojiRegex = /[\u{2600}-\u{26FF}]/u;
    assertNotMatch(src, miscEmojiRegex, 'LandingPage.tsx must not contain miscellaneous emoji symbols like ⚠️ or ⚡');
  });

  suite.test('ADV_EMOJI_09', 'Verify proper Lucide clinical icon imports replace casual graphics', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const expectedIcons = ['Stethoscope', 'Mic', 'ShieldCheck', 'FileText', 'Lock', 'Activity', 'UserCheck', 'Clock', 'Hospital'];
    for (const icon of expectedIcons) {
      assertTrue(src.includes(icon), `LandingPage.tsx should import and render Lucide icon: ${icon}`);
    }
  });

  // =========================================================================
  // 2. Dark SaaS & Neon Gradient Tokens Adversarial Audit
  // =========================================================================

  suite.test('ADV_DARK_01', 'Verify complete absence of dark SaaS background bg-slate-900 on root or primary containers', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Root background must NOT be bg-slate-900
    assertNotMatch(
      src,
      /<div\s+className=["'][^"']*bg-slate-900[^"']*min-h-screen/,
      'Root element must not use dark SaaS bg-slate-900'
    );

    // Section backgrounds must NOT be bg-slate-900
    assertNotMatch(
      src,
      /<section[^>]*className=["'][^"']*bg-slate-900/,
      'No section element may use dark SaaS bg-slate-900'
    );
  });

  suite.test('ADV_DARK_02', 'Verify complete absence of dark SaaS hex code bg-[#0B1120] or variants', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertNotMatch(src, /bg-\[\s*#0[bB]1120\s*\]/, 'Forbidden dark background bg-[#0B1120] found');
    assertNotMatch(src, /#0[bB]1120/, 'Dark SaaS background color #0B1120 found in source');
  });

  suite.test('ADV_DARK_03', 'Verify complete absence of neon blur balls and blur-[120px] tokens', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertNotMatch(src, /blur-\[\s*120px\s*\]/, 'Forbidden neon blur ball token blur-[120px] found');
    assertNotMatch(src, /blur-\[\s*\d+px\s*\]/, 'Arbitrary neon blur tokens found');
    assertNotMatch(src, /rounded-full\s+bg-purple/, 'Neon purple background blur orb found');
    assertNotMatch(src, /rounded-full\s+bg-blue-500\/10.*blur/, 'Dark SaaS glowing blur ball found');
  });

  suite.test('ADV_DARK_04', 'Verify complete absence of saturated neon gradients (purple/pink/cyan)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertNotMatch(src, /from-purple-/, 'Found neon gradient token from-purple-');
    assertNotMatch(src, /to-pink-/, 'Found neon gradient token to-pink-');
    assertNotMatch(src, /via-pink-/, 'Found neon gradient token via-pink-');
    assertNotMatch(src, /from-cyan-/, 'Found neon gradient token from-cyan-');
  });

  suite.test('ADV_DARK_05', 'Verify complete absence of dark SaaS borders (border-slate-800, border-slate-700)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertNotMatch(src, /border-slate-800/, 'Found dark SaaS border-slate-800');
    assertNotMatch(src, /border-slate-700/, 'Found dark SaaS border-slate-700');
  });

  // =========================================================================
  // 3. Marketing Buzzword Badges & Consumer Copy Adversarial Audit
  // =========================================================================

  suite.test('ADV_MKTG_01', 'Verify complete absence of <Sparkles /> icon and import', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertNotMatch(src, /<Sparkles\s*\/?>/, 'Marketing buzzword component <Sparkles /> found');
    assertNotMatch(src, /\bSparkles\b/, 'Sparkles icon reference found in LandingPage.tsx');
  });

  suite.test('ADV_MKTG_02', 'Verify absence of consumer hype and tech buzzwords in copy', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const hypeWords = [
      /\bmagic\b/i,
      /\bmiracle\b/i,
      /\bsupercharge\b/i,
      /\b10x\b/i,
      /\bblazing fast\b/i,
      /\bgame changer\b/i,
      /\brevolutionary AI\b/i,
    ];

    for (const wordRegex of hypeWords) {
      assertNotMatch(src, wordRegex, `Found consumer marketing buzzword matching ${wordRegex}`);
    }
  });

  suite.test('ADV_MKTG_03', 'Verify clinical, hospital outpatient terminology is used throughout', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const clinicalTerms = [
      'Ambient',
      'Outpatient',
      'CDSCO',
      'Pharmacopoeia',
      'Formulary',
      'ICD-10',
      'Physician',
      'Deterministic',
      'Audit',
    ];

    for (const term of clinicalTerms) {
      assertTrue(src.includes(term), `LandingPage.tsx must feature clinical term: ${term}`);
    }
  });

  // =========================================================================
  // 4. Clinical Design System Palette & Structure
  // =========================================================================

  suite.test('ADV_PALETTE_01', 'Verify root container adopts clinical palette: bg-slate-50 text-slate-900', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertMatch(
      src,
      /<div\s+className=["'][^"']*bg-slate-50[^"']*text-slate-900[^"']*min-h-screen/,
      'Root element must have bg-slate-50 text-slate-900 and min-h-screen'
    );
  });

  suite.test('ADV_PALETTE_02', 'Verify header adheres to clean clinical aesthetic (bg-white/95, border-b border-slate-200)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertMatch(
      src,
      /<header\s+className=["'][^"']*bg-white\/95[^"']*border-b\s+border-slate-200/,
      'Header must be styled with clean white background and subtle slate-200 border'
    );
  });

  suite.test('ADV_PALETTE_03', 'Verify hero section uses clean white background with subtle border', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertMatch(
      src,
      /<section\s+className=["'][^"']*bg-white[^"']*border-b\s+border-slate-200/,
      'Hero section must use clean white background with border-slate-200'
    );
  });

  suite.test('ADV_PALETTE_04', 'Verify metrics cards use white card background with subtle borders (bg-white border-slate-200)', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertMatch(
      src,
      /bg-white\s+border\s+border-slate-200\s+shadow-xs/,
      'Metric cards must use clean white cards with border-slate-200 and shadow-xs'
    );
  });

  suite.test('ADV_PALETTE_05', 'Verify medical blue accents (bg-blue-600, text-blue-700, bg-blue-50) are prominently used', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    assertTrue(src.includes('bg-blue-600'), 'Should use primary medical blue button styling (bg-blue-600)');
    assertTrue(src.includes('text-blue-700') || src.includes('text-blue-600'), 'Should use medical blue text highlights');
    assertTrue(src.includes('bg-blue-50'), 'Should use medical blue subtle backgrounds (bg-blue-50)');
    assertTrue(src.includes('border-blue-200'), 'Should use medical blue subtle borders (border-blue-200)');
  });

  // =========================================================================
  // 5. Routing & Unauthenticated Security Boundaries
  // =========================================================================

  suite.test('ADV_ROUTE_01', 'Verify unauthenticated CTA buttons route to /login and NOT directly to /dashboard', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // In handleLaunchWorkspace: if not authenticated, navigate('/login')
    assertMatch(
      src,
      /if\s*\(\s*isAuthenticated\s*\)\s*\{\s*navigate\(['"]\/dashboard['"]\);\s*\}\s*else\s*\{\s*navigate\(['"]\/login['"]\);\s*\}/,
      'handleLaunchWorkspace must route unauthenticated users to /login'
    );

    // handleLogin must navigate to /login
    assertMatch(
      src,
      /const\s+handleLogin\s*=\s*\(\)\s*=>\s*\{\s*navigate\(['"]\/login['"]\);\s*\}/,
      'handleLogin must route to /login'
    );
  });

  suite.test('ADV_ROUTE_02', 'Verify zero unauthenticated inline navigation to /dashboard', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    // Check every occurrence of navigate('/dashboard')
    const matches = [...src.matchAll(/navigate\(['"]\/dashboard['"]\)/g)];
    assertEqual(
      matches.length,
      1,
      `navigate('/dashboard') must only appear exactly once (inside guarded handleLaunchWorkspace)`
    );
  });

  suite.test('ADV_ROUTE_03', 'Verify all internal scroll anchor IDs exist in the DOM structure', () => {
    const src = readSourceFile('pages/LandingPage.tsx');
    assertTrue(src !== null, 'pages/LandingPage.tsx must exist');

    const targetSections = ['features', 'workflow', 'scenarios', 'safety'];
    for (const sectionId of targetSections) {
      assertTrue(
        src.includes(`id="${sectionId}"`),
        `LandingPage.tsx must have a corresponding section with id="${sectionId}"`
      );
    }
  });

  return suite;
}

// Direct execution support
if (process.argv[1]?.endsWith('adversarial_landing_page.test.mjs')) {
  const suite = createAdversarialLandingPageSuite();
  suite.run().then((summary) => {
    if (summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}
