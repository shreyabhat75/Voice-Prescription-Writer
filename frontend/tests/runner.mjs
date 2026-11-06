import { createTier0Suite } from './tier0_build_lint.test.mjs';
import { createTier1Suite } from './tier1_features.test.mjs';
import { createTier2Suite } from './tier2_boundaries.test.mjs';
import { createTier3Suite } from './tier3_interactions.test.mjs';
import { createTier4Suite } from './tier4_scenarios.test.mjs';

async function runAllSuites() {
  const isBaselineMode =
    process.argv.includes('--baseline') ||
    process.env.BASELINE === '1' ||
    process.env.BASELINE === 'true';
  console.log('==============================================================================');
  console.log('  VOICE PRESCRIPTION WRITER: CLINICAL OVERHAUL AUTOMATED TEST SUITE');
  console.log(`  Mode: ${isBaselineMode ? 'BASELINE ASSESSMENT' : 'STRICT VERIFICATION'}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log('==============================================================================\n');

  const suites = [
    createTier0Suite(),
    createTier1Suite(),
    createTier2Suite(),
    createTier3Suite(),
    createTier4Suite(),
  ];

  const overallResults = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  const startTime = Date.now();

  for (const suite of suites) {
    const summary = await suite.run();
    overallResults.push(summary);
    totalTests += summary.total;
    totalPassed += summary.passed;
    totalFailed += summary.failed;
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n==============================================================================');
  console.log('  OVERALL TEST SUITE EXECUTION SUMMARY');
  console.log('==============================================================================');
  console.log(`  Total Test Suites : ${suites.length}`);
  console.log(`  Total Test Cases  : ${totalTests}`);
  console.log(`  Passed Tests      : ${totalPassed}`);
  console.log(`  Failed Tests      : ${totalFailed}`);
  console.log(`  Total Duration    : ${totalDuration}ms`);
  console.log('------------------------------------------------------------------------------');

  for (const s of overallResults) {
    const status = s.failed === 0 ? 'PASS' : 'FAIL';
    const pct = ((s.passed / s.total) * 100).toFixed(1);
    console.log(`  [${status}] ${s.suiteName.padEnd(55)}: ${s.passed}/${s.total} (${pct}%)`);
  }
  console.log('==============================================================================\n');

  if (totalFailed > 0) {
    console.log('DIAGNOSTIC FAILURE DETAILS (Pending Implementations / Defects):');
    for (const s of overallResults) {
      const fails = s.results.filter((r) => !r.passed);
      if (fails.length > 0) {
        console.log(`\n  Suite: ${s.suiteName}`);
        for (const f of fails) {
          console.log(`    - [${f.id}] ${f.description}`);
          console.log(`      Cause: ${f.error}`);
        }
      }
    }
    console.log('\n==============================================================================');
  }

  if (isBaselineMode) {
    console.log('Baseline execution complete. Exiting with code 0 as requested by --baseline flag.');
    process.exit(0);
  } else if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllSuites().catch((err) => {
  console.error('Fatal error during test suite runner execution:', err);
  process.exit(1);
});
