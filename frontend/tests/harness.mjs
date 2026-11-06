import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const FRONTEND_ROOT = path.resolve(__dirname, '..');
export const SRC_ROOT = path.resolve(FRONTEND_ROOT, 'src');

export class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`,
      actual,
      expected
    );
  }
}

export function assertTrue(value, message) {
  if (!value) {
    throw new AssertionError(message || `Expected truthy value, got ${JSON.stringify(value)}`, value, true);
  }
}

export function assertFalse(value, message) {
  if (value) {
    throw new AssertionError(message || `Expected falsy value, got ${JSON.stringify(value)}`, value, false);
  }
}

export function assertIncludes(actual, search, message) {
  if (typeof actual === 'string') {
    if (!actual.includes(search)) {
      throw new AssertionError(
        message || `Expected string to contain ${JSON.stringify(search)}`,
        actual,
        search
      );
    }
  } else if (Array.isArray(actual)) {
    if (!actual.includes(search)) {
      throw new AssertionError(
        message || `Expected array to contain item ${JSON.stringify(search)}`,
        actual,
        search
      );
    }
  } else {
    throw new AssertionError(`assertIncludes target must be string or array`, actual, search);
  }
}

export function assertNotIncludes(actual, search, message) {
  if (typeof actual === 'string') {
    if (actual.includes(search)) {
      throw new AssertionError(
        message || `Expected string NOT to contain ${JSON.stringify(search)}`,
        actual,
        search
      );
    }
  } else if (Array.isArray(actual)) {
    if (actual.includes(search)) {
      throw new AssertionError(
        message || `Expected array NOT to contain item ${JSON.stringify(search)}`,
        actual,
        search
      );
    }
  }
}

export function assertMatch(actual, regex, message) {
  if (!regex.test(actual)) {
    throw new AssertionError(
      message || `Expected string to match ${regex}`,
      actual,
      regex.toString()
    );
  }
}

export function assertNotMatch(actual, regex, message) {
  if (regex.test(actual)) {
    throw new AssertionError(
      message || `Expected string NOT to match ${regex}`,
      actual,
      regex.toString()
    );
  }
}

export function readSourceFile(relativePath) {
  const fullPath = path.resolve(SRC_ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

export function sourceFileExists(relativePath) {
  return fs.existsSync(path.resolve(SRC_ROOT, relativePath));
}

export function createMockLocalStorage(initialStore = {}) {
  let store = { ...initialStore };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? String(store[key]) : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    getRawStore() {
      return { ...store };
    },
  };
}

export function runShell(cmd, cwd = FRONTEND_ROOT) {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    return { success: true, exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      success: false,
      exitCode: err.status ?? 1,
      stdout: err.stdout ? String(err.stdout) : '',
      stderr: err.stderr ? String(err.stderr) : (err.message || ''),
    };
  }
}

/**
 * Test Suite Collector
 */
export class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.results = [];
  }

  test(id, description, fn) {
    this.tests.push({ id, description, fn });
  }

  async run() {
    console.log(`\n======================================================`);
    console.log(`RUNNING SUITE: ${this.suiteName}`);
    console.log(`======================================================`);
    this.results = [];
    let passCount = 0;
    let failCount = 0;

    for (const t of this.tests) {
      const startTime = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - startTime;
        console.log(`  [PASS] [${t.id}] ${t.description} (${duration}ms)`);
        this.results.push({ id: t.id, description: t.description, passed: true, duration });
        passCount++;
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`  [FAIL] [${t.id}] ${t.description} (${duration}ms)`);
        console.log(`         Error: ${err.message}`);
        this.results.push({
          id: t.id,
          description: t.description,
          passed: false,
          error: err.message,
          duration,
        });
        failCount++;
      }
    }

    console.log(`------------------------------------------------------`);
    console.log(`SUITE SUMMARY: ${this.suiteName}`);
    console.log(`Total: ${this.tests.length} | Passed: ${passCount} | Failed: ${failCount}`);
    console.log(`------------------------------------------------------\n`);

    return {
      suiteName: this.suiteName,
      total: this.tests.length,
      passed: passCount,
      failed: failCount,
      results: this.results,
    };
  }
}
