/**
 * Script to analyze Excel file structure, cell types, and identify import issues.
 * Run: node scripts/analyze-excel.js
 */

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const possiblePaths = [
  path.join(__dirname, "..", "renovacoes.xlsm"),
  path.join(__dirname, "..", "Renovações.xlsx"),
  path.join(__dirname, "..", "renovacoes.xlsx"),
];

let filePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    filePath = p;
    break;
  }
}

if (!filePath) {
  console.error("Excel file not found. Tried:", possiblePaths);
  process.exit(1);
}

console.log("=== Excel File Analysis ===\n");
console.log("File:", path.basename(filePath));

const workbook = XLSX.readFile(filePath, {
  type: "buffer",
  cellDates: true,
  cellNF: false,
  cellText: false,
});

console.log("\nSheets:", workbook.SheetNames);

const report = {
  sheets: [],
  issues: [],
  recommendations: [],
};

workbook.SheetNames.forEach((sheetName) => {
  const ws = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const rowCount = range.e.r - range.s.r + 1;
  const colCount = range.e.c - range.s.c + 1;

  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`Dimensions: ${rowCount} rows x ${colCount} cols`);

  // Get headers from first few rows (scan for best header row)
  const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let bestHeaderRow = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(10, arr.length); i++) {
    const row = arr[i] || [];
    let score = 0;
    const rowText = row.map((c) => String(c || "")).join(" ").toLowerCase();
    if (rowText.includes("telefone")) score += 4;
    if (rowText.includes("vencimento") && rowText.includes("apolice")) score += 6;
    if (rowText.includes("seguradora")) score += 4;
    if (rowText.includes("email")) score += 4;
    if (rowText.includes("cpf") || rowText.includes("cnpj")) score += 4;
    if (rowText.includes("placa")) score += 3;
    if (rowText.includes("nome") || rowText.includes("cliente")) score += 5;
    if (row.length >= 10) score += 5;
    if (score > bestScore) {
      bestScore = score;
      bestHeaderRow = i;
    }
  }

  const sheetInfo = {
    name: sheetName,
    rows: rowCount,
    cols: colCount,
    headerRow: bestHeaderRow >= 0 ? bestHeaderRow : 0,
    headers: [],
    columnAnalysis: [],
    cpfCnpjColumn: null,
    dueDateColumn: null,
  };

  if (bestHeaderRow >= 0 && arr[bestHeaderRow]) {
    const headers = arr[bestHeaderRow];
    sheetInfo.headers = headers.map((h, i) => ({
      index: i,
      name: String(h || "").trim(),
      letter: XLSX.utils.encode_col(i),
    }));

    // Find CPF/CNPJ and Vencimento columns
    headers.forEach((h, idx) => {
      const s = String(h || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      if ((s.includes("cpf") || s.includes("cnpj")) && !s.includes("venc") && !s.includes("nascimento")) {
        sheetInfo.cpfCnpjColumn = idx;
      }
      if (s.includes("vencimento") || s.includes("venc") || s.includes("renova")) {
        sheetInfo.dueDateColumn = idx;
      }
    });

    // Analyze CPF/CNPJ column cells (first 15 data rows)
    if (sheetInfo.cpfCnpjColumn !== null) {
      const cpfColIdx = sheetInfo.cpfCnpjColumn;
      const sampleCells = [];
      for (let r = bestHeaderRow + 1; r < Math.min(bestHeaderRow + 16, arr.length); r++) {
        const cellRef = XLSX.utils.encode_cell({ r, c: cpfColIdx });
        const cell = ws[cellRef];
        const jsonVal = arr[r]?.[cpfColIdx];
        sampleCells.push({
          row: r + 1,
          ref: cellRef,
          rawType: cell?.t || "unknown",
          rawValue: cell?.v,
          jsonValue: jsonVal,
          jsonType: typeof jsonVal,
          isDate: jsonVal instanceof Date,
        });
      }
      sheetInfo.cpfCnpjSamples = sampleCells;

      const dateCount = sampleCells.filter((c) => c.isDate || (typeof c.jsonValue === "number" && c.jsonValue > 1 && c.jsonValue < 100000)).length;
      const stringCount = sampleCells.filter((c) => typeof c.jsonValue === "string").length;
      if (dateCount > stringCount && dateCount > 0) {
        report.issues.push({
          sheet: sheetName,
          column: headers[cpfColIdx],
          issue: "CPF/CNPJ column contains DATE values (Excel converted policy numbers to dates)",
          samples: sampleCells.slice(0, 5).map((c) => ({
            row: c.row,
            value: c.jsonValue,
            type: c.jsonType,
            isDate: c.isDate,
          })),
        });
      }
    }

    // Check if CPF/CNPJ and Vencimento are same column
    if (sheetInfo.cpfCnpjColumn === sheetInfo.dueDateColumn && sheetInfo.cpfCnpjColumn !== null) {
      report.issues.push({
        sheet: sheetName,
        issue: "CPF/CNPJ and Vencimento map to SAME column - column has duplicate purpose",
      });
    }

    // Analyze first 3 data rows
    sheetInfo.sampleRows = [];
    for (let r = bestHeaderRow + 1; r < Math.min(bestHeaderRow + 4, arr.length); r++) {
      const row = arr[r] || [];
      const rowObj = {};
      headers.forEach((h, i) => {
        const val = row[i];
        rowObj[String(h || `Col${i}`)] = {
          value: val,
          type: typeof val,
          isDate: val instanceof Date,
        };
      });
      sheetInfo.sampleRows.push(rowObj);
    }
  }

  report.sheets.push(sheetInfo);
});

// Output report
console.log("\n=== COLUMN MAPPING DETECTED ===");
report.sheets.forEach((s) => {
  if (s.headers.length > 0) {
    console.log(`\n${s.name}:`);
    console.log("  Header row:", s.headerRow + 1);
    console.log("  CPF/CNPJ column index:", s.cpfCnpjColumn, s.cpfCnpjColumn !== null ? `(${s.headers[s.cpfCnpjColumn]?.name})` : "");
    console.log("  Vencimento column index:", s.dueDateColumn, s.dueDateColumn !== null ? `(${s.headers[s.dueDateColumn]?.name})` : "");
    if (s.cpfCnpjSamples) {
      console.log("  CPF/CNPJ sample values (first 5):");
      s.cpfCnpjSamples.slice(0, 5).forEach((c) => {
        console.log(`    Row ${c.row}: type=${c.jsonType} isDate=${c.isDate} value=${JSON.stringify(c.jsonValue)}`);
      });
    }
  }
});

console.log("\n=== ISSUES FOUND ===");
if (report.issues.length === 0) {
  console.log("None detected.");
} else {
  report.issues.forEach((issue, i) => {
    console.log(`\n${i + 1}. ${issue.issue}`);
    if (issue.samples) {
      issue.samples.forEach((s) => console.log(`   - Row ${s.row}: ${s.value} (${s.type})`));
    }
  });
}

// Save full report to file
const reportPath = path.join(__dirname, "..", "excel-analysis-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(`\nFull report saved to: excel-analysis-report.json`);
