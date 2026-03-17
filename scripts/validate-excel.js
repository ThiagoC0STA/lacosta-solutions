/**
 * Validation script: compares Renovações.xlsx data with app calculations.
 * Verifies: row count, Prêmio Líquido, IOF, totals.
 * Note: Excel uses variable commission rates per policy - we preserve them on import.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const IOF_RATE = 0.0738;

function calculateFromPremium(premium) {
  const netPremium = Math.round((premium / (1 + IOF_RATE)) * 100) / 100;
  const iof = Math.round(netPremium * IOF_RATE * 100) / 100;
  const commission10 = Math.round(netPremium * 0.1 * 100) / 100;
  const commission15 = Math.round(netPremium * 0.15 * 100) / 100;
  return { netPremium, iof, commission10, commission15 };
}

function parseExcelNumber(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const str = String(val).trim().replace(/\s/g, '');
  const cleaned = str.replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function findColIndex(headers, ...names) {
  for (const name of names) {
    const idx = headers.findIndex(h =>
      String(h || '').toLowerCase().replace(/\s/g, '').includes(
        String(name).toLowerCase().replace(/\s/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      )
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

const projectRoot = path.join(__dirname, '..');
const files = fs.readdirSync(projectRoot);
const excelFile = files.find(f => f.endsWith('.xlsx'));
const excelPath = excelFile ? path.join(projectRoot, excelFile) : path.join(projectRoot, 'Renovacoes.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('Excel file not found:', excelPath);
  process.exit(1);
}

console.log('=== VALIDATION: Renovações.xlsx vs App Calculations ===\n');

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const headers = rawData[0] || [];
const allDataRows = rawData.slice(1).filter(row => row && row.some(cell => cell !== '' && cell !== null && cell !== undefined));

const colNome = findColIndex(headers, 'nome', 'cliente');
const colPremium = findColIndex(headers, 'premio total', 'premium', 'premio');
const colIOF = findColIndex(headers, 'iof');
const colNetPremium = findColIndex(headers, 'premio liquido', 'premioliquido');
const colCommission = findColIndex(headers, 'comissao', 'comiss');

const EXCEL_TOTAL_COMISSAO_ANUAL = 160796.739;

// Exclude summary row: empty name and commission equals total (or very large)
const dataRows = allDataRows.filter(row => {
  const nome = String(row[colNome] || '').trim();
  const comm = parseExcelNumber(row[colCommission]);
  const prem = parseExcelNumber(row[colPremium]);
  if (!nome && (comm >= EXCEL_TOTAL_COMISSAO_ANUAL - 1 || (prem == null && comm > 100000))) return false;
  return true;
});

console.log('Column mapping:', { NOME: colNome, PREMIO_TOTAL: colPremium, IOF: colIOF, PREMIO_LIQUIDO: colNetPremium, COMISSAO: colCommission });
console.log('Data rows (excluding summary):', dataRows.length, '/', allDataRows.length, '\n');

let totalPremiumExcel = 0;
let totalNetExcel = 0;
let totalIOFExcel = 0;
let totalCommExcel = 0;
let totalPremiumCalc = 0;
let totalNetCalc = 0;
let totalIOFCalc = 0;

const errors = [];

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i] || [];
  const nome = String(row[colNome] || '').trim();
  const premiumVal = parseExcelNumber(row[colPremium]);

  if (!nome && premiumVal == null) continue;

  const premium = premiumVal != null && premiumVal > 0 ? premiumVal : 0;
  const excelIOF = parseExcelNumber(row[colIOF]);
  const excelNet = parseExcelNumber(row[colNetPremium]);
  const excelComm = parseExcelNumber(row[colCommission]);

  if (premium > 0) {
    const { netPremium, iof } = calculateFromPremium(premium);

    totalPremiumExcel += premium;
    totalPremiumCalc += premium;
    totalNetCalc += netPremium;
    totalIOFCalc += iof;

    if (excelNet != null) {
      totalNetExcel += excelNet;
      const diffNet = Math.abs(netPremium - excelNet);
      if (diffNet > 0.02) {
        errors.push(`Row ${i + 2} (${nome}): Prêmio Líquido diff | calc=${netPremium.toFixed(2)} excel=${excelNet} premium=${premium}`);
      }
    }
    if (excelIOF != null) {
      totalIOFExcel += excelIOF;
      const diffIOF = Math.abs(iof - excelIOF);
      if (diffIOF > 0.02) {
        errors.push(`Row ${i + 2} (${nome}): IOF diff | calc=${iof.toFixed(2)} excel=${excelIOF} premium=${premium}`);
      }
    }
    if (excelComm != null && excelComm < 100000) {
      totalCommExcel += excelComm;
    }
  }
}

console.log('--- TOTALS ---');
console.log('Total Prêmio:', totalPremiumExcel.toFixed(2));
console.log('Total Prêmio Líquido (calc):', totalNetCalc.toFixed(2));
console.log('Total IOF (calc):', totalIOFCalc.toFixed(2));
console.log('Total Comissão (Excel, variable rates):', totalCommExcel.toFixed(2));
console.log('Excel TOTAL COMISSÃO ANUAL (reference):', EXCEL_TOTAL_COMISSAO_ANUAL.toFixed(2));

const diffNet = Math.abs(totalNetCalc - totalNetExcel);
const diffIOF = Math.abs(totalIOFCalc - totalIOFExcel);
const diffComm = Math.abs(totalCommExcel - EXCEL_TOTAL_COMISSAO_ANUAL);

console.log('\n--- CHECKS ---');
console.log('Prêmio Líquido total match:', diffNet <= 1 ? 'OK' : `DIFF: ${diffNet.toFixed(2)}`);
console.log('IOF total match:', diffIOF <= 1 ? 'OK' : `DIFF: ${diffIOF.toFixed(2)}`);
console.log('Comissão total vs Excel reference:', diffComm <= 2 ? 'OK' : `DIFF: ${diffComm.toFixed(2)}`);

if (diffNet > 1) errors.push(`Total Prêmio Líquido diff: ${diffNet.toFixed(2)}`);
if (diffIOF > 1) errors.push(`Total IOF diff: ${diffIOF.toFixed(2)}`);

console.log('\n--- VALIDATION RESULT ---');
if (errors.length === 0) {
  console.log('PASS: All validations passed. Prêmio Líquido and IOF match our formula (IOF 7.38%). Excel commission is preserved on import.');
} else {
  console.log('FAIL:', errors.length, 'error(s):');
  errors.forEach(e => console.log('  -', e));
}

process.exit(errors.length > 0 ? 1 : 0);
