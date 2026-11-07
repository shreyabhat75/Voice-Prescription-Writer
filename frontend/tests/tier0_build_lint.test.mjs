import { TestRunner, assertTrue, assertEqual, runShell } from './harness.mjs';

export function createTier0Suite() {
  const suite = new TestRunner('Tier 0: Compilation & Linting Integrity');

  suite.test('T0_BUILD_01', 'Frontend production build passes cleanly with 0 errors', () => {
    const res = runShell('npm run build');
    if (!res.success) {
      throw new Error(`Build failed with exit code ${res.exitCode}:\n${res.stderr || res.stdout}`);
    }
    assertEqual(res.exitCode, 0, 'Build command must exit with code 0');
    assertTrue(res.stdout.includes('built in') || res.stdout.includes('dist'), 'Build output must confirm artifacts were produced');
  });

  suite.test('T0_LINT_01', 'Frontend ESLint check passes cleanly with 0 violations', () => {
    const res = runShell('npm run lint');
    if (!res.success) {
      throw new Error(`Lint failed with exit code ${res.exitCode}:\n${res.stderr || res.stdout}`);
    }
    assertEqual(res.exitCode, 0, 'ESLint must exit with code 0');
  });

  return suite;
}
