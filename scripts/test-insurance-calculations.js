/**
 * Unit tests for insurance calculations (calculateFromPremium).
 * Matches lib/insurance-calculations.ts logic.
 */

const assert = require('assert');

const IOF_RATE = 0.0738;

function calculateFromPremium(premium) {
  const netPremium = Math.round((premium / (1 + IOF_RATE)) * 100) / 100;
  const iof = Math.round(netPremium * IOF_RATE * 100) / 100;
  const commission10 = Math.round(netPremium * 0.1 * 100) / 100;
  const commission15 = Math.round(netPremium * 0.15 * 100) / 100;
  return { netPremium, iof, commission10, commission15 };
}

function assertNear(actual, expected, msg, tolerance = 0.02) {
  const diff = Math.abs(actual - expected);
  assert.ok(diff <= tolerance, `${msg}: expected ~${expected}, got ${actual} (diff: ${diff})`);
}

console.log('=== Test: insurance-calculations ===\n');

// Test 1: Premium 1828.55 (from Excel row 1)
const r1 = calculateFromPremium(1828.55);
assertNear(r1.netPremium, 1702.88, 'Net Premium (1828.55)');
assertNear(r1.iof, 125.67, 'IOF (1828.55)');
assertNear(r1.commission10, 170.29, 'Commission 10% (1828.55)');
assertNear(r1.commission15, 255.43, 'Commission 15% (1828.55)');
console.log('OK: Premium 1828.55 -> net=', r1.netPremium, 'iof=', r1.iof);

// Test 2: Formula consistency - netPremium * (1 + IOF_RATE) should equal premium
const prem = 5000;
const r2 = calculateFromPremium(prem);
const reconstructed = r2.netPremium * (1 + IOF_RATE);
assertNear(reconstructed, prem, 'Formula: netPremium * (1+IOF) = premium');
console.log('OK: Formula consistency for premium', prem);

// Test 3: Commission 10% = netPremium * 0.1
assertNear(r2.commission10, r2.netPremium * 0.1, 'Commission 10% = netPremium * 0.1');
assertNear(r2.commission15, r2.netPremium * 0.15, 'Commission 15% = netPremium * 0.15');
console.log('OK: Commission formulas');

// Test 4: IOF = netPremium * IOF_RATE
assertNear(r2.iof, r2.netPremium * IOF_RATE, 'IOF = netPremium * IOF_RATE');
console.log('OK: IOF formula');

// Test 5: Sum of netPremium + IOF should equal premium (within rounding)
const sum = r2.netPremium + r2.iof;
assertNear(sum, prem, 'netPremium + IOF = premium');
console.log('OK: netPremium + IOF = premium');

console.log('\nPASS: All insurance calculation tests passed.');
