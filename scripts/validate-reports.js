/**
 * Validates reports page logic: totals, period filter, commission extraction.
 * Uses same logic as app/reports/page.tsx (getCommission15, getCommission10, etc.).
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

function getCommission15(policy) {
  if (!policy.notes) {
    if (policy.premium && policy.premium > 0) return calculateFromPremium(policy.premium).commission15;
    return 0;
  }
  const comm15Match = policy.notes.match(/Comissão\s+15%\s*:\s*R\$\s*([\d.,]+)/i);
  if (comm15Match?.[1]) {
    const val = parseFloat(comm15Match[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  const legacyMatch = policy.notes.match(/Comissão\s*:\s*R\$\s*([\d.,]+)/i);
  if (legacyMatch?.[1]) {
    const val = parseFloat(legacyMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  if (policy.premium && policy.premium > 0) return calculateFromPremium(policy.premium).commission15;
  return 0;
}

function getCommission10(policy) {
  if (!policy.notes) {
    if (policy.premium && policy.premium > 0) return calculateFromPremium(policy.premium).commission10;
    return 0;
  }
  const comm10Match = policy.notes.match(/Comissão\s+10%\s*:\s*R\$\s*([\d.,]+)/i);
  if (comm10Match?.[1]) {
    const val = parseFloat(comm10Match[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  if (policy.premium && policy.premium > 0) return calculateFromPremium(policy.premium).commission10;
  return 0;
}

function toLocalDate(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, day] = d.split(/[-T]/).map(Number);
    return new Date(y, (m || 1) - 1, day || 1);
  }
  if (d instanceof Date) return d;
  return new Date(d);
}

console.log('=== Test: Reports logic ===\n');

// Mock policies
const policies = [
  { premium: 1828.55, dueDate: '2027-03-17', status: 'active', notes: 'Placa: BBD5594 | IOF: R$ 125,67 | Prêmio Líquido: R$ 1.702,88 | Comissão: R$ 374,63' },
  { premium: 1000, dueDate: '2025-06-15', status: 'active', notes: null },
  { premium: 2000, dueDate: '2025-12-01', status: 'active', notes: 'Comissão 10%: R$ 185,24 | Comissão 15%: R$ 277,86' },
];

const activePolicies = policies.filter(p => p.status === 'active');

// Test 1: getCommission15 with legacy "Comissão: R$ X" (Excel import format)
const c1 = getCommission15(policies[0]);
assert.strictEqual(c1, 374.63, 'Legacy Comissão from notes should be used');
console.log('OK: Legacy Comissão extraction');

// Test 2: getCommission15 with no notes -> calculate from premium
const c2 = getCommission15(policies[1]);
const expected = calculateFromPremium(1000).commission15;
assert.ok(Math.abs(c2 - expected) < 0.02, `Fallback calc: expected ~${expected}, got ${c2}`);
console.log('OK: Fallback to calculated commission15');

// Test 3: getCommission10 with Comissão 10% in notes
const c3 = getCommission10(policies[2]);
assert.strictEqual(c3, 185.24, 'Comissão 10% from notes');
console.log('OK: Comissão 10% extraction');

// Test 4: totalPremium
const totalPremium = activePolicies.reduce((s, p) => s + (p.premium || 0), 0);
assert.strictEqual(totalPremium, 4828.55, 'Total premium');
console.log('OK: Total premium sum');

// Test 5: totalCommission (reports use getCommission15 for "Comissão Total")
const totalCommission = activePolicies.reduce((s, p) => s + getCommission15(p), 0);
assert.ok(totalCommission > 0, 'Total commission > 0');
console.log('OK: Total commission sum');

// Test 6: Period filter logic - use fixed date for reproducibility
const currentYear = 2025;
const currentMonth = 2; // March (0-indexed)
const periodMonths = 12;

const premiumInPeriod = activePolicies.reduce(
  (sum, p) => {
    const dueDate = toLocalDate(p.dueDate);
    const today = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + periodMonths, 0);
    if (dueDate >= today && dueDate <= endDate) return sum + (p.premium || 0);
    return sum;
  },
  0
);
// Policies 2025-06-15 and 2025-12-01 are in period Mar 2025 - Feb 2026 = 1000 + 2000
assert.strictEqual(premiumInPeriod, 3000, 'Premium in period (1000 + 2000)');
console.log('OK: Period filter logic');

console.log('\nPASS: All reports logic tests passed.');
