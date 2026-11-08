import { tokenize } from '../lib/lexer.js';
import { Parser } from '../lib/parser.js';
import { Interpreter } from '../lib/interpreter.js';
import assert from 'assert';

const suites = [];

function describe(name, fn) {
  const suite = { name, tests: [] };
  globalThis.it = (testName, testFn) => {
    suite.tests.push({ name: testName, fn: testFn });
  };
  fn();
  suites.push(suite);
}

// Implement standard behavior for describe/it in pure Node without mocha dependency
globalThis.describe = describe;

// Import the actual test suite definitions
await import('./test.js');

let passed = 0;
let failed = 0;

console.log('Running Klomn Test Suite...\n');

for (const suite of suites) {
  console.log(`\x1b[36m${suite.name}\x1b[0m`);
  for (const test of suite.tests) {
    try {
      test.fn();
      console.log(`  \x1b[32m✓\x1b[0m ${test.name}`);
      passed++;
    } catch (err) {
      console.log(`  \x1b[31m✗\x1b[0m ${test.name}`);
      console.error(err.stack);
      failed++;
    }
  }
}

console.log(`\n\x1b[1mSummary: ${passed} passed, ${failed} failed.\x1b[0m`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
