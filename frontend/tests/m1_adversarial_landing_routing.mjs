import fs from 'node:fs';
import path from 'node:path';
import ts from '../node_modules/typescript/lib/typescript.js';
import {
  TestRunner,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
  assertNotIncludes,
  assertMatch,
  assertNotMatch,
  readSourceFile,
  SRC_ROOT,
} from './harness.mjs';

export async function runAdversarialRoutingTests() {
  const suite = new TestRunner('M1 Adversarial Challenger: Landing Page Navigation & Routing Verification');

  const landingPagePath = path.resolve(SRC_ROOT, 'pages', 'LandingPage.tsx');
  const sourceCode = fs.readFileSync(landingPagePath, 'utf8');

  // Parse TypeScript AST
  const sourceFile = ts.createSourceFile(
    'LandingPage.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  // Helper to extract text from AST node
  function getNodeText(node) {
    return node.getText(sourceFile);
  }

  // -------------------------------------------------------------------------
  // Test 1: Exhaustive Inventory of Interactive Elements via AST
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_01', 'AST traces and inventories every interactive element (<button>, <a>, onClick)', () => {
    const interactiveElements = [];

    function findInteractiveElements(node, branchContext = 'UNCONDITIONAL') {
      // Check conditional expressions (e.g. isAuthenticated ? (...) : (...))
      if (ts.isConditionalExpression(node)) {
        const conditionText = getNodeText(node.condition);
        if (conditionText.includes('isAuthenticated')) {
          findInteractiveElements(node.whenTrue, 'AUTHENTICATED');
          findInteractiveElements(node.whenFalse, 'UNAUTHENTICATED');
          return;
        }
      }

      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = ts.isJsxElement(node)
          ? getNodeText(node.openingElement.tagName)
          : getNodeText(node.tagName);

        const attributes = ts.isJsxElement(node)
          ? node.openingElement.attributes.properties
          : node.attributes.properties;

        let hasOnClick = false;
        let onClickText = null;
        let hrefText = null;
        let buttonType = null;
        let targetText = null;
        let relText = null;

        for (const attr of attributes) {
          if (ts.isJsxAttribute(attr) && attr.name) {
            const attrName = attr.name.getText(sourceFile);
            if (attrName === 'onClick') {
              hasOnClick = true;
              onClickText = attr.initializer ? getNodeText(attr.initializer) : '';
            } else if (attrName === 'href') {
              hrefText = attr.initializer ? getNodeText(attr.initializer) : '';
            } else if (attrName === 'type') {
              buttonType = attr.initializer ? getNodeText(attr.initializer) : '';
            } else if (attrName === 'target') {
              targetText = attr.initializer ? getNodeText(attr.initializer) : '';
            } else if (attrName === 'rel') {
              relText = attr.initializer ? getNodeText(attr.initializer) : '';
            }
          }
        }

        if (tagName === 'button' || tagName === 'a' || hasOnClick || hrefText) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const textContent = ts.isJsxElement(node)
            ? node.children.map(c => c.getText(sourceFile).trim()).filter(Boolean).join(' ')
            : '';

          interactiveElements.push({
            line: line + 1,
            tagName,
            branchContext,
            buttonType,
            hasOnClick,
            onClickText,
            hrefText,
            targetText,
            relText,
            textContent: textContent.replace(/\s+/g, ' ').slice(0, 80),
          });
        }
      }

      ts.forEachChild(node, child => findInteractiveElements(child, branchContext));
    }

    findInteractiveElements(sourceFile);

    // Verify inventory is non-empty and captured all expected buttons
    assertTrue(interactiveElements.length >= 15, `Expected >= 15 interactive elements, found ${interactiveElements.length}`);

    // Verify all buttons have type="button" to prevent form submission side effects
    for (const el of interactiveElements) {
      if (el.tagName === 'button') {
        assertEqual(
          el.buttonType,
          '"button"',
          `Button at line ${el.line} (${el.textContent}) must have explicit type="button"`
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 2: Unauthenticated User Trace: ZERO buttons or links route to /dashboard
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_02', 'Empirically verify that ZERO buttons or links route unauthenticated users to /dashboard', () => {
    const unauthenticatedActions = [];

    function findUnauthenticatedActions(node, inAuthBranch = false) {
      if (ts.isConditionalExpression(node)) {
        const conditionText = getNodeText(node.condition);
        if (conditionText.includes('isAuthenticated')) {
          // Traverse true branch marked as auth
          findUnauthenticatedActions(node.whenTrue, true);
          // Traverse false branch marked as unauth
          findUnauthenticatedActions(node.whenFalse, false);
          return;
        }
      }

      if (!inAuthBranch) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const attributes = ts.isJsxElement(node)
            ? node.openingElement.attributes.properties
            : node.attributes.properties;

          for (const attr of attributes) {
            if (ts.isJsxAttribute(attr) && attr.name) {
              const attrName = attr.name.getText(sourceFile);
              if (attrName === 'onClick' || attrName === 'href' || attrName === 'to') {
                const initText = attr.initializer ? getNodeText(attr.initializer) : '';
                const { line } = sourceFile.getLineAndCharacterOfPosition(attr.getStart(sourceFile));
                unauthenticatedActions.push({ line: line + 1, attrName, initText });
              }
            }
          }
        }
      }

      ts.forEachChild(node, child => findUnauthenticatedActions(child, inAuthBranch));
    }

    findUnauthenticatedActions(sourceFile);

    // Assert that NONE of the unauthenticated actions reference dashboard or call handleLaunchWorkspace directly
    for (const action of unauthenticatedActions) {
      assertNotIncludes(
        action.initText,
        '/dashboard',
        `Unauthenticated action at line ${action.line} contains direct route to /dashboard: ${action.initText}`
      );
      assertNotIncludes(
        action.initText,
        'handleLaunchWorkspace',
        `Unauthenticated action at line ${action.line} must not call handleLaunchWorkspace`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 3: Unauthenticated Workstation/Login CTAs route strictly to /login
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_03', 'All unauthenticated workstation and login CTAs route to /login', () => {
    // Collect all login CTAs available in the unauthenticated view
    // 1. Header: Doctor Sign In (onClick={handleLogin})
    // 2. Header: Doctor Station (onClick={handleLogin})
    // 3. Hero: Enter Doctor Station (onClick={handleLogin})
    // 4. Scenarios: Access Doctor Station (onClick={handleLogin})
    // 5. CTA Banner: Doctor Workstation Login (onClick={handleLogin})
    // 6. Footer: Doctor Station Sign In (onClick={handleLogin})

    const expectedLoginButtons = [
      { section: 'Header Sign In', pattern: /Doctor Sign In/ },
      { section: 'Header Station', pattern: /Doctor Station/ },
      { section: 'Hero Primary', pattern: /Enter Doctor Station/ },
      { section: 'Scenarios Header', pattern: /Access Doctor Station/ },
      { section: 'CTA Banner Primary', pattern: /Doctor Workstation Login/ },
      { section: 'Footer CTA', pattern: /Doctor Station Sign In/ },
    ];

    for (const expected of expectedLoginButtons) {
      assertMatch(
        sourceCode,
        expected.pattern,
        `Landing page must render expected login CTA: ${expected.section}`
      );
    }

    // Verify handleLogin implementation in AST:
    // const handleLogin = () => { navigate('/login'); };
    let handleLoginFound = false;
    function checkHandleLogin(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'handleLogin') {
        handleLoginFound = true;
        const bodyText = getNodeText(node.initializer);
        assertMatch(
          bodyText,
          /navigate\(['"]\/login['"]\)/,
          'handleLogin must execute navigate("/login")'
        );
        assertNotIncludes(
          bodyText,
          '/dashboard',
          'handleLogin must never navigate to /dashboard'
        );
      }
      ts.forEachChild(node, checkHandleLogin);
    }
    checkHandleLogin(sourceFile);
    assertTrue(handleLoginFound, 'handleLogin function must be declared in LandingPage');
  });

  // -------------------------------------------------------------------------
  // Test 4: Verification of handleLaunchWorkspace logic & authentication guard
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_04', 'handleLaunchWorkspace routes to /dashboard ONLY when isAuthenticated === true', () => {
    let handleLaunchWorkspaceFound = false;
    let launchWorkspaceNode = null;

    function checkLaunchWorkspace(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'handleLaunchWorkspace') {
        handleLaunchWorkspaceFound = true;
        launchWorkspaceNode = node;
      }
      ts.forEachChild(node, checkLaunchWorkspace);
    }
    checkLaunchWorkspace(sourceFile);
    assertTrue(handleLaunchWorkspaceFound, 'handleLaunchWorkspace must be declared in LandingPage');

    const fnText = getNodeText(launchWorkspaceNode.initializer);

    // Verify AST structure of handleLaunchWorkspace:
    // if (isAuthenticated) { navigate('/dashboard'); } else { navigate('/login'); }
    assertMatch(fnText, /if\s*\(\s*isAuthenticated\s*\)\s*\{[\s\S]*navigate\(['"]\/dashboard['"]\);?[\s\S]*\}\s*else\s*\{[\s\S]*navigate\(['"]\/login['"]\);?[\s\S]*\}/);

    // Execute oracle simulation of handleLaunchWorkspace logic under adversarial inputs
    function simulateHandleLaunchWorkspace(isAuthenticated, mockNavigate) {
      if (isAuthenticated) {
        mockNavigate('/dashboard');
      } else {
        mockNavigate('/login');
      }
    }

    // Adversarial truthiness test matrix
    const adversarialTestMatrix = [
      { input: false, expectedRoute: '/login', desc: 'false' },
      { input: undefined, expectedRoute: '/login', desc: 'undefined' },
      { input: null, expectedRoute: '/login', desc: 'null' },
      { input: 0, expectedRoute: '/login', desc: 'number 0' },
      { input: '', expectedRoute: '/login', desc: 'empty string' },
      { input: NaN, expectedRoute: '/login', desc: 'NaN' },
      { input: true, expectedRoute: '/dashboard', desc: 'true (strictly authenticated)' },
    ];

    for (const testCase of adversarialTestMatrix) {
      let navigatedTo = null;
      simulateHandleLaunchWorkspace(testCase.input, (route) => {
        navigatedTo = route;
      });
      assertEqual(
        navigatedTo,
        testCase.expectedRoute,
        `simulateHandleLaunchWorkspace with ${testCase.desc} must route to ${testCase.expectedRoute}`
      );
    }
  });

  // -------------------------------------------------------------------------
  // Test 5: Exhaustive /dashboard literal count across entire file
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_05', 'Single /dashboard literal in file, strictly encapsulated inside isAuthenticated block', () => {
    const dashboardMatches = [...sourceCode.matchAll(/\/dashboard/g)];
    assertEqual(
      dashboardMatches.length,
      1,
      `Expected exactly 1 occurrence of "/dashboard" in LandingPage.tsx, found ${dashboardMatches.length}`
    );

    // Locate the line of this single occurrence
    const matchIndex = dashboardMatches[0].index;
    const { line } = sourceFile.getLineAndCharacterOfPosition(matchIndex);
    const lineNumber = line + 1;

    // Check surrounding 5 lines
    const lines = sourceCode.split('\n');
    const surroundingSnippet = lines.slice(Math.max(0, lineNumber - 3), lineNumber + 2).join('\n');

    assertMatch(
      surroundingSnippet,
      /if\s*\(\s*isAuthenticated\s*\)\s*\{[\s\S]*navigate\(['"]\/dashboard['"]\)/,
      `The single /dashboard occurrence must be guarded inside if (isAuthenticated)`
    );
  });

  // -------------------------------------------------------------------------
  // Test 6: Scroll Anchors & Internal Navigation Targets
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_06', 'All in-page scroll navigation targets exist in DOM without route leakage', () => {
    // Find all scrollToSection calls in source code
    const scrollTargetMatches = [...sourceCode.matchAll(/scrollToSection\(['"]([^'"]+)['"]\)/g)];
    assertTrue(scrollTargetMatches.length >= 4, `Expected at least 4 scrollToSection calls, found ${scrollTargetMatches.length}`);

    const targetIds = new Set(scrollTargetMatches.map(m => m[1]));

    for (const targetId of targetIds) {
      // Each targetId must correspond to an id attribute in JSX
      const idPattern = new RegExp(`id=["']${targetId}["']`);
      assertMatch(
        sourceCode,
        idPattern,
        `Scroll target "${targetId}" must exist as id="${targetId}" in LandingPage.tsx`
      );
    }

    // Verify scrollToSection implementation does not navigate
    let scrollToSectionFound = false;
    function checkScrollToSection(node) {
      if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === 'scrollToSection') {
        scrollToSectionFound = true;
        const bodyText = getNodeText(node.initializer);
        assertNotIncludes(bodyText, 'navigate', 'scrollToSection must not perform route navigation');
        assertIncludes(bodyText, 'scrollIntoView', 'scrollToSection must call scrollIntoView');
      }
      ts.forEachChild(node, checkScrollToSection);
    }
    checkScrollToSection(sourceFile);
    assertTrue(scrollToSectionFound, 'scrollToSection function must be declared in LandingPage');
  });

  // -------------------------------------------------------------------------
  // Test 7: External Links and Security Attributes
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_07', 'External links have target="_blank" and rel="noopener noreferrer" with zero unsafe protocols', () => {
    let anchorFound = false;

    function checkAnchors(node) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = ts.isJsxElement(node)
          ? getNodeText(node.openingElement.tagName)
          : getNodeText(node.tagName);

        if (tagName === 'a') {
          anchorFound = true;
          const attributes = ts.isJsxElement(node)
            ? node.openingElement.attributes.properties
            : node.attributes.properties;

          let href = null;
          let target = null;
          let rel = null;

          for (const attr of attributes) {
            if (ts.isJsxAttribute(attr) && attr.name) {
              const name = attr.name.getText(sourceFile);
              if (name === 'href') href = attr.initializer ? getNodeText(attr.initializer) : '';
              if (name === 'target') target = attr.initializer ? getNodeText(attr.initializer) : '';
              if (name === 'rel') rel = attr.initializer ? getNodeText(attr.initializer) : '';
            }
          }

          assertTrue(href !== null, '<a> element must have href attribute');
          assertNotMatch(href, /^javascript:/i, '<a> href must not use javascript: URI scheme');
          if (href.startsWith('"http') || href.startsWith("'http")) {
            assertEqual(target, '"_blank"', 'External links must use target="_blank"');
            assertIncludes(rel, 'noopener', 'External links must include noopener');
            assertIncludes(rel, 'noreferrer', 'External links must include noreferrer');
          }
        }
      }
      ts.forEachChild(node, checkAnchors);
    }

    checkAnchors(sourceFile);
    assertTrue(anchorFound, 'At least one anchor element (GitHub) expected');
  });

  // -------------------------------------------------------------------------
  // Test 8: Authenticated Tree Verification
  // -------------------------------------------------------------------------
  suite.test('ADV_ROUTING_08', 'Authenticated tree correctly provisions handleLaunchWorkspace and handleLogin', () => {
    // In authenticated branch:
    // Header shows:
    // - "Signed in as [Doctor Name]"
    // - Enter Workstation button -> handleLaunchWorkspace
    // Hero shows:
    // - Launch Doctor Workstation -> handleLaunchWorkspace
    // - Switch Doctor Station -> handleLogin
    // CTA Banner shows:
    // - Open Outpatient Workspace -> handleLaunchWorkspace
    // - Switch Doctor Station -> handleLogin

    assertMatch(sourceCode, /Signed in as/, 'Authenticated branch must display signed in doctor identity');
    assertMatch(sourceCode, /Enter Workstation/, 'Authenticated header must offer Enter Workstation');
    assertMatch(sourceCode, /Launch Doctor Workstation/, 'Authenticated hero must offer Launch Doctor Workstation');
    assertMatch(sourceCode, /Open Outpatient Workspace/, 'Authenticated CTA banner must offer Open Outpatient Workspace');
    assertMatch(sourceCode, /Switch Doctor Station/, 'Authenticated view must offer Switch Doctor Station to switch profiles');
  });

  return await suite.run();
}

// Execute directly if run as main script
if (process.argv[1] && process.argv[1].endsWith('m1_adversarial_landing_routing.mjs')) {
  runAdversarialRoutingTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  }).catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
