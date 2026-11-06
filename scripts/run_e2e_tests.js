#!/usr/bin/env node
/**
 * Root test execution entry point for Voice Prescription Writer Clinical Overhaul
 * Usage:
 *   node scripts/run_e2e_tests.js
 *   node scripts/run_e2e_tests.js --baseline
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');
const runnerPath = path.resolve(frontendDir, 'tests', 'runner.mjs');

const args = process.argv.slice(2);

const child = spawn(process.execPath, [runnerPath, ...args], {
  cwd: frontendDir,
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
