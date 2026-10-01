// Compile utils/stepSummary.ts to /tmp/slowrep-summary-tests before running.
const assert = require('node:assert/strict');
const { summarizeSteps, shiftMonth } = require('/tmp/slowrep-summary-tests/stepSummary.js');
assert.deepEqual(summarizeSteps([{day:'01',steps:1234},{day:'02',steps:null},{day:'03',steps:4000}]), {total:5234,average:2617,recordedDays:2,maximum:4000});
assert.equal(summarizeSteps([{day:'01',steps:null}]).total, null);
assert.deepEqual(summarizeSteps([{day:'01',steps:0}]), {total:0,average:0,recordedDays:1,maximum:0});
assert.equal(shiftMonth('2026-12',1), '2027-01');
assert.equal(shiftMonth('2026-01',-1), '2025-12');
console.log('PASS: totals, known-day average, missing vs zero, year navigation');
