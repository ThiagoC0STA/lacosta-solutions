"use client";

import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import {
  parseDateFromExcel,
  parseExcelSerial,
  formatDateForStorage,
} from "@/lib/date-helpers";
import { buildNotesWithCommission } from "@/lib/insurance-calculations";
import { extractCommissionRateFromFormula } from "@/lib/excel-formula-helpers";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import { getPoliciesWithClients, getClients } from "@/lib/supabase/queries";
import type { Client, Policy } from "@/types";

interface ExcelRow {
  [key: string]: string | number | Date | undefined;
}

interface ProcessedRow {
  clientName: string;
  dueDate: string | Date;
  birthday?: string | Date;
  phone?: string;
  email?: string;
  insurer?: string;
  product?: string;
  premium?: number;
  iof?: number;
  netPremium?: number; // Prêmio Líquido
  commission?: number; // Comissão
  commissionRate?: number | null; // % e.g. 25 for 25%
  policyNumber?: string; // Número da apólice (NOT CPF/CNPJ)
  cpfCnpj?: string;
  plate?: string;
  uniqueKey: string; // CPF/CNPJ + VENCIMENTO ou PLACA + VENCIMENTO
}

// Auto-detect column mapping based on header names
function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach((header) => {
    const headerStr = String(header || "").trim();
    if (!headerStr || /^[\d.eE+-]+$/.test(headerStr)) return;
    const headerLower = headerStr.toLowerCase();
    const headerNormalized = headerLower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, ""); // Remove caracteres especiais

    // Nome do cliente - procurar por várias variações
    if (!mapping.clientName) {
      if (
        headerNormalized.includes("nome") ||
        headerNormalized.includes("cliente") ||
        headerNormalized.includes("razao") ||
        headerNormalized.includes("razaosocial") ||
        headerLower.includes("nome do cliente") ||
        headerLower.includes("nome cliente") ||
        headerLower.match(/^nome/i) ||
        (headerLower.includes("nome") && !headerLower.includes("numero"))
      ) {
        mapping.clientName = header;
      }
    }

    // Telefone - qualquer telefone (casa, comercial, celular)
    // Prioridade: celular > comercial > casa
    if (
      headerNormalized.includes("telefone") ||
      headerNormalized.includes("fone")
    ) {
      if (
        headerNormalized.includes("celular") ||
        headerNormalized.includes("cel")
      ) {
        mapping.phone = header;
      } else if (
        headerNormalized.includes("comercial") ||
        headerNormalized.includes("comerc")
      ) {
        if (
          !mapping.phone ||
          !mapping.phone.toLowerCase().includes("celular")
        ) {
          mapping.phone = header;
        }
      } else if (!mapping.phone) {
        mapping.phone = header;
      }
    }

    // Email
    if (!mapping.email && headerNormalized.includes("email")) {
      mapping.email = header;
    }

    // Data de nascimento
    if (
      !mapping.birthday &&
      (headerNormalized.includes("nascimento") ||
        headerNormalized.includes("aniversario") ||
        headerNormalized.includes("datanasc"))
    ) {
      mapping.birthday = header;
    }

    // Vencimento / Renovação - várias variações
    if (!mapping.dueDate) {
      if (
        headerNormalized.includes("vencimento") ||
        headerNormalized.includes("venc") ||
        headerNormalized.includes("vencimentoapolice") ||
        headerNormalized.includes("vencimentoapol") ||
        headerNormalized.includes("renovacao") ||
        headerNormalized.includes("renova") ||
        headerLower.includes("vencimento apólice") ||
        headerLower.includes("vencimento apolice") ||
        headerLower.includes("data vencimento") ||
        headerLower.includes("data renovação") ||
        headerLower.match(/vencimento.*apol/i)
      ) {
        mapping.dueDate = header;
      }
    }

    // Seguradora
    if (
      !mapping.insurer &&
      (headerNormalized.includes("seguradora") ||
        headerNormalized.includes("segurado"))
    ) {
      mapping.insurer = header;
    }

    // Produto
    if (
      !mapping.product &&
      (headerNormalized.includes("produto") ||
        headerNormalized.includes("prod") ||
        headerNormalized.includes("produt"))
    ) {
      mapping.product = header;
    }

    // Prêmio - várias variações
    if (
      !mapping.premium &&
      (headerNormalized.includes("premio") ||
        headerNormalized.includes("premium") ||
        headerNormalized.includes("premiototal") ||
        headerNormalized.includes("premio total"))
    ) {
      mapping.premium = header;
    }

    // Número da Apólice - must NOT match CPF/CNPJ or date columns (vencimento = due date, not policy number!)
    const isDateColForPolicy =
      headerNormalized.includes("vencimento") ||
      headerNormalized.includes("venc") ||
      headerNormalized.includes("renovacao") ||
      headerNormalized.includes("renova");
    if (
      !mapping.policyNumber &&
      !isDateColForPolicy &&
      ((headerNormalized.includes("numero") &&
        headerNormalized.includes("apolice")) ||
        (headerNormalized.includes("numero") &&
          headerNormalized.includes("apol")) ||
        headerNormalized === "numeroapolice" ||
        headerLower.includes("número da apólice") ||
        headerLower.includes("nº apólice") ||
        (headerNormalized.includes("apolice") &&
          !headerNormalized.includes("cpf") &&
          !headerNormalized.includes("cnpj")))
    ) {
      if (
        !headerNormalized.includes("cpf") &&
        !headerNormalized.includes("cnpj")
      ) {
        mapping.policyNumber = header;
      }
    }

    // CPF/CNPJ - in this system, CPF/CNPJ column = policy number (numero da apolice)
    // MUST NOT match date columns (vencimento, etc.) - they contain dates not policy numbers
    const isDateColumn =
      headerNormalized.includes("vencimento") ||
      headerNormalized.includes("venc") ||
      (headerNormalized.includes("data") && !headerNormalized.includes("nascimento")) ||
      headerNormalized.includes("renovacao") ||
      headerNormalized.includes("renova");
    const isExactCpfCnpj = headerNormalized === "cpfcnpj" || headerLower === "cpf/cnpj" || headerLower.trim() === "cpf/cnpj";
    if (
      !mapping.cpfCnpj &&
      !isDateColumn &&
      header !== mapping.dueDate &&
      (headerNormalized.includes("cpf") ||
        headerNormalized.includes("cnpj") ||
        headerNormalized.includes("cpfcnpj"))
    ) {
      // Prefer exact "CPF/CNPJ" match - if we find it later, we could overwrite, but for now take first match
      if (!mapping.cpfCnpj || isExactCpfCnpj) {
        mapping.cpfCnpj = header;
      }
    }

    // Placa
    if (!mapping.plate && headerNormalized.includes("placa")) {
      mapping.plate = header;
    }

    // IOF
    if (!mapping.iof && headerNormalized.includes("iof")) {
      mapping.iof = header;
    }

    // Prêmio Líquido
    if (
      !mapping.netPremium &&
      (headerNormalized.includes("premioliquido") ||
        headerNormalized.includes("premio liquido") ||
        (headerNormalized.includes("premio") &&
          headerNormalized.includes("liquido")))
    ) {
      mapping.netPremium = header;
    }

    // Comissão
    if (
      !mapping.commission &&
      (headerNormalized.includes("comissao") ||
        headerNormalized.includes("comiss"))
    ) {
      mapping.commission = header;
    }
  });

  return mapping;
}

/**
 * Find CPF/CNPJ column value from row by scanning keys.
 * Handles header key mismatches (encoding, spacing, invisible chars).
 */
function findCpfCnpjValueFromRow(row: Record<string, unknown>): unknown {
  for (const k of Object.keys(row)) {
    const norm = String(k)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    const isDateCol =
      norm.includes("vencimento") ||
      norm.includes("venc") ||
      (norm.includes("data") && !norm.includes("nascimento")) ||
      norm.includes("renovacao") ||
      norm.includes("renova");
    if (
      (norm.includes("cpf") || norm.includes("cnpj")) &&
      !isDateCol &&
      !norm.includes("nascimento")
    ) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== "")
        return v;
    }
  }
  return undefined;
}

/**
 * Extract policy number from cell value.
 * Excel often converts values like "3/22/26" to Date.
 * "CPF/CNPJ" column = policy number (numero da apolice).
 * When Excel converts to date, format as "M/d/yy" to preserve display (e.g. "3/22/26").
 */
function extractPolicyNumberFromCell(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return undefined;
    // Excel date serial: 1 to ~2958465 (years 1900-9999) - value was converted to date
    if (value >= 1 && value <= 2958465) {
      const d = parseExcelSerial(value);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      const y = d.getFullYear() % 100;
      return `${m}/${day}/${y}`;
    }
    // CPF (11 digits) or CNPJ (14 digits) as number - pad with leading zeros
    const numStr = String(Math.floor(value));
    if (numStr.length >= 9 && numStr.length <= 14) {
      if (numStr.length <= 11) return numStr.padStart(11, "0");
      return numStr.padStart(14, "0");
    }
    return numStr;
  }

  if (value instanceof Date) {
    const m = value.getMonth() + 1;
    const day = value.getDate();
    const y = value.getFullYear() % 100;
    return `${m}/${day}/${y}`;
  }

  return undefined;
}

export default function ImportPage() {
  const { createClientsBatch } = useClients();
  const { createPoliciesBatch: createPoliciesBatchFn } = usePolicies();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
    stats?: {
      clients: number;
      policies: number;
      totalRows: number;
      emptyRowsSkipped: number;
      validationSkipped: number;
      duplicateSkipped: number;
    };
  }>({ type: "idle", message: "" });
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setStatus({ type: "idle", message: "" });

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, {
              type: "array",
              cellDates: true,
              cellNF: false,
              cellText: false,
            });

            console.log("Planilhas encontradas:", workbook.SheetNames);

            // Try to find the sheet with actual data
            let bestSheet = workbook.SheetNames[0];
            let bestHeaderRow = -1;
            let bestScore = 0;
            let bestArrayData: any[][] = [];

            // Check all sheets
            for (const sheetName of workbook.SheetNames) {
              const worksheet = workbook.Sheets[sheetName];
              const arrayData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: "",
                raw: false,
              }) as any[][];

              console.log(`\n=== Analisando planilha: ${sheetName} ===`);
              console.log(`Total de linhas: ${arrayData.length}`);
              if (arrayData.length > 0) {
                console.log(
                  `Primeira linha tem ${arrayData[0].length} colunas`,
                );
                console.log(
                  "Primeiras 3 linhas:",
                  arrayData
                    .slice(0, 3)
                    .map((r) => r.filter((c) => c).slice(0, 5)),
                );
              }

              // Search for header row in this sheet - check ALL rows
              for (let i = 0; i < arrayData.length; i++) {
                const row = arrayData[i];
                if (!row || row.length === 0) continue;

                // Get all cells from this row (including empty ones to preserve column positions)
                const cells = row.map((cell) => String(cell || "").trim());
                const nonEmptyCells = cells.filter((c) => c);

                // Need at least 8 columns to be a data table
                if (nonEmptyCells.length < 8 || cells.length < 8) continue;

                const rowText = nonEmptyCells
                  .join(" ")
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");

                // Skip rows that are clearly not headers
                if (
                  rowText.includes("painel") ||
                  rowText.includes("alertas") ||
                  rowText.includes("vencimentos por mes") ||
                  rowText.includes("vencidos antes") ||
                  rowText.includes("vence em") ||
                  rowText.includes("mes qtde") ||
                  nonEmptyCells.every(
                    (c) =>
                      c.match(/^[\d.,]+$/) ||
                      c.match(
                        /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\w+$/i,
                      ),
                  )
                ) {
                  continue;
                }

                // Check each cell individually for header keywords
                let score = 0;
                const foundHeaders: string[] = [];

                cells.forEach((cell) => {
                  if (!cell) return;
                  const cellLower = cell
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

                  if (
                    cellLower.includes("telefone") ||
                    cellLower.includes("fone")
                  ) {
                    score += 4;
                    foundHeaders.push(cell);
                  }
                  if (
                    (cellLower.includes("vencimento") ||
                      cellLower.includes("venciment")) &&
                    (cellLower.includes("apolice") ||
                      cellLower.includes("apol"))
                  ) {
                    score += 6;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("seguradora")) {
                    score += 4;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("email")) {
                    score += 4;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("cpf") || cellLower.includes("cnpj")) {
                    score += 4;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("placa")) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (
                    cellLower.includes("nascimento") ||
                    cellLower.includes("aniversario")
                  ) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (
                    cellLower.includes("produto") ||
                    cellLower.includes("prod")
                  ) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("premio")) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (cellLower.includes("iof")) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (
                    cellLower.includes("liquido") ||
                    (cellLower.includes("premio") &&
                      cellLower.includes("liquido"))
                  ) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                  if (
                    cellLower.includes("comissao") ||
                    cellLower.includes("comiss")
                  ) {
                    score += 3;
                    foundHeaders.push(cell);
                  }
                });

                // Big bonus for having many columns (typical of data tables)
                if (cells.length >= 10) {
                  score += 5;
                }
                if (cells.length >= 14) {
                  score += 3; // Even more bonus for 14+ columns
                }

                if (score > 0) {
                  console.log(
                    `  Linha ${i}: score=${score}, colunas=${cells.length}, headers:`,
                    foundHeaders.slice(0, 8),
                  );
                }

                // Prefer sheets with more data rows (e.g. "CLIENTES A RENOVAR" over "CADASTRO")
                const dataRowCount = arrayData.length - i - 1;
                const rowBonus = Math.min(Math.floor(dataRowCount / 10), 20);
                const totalScore = score + rowBonus;
                if (totalScore > bestScore) {
                  bestScore = totalScore;
                  bestHeaderRow = i;
                  bestSheet = sheetName;
                  bestArrayData = arrayData;
                }
              }
            }

            if (bestHeaderRow === -1 || bestScore < 8) {
              // Show what was found
              const allSheetsInfo = workbook.SheetNames.map((name) => {
                const ws = workbook.Sheets[name];
                const arr = XLSX.utils.sheet_to_json(ws, {
                  header: 1,
                  defval: "",
                }) as any[][];
                return `${name}: ${arr.length} linhas, primeira linha tem ${arr[0]?.length || 0} colunas`;
              }).join("\n");

              setStatus({
                type: "error",
                message: `Não foi possível encontrar os dados no arquivo.\n\nPlanilhas encontradas:\n${allSheetsInfo}\n\nMelhor score encontrado: ${bestScore}\n\nPor favor, verifique se o arquivo contém uma planilha com colunas como:\n"TELEFONE CASA", "TELEFONE COMERCIAL", "VENCIMENTO APÓLICE", "SEGURADORA", "EMAIL", "CPF/CNPJ", "PLACA", etc.`,
              });
              setIsProcessing(false);
              return;
            }

            console.log(
              `\n[TRACE] Sheet selected: "${bestSheet}", headerRow=${bestHeaderRow} (score=${bestScore})`,
            );
            console.log(
              "[TRACE] Headers:",
              bestArrayData[bestHeaderRow].filter((c) => c),
            );

            const headerRow = bestArrayData[bestHeaderRow];
            const commissionColIndex = headerRow.findIndex((h: unknown) =>
              String(h || "")
                .toLowerCase()
                .includes("comissao"),
            );
            const cpfCnpjColIndex = headerRow.findIndex((h: unknown) => {
              const s = String(h || "").toLowerCase();
              const hasCpfCnpj = s.includes("cpf") || s.includes("cnpj");
              const isDateCol = s.includes("vencimento") || s.includes("venc") || s.includes("data") || s.includes("renov");
              return hasCpfCnpj && !s.includes("nascimento") && !isDateCol;
            });

            console.log("[IMPORT TRACE] Sheet/Header:", {
              bestSheet,
              bestHeaderRow,
              cpfCnpjColIndex,
              cpfCnpjHeaderAtCol: cpfCnpjColIndex >= 0 ? headerRow[cpfCnpjColIndex] : null,
            });

            // Now read with the correct sheet and header row - read COMPLETE sheet
            // Use raw: false to get calculated values from formulas (Excel formulas are already calculated)
            const worksheet = workbook.Sheets[bestSheet];
            const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
              header: bestHeaderRow,
              defval: "",
              raw: false, // This ensures formulas are calculated and we get the actual values
              // Don't specify range - read everything
            });

            if (jsonData.length === 0) {
              setStatus({
                type: "error",
                message:
                  "O arquivo está vazio ou não foi possível ler os dados",
              });
              setIsProcessing(false);
              return;
            }

            // Build product code -> name map from "Código Produtos" sheet (if exists)
            const productCodeToName = new Map<string | number, string>();
            const codigoProdutosSheet = workbook.Sheets["Código Produtos"];
            if (codigoProdutosSheet) {
              const prodArr = XLSX.utils.sheet_to_json<[number, string][]>(
                codigoProdutosSheet,
                { header: 1, defval: "" },
              );
              prodArr.forEach((row) => {
                const code = row[0];
                const name = row[1];
                if (
                  (typeof code === "number" || typeof code === "string") &&
                  name
                ) {
                  const nameStr = String(name).trim();
                  if (nameStr) {
                    productCodeToName.set(code, nameStr);
                    productCodeToName.set(String(code), nameStr);
                  }
                }
              });
              console.log("Product code map:", Object.fromEntries(productCodeToName));
            }

            // Auto-detect columns
            const headers = Object.keys(jsonData[0]);
            const columnMapping = detectColumnMapping(headers);

            // Debug: show detected columns
            console.log("Headers encontrados:", headers);
            console.log(`✓ Total de linhas de dados lidas: ${jsonData.length}`);
            console.log("Primeira linha de dados:", jsonData[0]);
            if (jsonData.length > 1) {
              console.log(
                "Última linha de dados:",
                jsonData[jsonData.length - 1],
              );
            }
            console.log("Mapeamento detectado:", columnMapping);
            console.log("[IMPORT TRACE] Column mapping - CPF/Policy:", {
              cpfCnpj: columnMapping.cpfCnpj,
              policyNumber: columnMapping.policyNumber,
              dueDate: columnMapping.dueDate,
              policyNumberIsSameAsDueDate:
                !!columnMapping.policyNumber &&
                !!columnMapping.dueDate &&
                columnMapping.policyNumber === columnMapping.dueDate,
              cpfCnpjKeyInFirstRow: columnMapping.cpfCnpj
                ? jsonData[0][columnMapping.cpfCnpj]
                : "N/A",
              firstRowKeys: Object.keys(jsonData[0]),
            });
            console.log("Colunas financeiras detectadas:", {
              iof: columnMapping.iof || "NÃO ENCONTRADA",
              netPremium: columnMapping.netPremium || "NÃO ENCONTRADA",
              commission: columnMapping.commission || "NÃO ENCONTRADA",
              premium: columnMapping.premium || "NÃO ENCONTRADA",
            });

            // Validate required columns - try to find fallback
            if (!columnMapping.clientName) {
              // Try to find email column - we can use email as identifier if no name column
              const emailCol = headers.find((h) => {
                const hLower = h
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");
                return hLower.includes("email");
              });

              if (emailCol) {
                // Use email as client identifier if no name column found
                columnMapping.clientName = emailCol;
                console.log(
                  "Usando Email como identificador do cliente:",
                  emailCol,
                );
              } else {
                // Try to find any text column that might be names
                for (const header of headers) {
                  const headerLower = header
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
                  // Skip obvious non-name columns
                  if (
                    !headerLower.includes("telefone") &&
                    !headerLower.includes("data") &&
                    !headerLower.includes("email") &&
                    !headerLower.includes("vencimento") &&
                    !headerLower.includes("premio") &&
                    !headerLower.includes("comissao") &&
                    !headerLower.includes("iof") &&
                    !headerLower.includes("seguradora") &&
                    !headerLower.includes("produto") &&
                    !headerLower.includes("cpf") &&
                    !headerLower.includes("cnpj") &&
                    !headerLower.includes("placa") &&
                    !headerLower.includes("painel") &&
                    !headerLower.includes("alertas")
                  ) {
                    // Check first few rows to see if it contains text that looks like names
                    const sampleValues = jsonData
                      .slice(0, 5)
                      .map((row) => String(row[header] || "").trim())
                      .filter((v) => v && v.length > 2);

                    if (
                      sampleValues.length > 0 &&
                      sampleValues.some(
                        (v) =>
                          v.length > 3 &&
                          !v.match(/^\d+$/) &&
                          !v.match(/^\d{2}\/\d{2}\/\d{2,4}$/) &&
                          !v.match(/^[\d.,]+$/) &&
                          !v.includes("@"),
                      )
                    ) {
                      columnMapping.clientName = header;
                      console.log(
                        "Usando coluna como Nome do Cliente (fallback):",
                        header,
                      );
                      break;
                    }
                  }
                }
              }
            }

            if (!columnMapping.dueDate) {
              // Try to find date columns (string dates or Excel serial numbers)
              for (const header of headers) {
                const headerLower = header
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "");
                if (
                  headerLower.includes("vencimento") ||
                  (headerLower.includes("data") && headerLower.includes("venc"))
                ) {
                  columnMapping.dueDate = header;
                  console.log("Usando coluna como Vencimento:", header);
                  break;
                }
              }

              // If still not found, check data types in columns
              if (!columnMapping.dueDate) {
                for (const header of headers) {
                  const headerLower = header.toLowerCase();
                  if (
                    headerLower.includes("data") ||
                    headerLower.includes("venc")
                  ) {
                    // Check if this column has date-like values
                    const sampleValues = jsonData
                      .slice(0, 5)
                      .map((row) => row[header])
                      .filter((v) => v !== undefined && v !== null && v !== "");

                    const hasDates = sampleValues.some((v) => {
                      if (typeof v === "number" && v > 1 && v < 100000)
                        return true;
                      const str = String(v);
                      return (
                        str.match(/\d{2}\/\d{2}\/\d{2,4}/) ||
                        str.match(/\d{4}-\d{2}-\d{2}/)
                      );
                    });

                    if (hasDates) {
                      columnMapping.dueDate = header;
                      console.log(
                        "Usando coluna como Vencimento (fallback por conteúdo):",
                        header,
                      );
                      break;
                    }
                  }
                }
              }
            }

            // Validate required columns
            if (!columnMapping.clientName || !columnMapping.dueDate) {
              const detectedCols = Object.entries(columnMapping)
                .filter(([, value]) => value)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");

              // Show first row sample for debugging
              const firstRowSample =
                jsonData.length > 0
                  ? Object.entries(jsonData[0])
                      .slice(0, 5)
                      .map(
                        ([key, value]) =>
                          `${key}: ${String(value).substring(0, 30)}`,
                      )
                      .join("\n")
                  : "Nenhuma linha de dados";

              setStatus({
                type: "error",
                message: `Não foi possível detectar as colunas obrigatórias.\n\nColunas detectadas: ${detectedCols || "nenhuma"}\n\nColunas encontradas no arquivo (${headers.length}):\n${headers.join(", ")}\n\nAmostra da primeira linha:\n${firstRowSample}\n\nPor favor, verifique se o arquivo contém colunas com nomes como "Nome", "Cliente", "Vencimento", "Vencimento Apólice", etc.`,
              });
              setIsProcessing(false);
              return;
            }

            // Filter out completely empty rows (Excel often has formatting that extends to many rows)
            const rowsWithData = jsonData.filter((row) => {
              const values = Object.values(row);
              return values.some(
                (v) => v !== undefined && v !== null && String(v).trim() !== "",
              );
            });
            const emptyRowsSkipped = jsonData.length - rowsWithData.length;

            // Process rows (use jsonData.forEach to have rowIndex for formula cell lookup)
            const processedRows: ProcessedRow[] = [];
            let validationSkipped = 0;

            jsonData.forEach((row, rowIndex) => {
              // Skip empty rows
              const values = Object.values(row);
              if (
                !values.some(
                  (v) =>
                    v !== undefined && v !== null && String(v).trim() !== "",
                )
              ) {
                return;
              }
              // Get client name or use email as fallback
              let clientName = String(
                row[columnMapping.clientName] || "",
              ).trim();

              // If clientName column is actually email, use it
              if (!clientName && columnMapping.email) {
                const email = String(row[columnMapping.email] || "").trim();
                if (email) {
                  // Try to extract name from email (part before @)
                  const emailParts = email.split("@");
                  if (emailParts[0]) {
                    clientName = emailParts[0].replace(/[._]/g, " ").trim();
                  } else {
                    clientName = email;
                  }
                }
              }

              // Handle Excel date serial numbers and Date objects (Brazil timezone-safe)
              let dueDate: Date | null = null;
              const dueDateValue = row[columnMapping.dueDate];

              if (dueDateValue instanceof Date) {
                // XLSX with cellDates:true returns Date objects (UTC) - extract local date
                dueDate = new Date(
                  dueDateValue.getUTCFullYear(),
                  dueDateValue.getUTCMonth(),
                  dueDateValue.getUTCDate(),
                );
              } else if (typeof dueDateValue === "number") {
                if (dueDateValue > 1 && dueDateValue < 100000) {
                  dueDate = parseExcelSerial(dueDateValue);
                } else {
                  dueDate = parseDateFromExcel(String(dueDateValue));
                }
              } else {
                dueDate = parseDateFromExcel(String(dueDateValue || ""));
              }

              if (!clientName || !dueDate || isNaN(dueDate.getTime())) {
                validationSkipped++;
                return; // Skip invalid rows
              }

              const phone = columnMapping.phone
                ? String(row[columnMapping.phone] || "").trim()
                : undefined;
              const email = columnMapping.email
                ? String(row[columnMapping.email] || "").trim()
                : undefined;

              // Handle birthday - Excel serial, Date object, or string (Brazil timezone-safe)
              let birthday: Date | undefined = undefined;
              if (columnMapping.birthday) {
                const birthdayValue = row[columnMapping.birthday];
                if (birthdayValue instanceof Date) {
                  birthday = new Date(
                    birthdayValue.getUTCFullYear(),
                    birthdayValue.getUTCMonth(),
                    birthdayValue.getUTCDate(),
                  );
                } else if (
                  typeof birthdayValue === "number" &&
                  birthdayValue > 1 &&
                  birthdayValue < 100000
                ) {
                  const parsed = parseExcelSerial(birthdayValue);
                  if (!isNaN(parsed.getTime())) birthday = parsed;
                } else {
                  const parsed = parseDateFromExcel(
                    String(birthdayValue || ""),
                  );
                  if (parsed) birthday = parsed;
                }
              }
              const insurer = columnMapping.insurer
                ? String(row[columnMapping.insurer] || "").trim()
                : undefined;
              let product = columnMapping.product
                ? String(row[columnMapping.product] || "").trim()
                : undefined;
              // Resolve product code to name using "Código Produtos" sheet
              if (productCodeToName.size > 0 && columnMapping.product) {
                const productVal = row[columnMapping.product];
                if (productVal !== undefined && productVal !== null) {
                  const resolved =
                    typeof productVal === "number"
                      ? productCodeToName.get(productVal)
                      : productCodeToName.get(String(productVal)) ??
                        productCodeToName.get(Number(productVal));
                  if (resolved) product = resolved;
                }
              }
              const premiumStr = columnMapping.premium
                ? String(row[columnMapping.premium] || "")
                : undefined;
              const premium = premiumStr
                ? parseFloat(
                    premiumStr.replace(/[^\d,.-]/g, "").replace(",", "."),
                  )
                : undefined;

              // Helper function to parse numeric values (handles formulas, numbers, and formatted strings)
              // IMPORTANT: Only reads values from Excel, does NOT calculate anything
              const parseNumericValue = (value: any): number | undefined => {
                if (value === undefined || value === null || value === "")
                  return undefined;

                // If it's already a number, return it directly (Excel formulas are already calculated)
                if (typeof value === "number") {
                  // Excel sometimes returns very large numbers for dates - check if it's reasonable
                  if (value > 0 && value < 1e15) {
                    return value;
                  }
                  return undefined;
                }

                // If it's a string, try to parse it
                const str = String(value).trim();
                if (!str || str === "") return undefined;

                // Handle Brazilian format: "1.234,56" or "1234,56" or "1234.56"
                // Check if it has comma (Brazilian decimal separator)
                if (str.includes(",")) {
                  // Brazilian format: remove dots (thousands) and replace comma with dot
                  const cleaned = str
                    .replace(/[R$\s]/g, "")
                    .replace(/\./g, "")
                    .replace(",", ".");
                  const parsed = parseFloat(cleaned);
                  if (!isNaN(parsed) && parsed < 1e15) {
                    return parsed;
                  }
                } else if (str.includes(".")) {
                  // Could be US format or already parsed - try direct parse
                  const cleaned = str.replace(/[R$\s]/g, "");
                  const parsed = parseFloat(cleaned);
                  if (!isNaN(parsed) && parsed < 1e15) {
                    return parsed;
                  }
                } else {
                  // No separators, try direct parse
                  const cleaned = str.replace(/[R$\s]/g, "");
                  const parsed = parseFloat(cleaned);
                  if (!isNaN(parsed) && parsed < 1e15) {
                    return parsed;
                  }
                }

                return undefined;
              };

              // IOF - APENAS LER do Excel (já calculado pelas fórmulas)
              // NÃO calcular aqui - apenas ler o valor que vem do Excel
              const iofValue = columnMapping.iof
                ? row[columnMapping.iof]
                : undefined;
              const iof = parseNumericValue(iofValue);

              // Prêmio Líquido - APENAS LER do Excel (já calculado pelas fórmulas)
              const netPremiumValue = columnMapping.netPremium
                ? row[columnMapping.netPremium]
                : undefined;
              const netPremium = parseNumericValue(netPremiumValue);

              // Comissão - APENAS LER do Excel (já calculado pelas fórmulas)
              const commissionValue = columnMapping.commission
                ? row[columnMapping.commission]
                : undefined;
              const commission = parseNumericValue(commissionValue);

              // Extract commission rate from Excel formula if present
              let commissionRate: number | null = null;
              if (commissionColIndex >= 0) {
                const cellRef = XLSX.utils.encode_cell({
                  r: bestHeaderRow + 1 + rowIndex,
                  c: commissionColIndex,
                });
                const cell = worksheet[cellRef];
                if (cell?.f) {
                  commissionRate = extractCommissionRateFromFormula(cell.f);
                }
              }
              if (
                commission != null &&
                commission > 0 &&
                commissionRate == null &&
                (netPremium ?? 0) > 0
              ) {
                commissionRate =
                  Math.round((commission / (netPremium ?? 0)) * 1000) / 10;
              }

              // CPF/CNPJ column = policy number (número da apólice)
              // Never use dueDate column for policy number - they must be different columns
              const cpfCnpjIsSameAsDueDate =
                columnMapping.cpfCnpj &&
                columnMapping.dueDate &&
                columnMapping.cpfCnpj === columnMapping.dueDate;
              let cpfCnpjRaw: unknown =
                !cpfCnpjIsSameAsDueDate && columnMapping.cpfCnpj
                  ? row[columnMapping.cpfCnpj]
                  : undefined;
              if (rowIndex < 3) {
                console.log(`[IMPORT TRACE] Row ${rowIndex} - CPF/CNPJ step 1 (from columnMapping):`, {
                  cpfCnpjKey: columnMapping.cpfCnpj,
                  cpfCnpjRaw,
                  rowHasKey: columnMapping.cpfCnpj ? columnMapping.cpfCnpj in row : false,
                });
              }
              // Fallback: column key may not match (encoding, spacing) - scan row keys
              if (
                (cpfCnpjRaw === undefined ||
                  cpfCnpjRaw === null ||
                  String(cpfCnpjRaw).trim() === "") &&
                !cpfCnpjIsSameAsDueDate
              ) {
                cpfCnpjRaw = findCpfCnpjValueFromRow(row as Record<string, unknown>);
              }
              // Fallback: read directly from cell when JSON key fails (bypasses any key mismatch)
              if (
                (cpfCnpjRaw === undefined ||
                  cpfCnpjRaw === null ||
                  String(cpfCnpjRaw).trim() === "") &&
                cpfCnpjColIndex >= 0 &&
                !cpfCnpjIsSameAsDueDate
              ) {
                const cellRef = XLSX.utils.encode_cell({
                  r: bestHeaderRow + 1 + rowIndex,
                  c: cpfCnpjColIndex,
                });
                const cell = worksheet[cellRef];
                if (cell) {
                  if (cell.t === "s" && typeof cell.v === "string") {
                    cpfCnpjRaw = cell.v.trim();
                  } else if (cell.t === "n" && typeof cell.v === "number") {
                    cpfCnpjRaw = cell.v;
                  }
                }
              }
              if (
                cpfCnpjColIndex >= 0 &&
                (cpfCnpjRaw instanceof Date ||
                  (typeof cpfCnpjRaw === "number" &&
                    cpfCnpjRaw >= 1 &&
                    cpfCnpjRaw <= 2958465))
              ) {
                const cellRef = XLSX.utils.encode_cell({
                  r: bestHeaderRow + 1 + rowIndex,
                  c: cpfCnpjColIndex,
                });
                const cell = worksheet[cellRef];
                if (cell?.t === "s" && typeof cell.v === "string") {
                  cpfCnpjRaw = cell.v.trim();
                }
              }
              // Never use policyNumber column if it's the same as dueDate (vencimento)
              const policyNumberIsSameAsDueDate =
                columnMapping.policyNumber &&
                columnMapping.dueDate &&
                columnMapping.policyNumber === columnMapping.dueDate;
              const policyNumberColRaw =
                !policyNumberIsSameAsDueDate && columnMapping.policyNumber
                  ? row[columnMapping.policyNumber]
                  : undefined;
              let policyNumber =
                extractPolicyNumberFromCell(policyNumberColRaw) ??
                extractPolicyNumberFromCell(cpfCnpjRaw);
              // If policyNumber equals dueDate (M/d/yy), we're reading the vencimento column - discard it
              if (policyNumber) {
                const dueDateStr = `${dueDate.getMonth() + 1}/${dueDate.getDate()}/${dueDate.getFullYear() % 100}`;
                if (policyNumber === dueDateStr) policyNumber = undefined;
              }

              if (rowIndex < 3) {
                console.log(`[IMPORT TRACE] Row ${rowIndex} CPF/Policy flow:`, {
                  rowIndex,
                  clientName,
                  rowCpfCnpjKey: columnMapping.cpfCnpj
                    ? row[columnMapping.cpfCnpj]
                    : "no key",
                  cpfCnpjRaw,
                  cpfCnpjRawType: typeof cpfCnpjRaw,
                  policyNumberColRaw,
                  policyNumberAfterExtract: extractPolicyNumberFromCell(
                    policyNumberColRaw,
                  ),
                  policyNumberFromCpf: extractPolicyNumberFromCell(cpfCnpjRaw),
                  policyNumberFinal: policyNumber,
                });
              }

              const plate = columnMapping.plate
                ? String(row[columnMapping.plate] || "").trim()
                : undefined;

              // Create unique key: policy number + due date, or PLACA + due date, or client name + due date
              const uniqueKey = policyNumber
                ? `${policyNumber}_${dueDate.toISOString()}`
                : plate
                  ? `${plate}_${dueDate.toISOString()}`
                  : `${clientName}_${dueDate.toISOString()}`;

              processedRows.push({
                clientName,
                dueDate,
                birthday: birthday || undefined,
                phone,
                email,
                insurer,
                product,
                premium: isNaN(premium || 0) ? undefined : premium,
                iof: isNaN(iof || 0) ? undefined : iof,
                netPremium: isNaN(netPremium || 0) ? undefined : netPremium,
                commission: isNaN(commission || 0) ? undefined : commission,
                commissionRate,
                policyNumber,
                cpfCnpj: policyNumber,
                plate,
                uniqueKey,
              });
            });

            console.log("[IMPORT TRACE] ProcessedRows sample (first 5):", processedRows.slice(0, 5).map((r, i) => ({
              i, clientName: r.clientName, policyNumber: r.policyNumber, cpfCnpj: r.cpfCnpj, plate: r.plate, insurer: r.insurer,
            })));
            console.log("[IMPORT TRACE] ProcessedRows policyNumber stats:", {
              total: processedRows.length,
              withPolicyNumber: processedRows.filter((r) => r.policyNumber).length,
              withoutPolicyNumber: processedRows.filter((r) => !r.policyNumber).length,
            });

            // Fetch fresh data from database to check for duplicates (more reliable)
            // Using higher limit for duplicate checking (up to 10k records)
            console.log(
              "Buscando dados do banco para verificação de duplicatas...",
            );
            const existingPoliciesWithClients = await getPoliciesWithClients({
              limit: 10000,
            });
            const existingClients = await getClients({ limit: 10000 });

            // Build comprehensive set of unique keys from database
            const existingUniqueKeys = new Set<string>();

            existingPoliciesWithClients.forEach((p) => {
              const client = p.client;
              if (!client) return;

              const dueDate =
                typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate;
              const dueDateStr = formatDateForStorage(dueDate);

              // Normalize client name for comparison
              const normalizedClientName = client.name.toLowerCase().trim();

              // Try to match by CPF/CNPJ, PLACA, or client name
              const policyNotes = p.notes || "";
              const hasPlate = policyNotes.includes("Placa:");
              const plateMatch = hasPlate
                ? policyNotes.match(/Placa:\s*(\w+)/i)?.[1]?.toUpperCase()
                : null;

              // Create multiple possible unique keys for better matching
              if (p.policyNumber) {
                const normalizedPolicyNumber = String(p.policyNumber).replace(
                  /\D/g,
                  "",
                ); // Remove non-digits
                if (normalizedPolicyNumber) {
                  existingUniqueKeys.add(
                    `${normalizedPolicyNumber}_${dueDateStr}`,
                  );
                }
              }
              if (plateMatch) {
                existingUniqueKeys.add(`${plateMatch}_${dueDateStr}`);
              }
              // Use normalized client name + date
              existingUniqueKeys.add(`${normalizedClientName}_${dueDateStr}`);

              // Also check by email if available
              if (client.email) {
                const normalizedEmail = client.email.toLowerCase().trim();
                existingUniqueKeys.add(`${normalizedEmail}_${dueDateStr}`);
              }
            });

            // Normalize and filter out duplicates from processed rows
            const newRows = processedRows.filter((row) => {
              const dueDate =
                typeof row.dueDate === "string"
                  ? new Date(row.dueDate)
                  : row.dueDate;
              const dueDateStr = formatDateForStorage(dueDate);

              const normalizedClientName = row.clientName.toLowerCase().trim();

              // Check multiple possible keys
              const keysToCheck: string[] = [];

              // CPF/CNPJ + date
              if (row.cpfCnpj) {
                const normalizedCpfCnpj = row.cpfCnpj.replace(/\D/g, "");
                if (normalizedCpfCnpj) {
                  keysToCheck.push(`${normalizedCpfCnpj}_${dueDateStr}`);
                }
              }

              // Plate + date
              if (row.plate) {
                keysToCheck.push(`${row.plate.toUpperCase()}_${dueDateStr}`);
              }

              // Client name + date
              keysToCheck.push(`${normalizedClientName}_${dueDateStr}`);

              // Email + date
              if (row.email) {
                keysToCheck.push(
                  `${row.email.toLowerCase().trim()}_${dueDateStr}`,
                );
              }

              // Check if any of the keys already exist
              return !keysToCheck.some((key) => existingUniqueKeys.has(key));
            });

            const duplicateSkipped = processedRows.length - newRows.length;

            console.log(
              `Import stats: ${jsonData.length} total rows, ${validationSkipped} validation skipped, ${processedRows.length} valid, ${duplicateSkipped} duplicates, ${newRows.length} new`,
            );

            if (newRows.length === 0) {
              setStatus({
                type: "error",
                message: `Todas as ${processedRows.length} linhas já existem no sistema. Nenhuma nova linha foi importada.`,
              });
              setIsProcessing(false);
              return;
            }

            // Group clients by name (to avoid duplicates)
            const clientMap = new Map<
              string,
              { client: Omit<Client, "id">; rows: ProcessedRow[] }
            >();

            newRows.forEach((row) => {
              const clientKey = row.clientName.toLowerCase();
              if (!clientMap.has(clientKey)) {
                clientMap.set(clientKey, {
                  client: {
                    name: row.clientName,
                    phone: row.phone,
                    email: row.email,
                    birthday: row.birthday,
                  },
                  rows: [],
                });
              }
              clientMap.get(clientKey)!.rows.push(row);
            });

            // Create or get client IDs - use fresh data from database
            const clientIdMap = new Map<string, string>(); // clientKey -> clientId

            // Build a map of existing clients with multiple matching keys
            const existingClientMap = new Map<string, Client>();
            existingClients.forEach((c) => {
              const nameKey = c.name.toLowerCase().trim();
              existingClientMap.set(nameKey, c);

              // Also index by email if available
              if (c.email) {
                const emailKey = c.email.toLowerCase().trim();
                existingClientMap.set(`email:${emailKey}`, c);
              }

              // Also index by phone if available
              if (c.phone) {
                const phoneKey = c.phone.replace(/\D/g, ""); // Remove non-digits
                if (phoneKey) {
                  existingClientMap.set(`phone:${phoneKey}`, c);
                }
              }
            });

            // First, check existing clients using multiple criteria
            clientMap.forEach(({ client }, clientKey) => {
              // Try to match by name
              const existingByName = existingClientMap.get(clientKey);
              if (existingByName) {
                clientIdMap.set(clientKey, existingByName.id);
                return;
              }

              // Try to match by email
              if (client.email) {
                const emailKey = `email:${client.email.toLowerCase().trim()}`;
                const existingByEmail = existingClientMap.get(emailKey);
                if (existingByEmail) {
                  clientIdMap.set(clientKey, existingByEmail.id);
                  return;
                }
              }

              // Try to match by phone
              if (client.phone) {
                const phoneKey = `phone:${client.phone.replace(/\D/g, "")}`;
                const existingByPhone = existingClientMap.get(phoneKey);
                if (existingByPhone) {
                  clientIdMap.set(clientKey, existingByPhone.id);
                  return;
                }
              }
            });

            // Create only truly new clients
            const clientsToCreate = Array.from(clientMap.entries())
              .filter(([clientKey]) => !clientIdMap.has(clientKey))
              .map(([, { client }]) => client);

            let createdClients: Client[] = [];
            if (clientsToCreate.length > 0) {
              console.log(
                `Criando ${clientsToCreate.length} novo(s) cliente(s)...`,
              );
              createdClients = await createClientsBatch(clientsToCreate);

              // Map new client IDs
              let createdIndex = 0;
              clientMap.forEach((_, clientKey) => {
                if (!clientIdMap.has(clientKey)) {
                  clientIdMap.set(clientKey, createdClients[createdIndex].id);
                  createdIndex++;
                }
              });
            } else {
              console.log("Todos os clientes já existem no banco de dados.");
            }

            // Create policies
            const policiesToCreate: Omit<Policy, "id">[] = [];

            clientMap.forEach(({ rows }, clientKey) => {
              const clientId = clientIdMap.get(clientKey);
              if (!clientId) return;

              rows.forEach((row) => {
                const notes = buildNotesWithCommission(
                  row.premium ?? 0,
                  row.plate,
                  row.commission,
                  row.commissionRate ?? 15,
                );

                policiesToCreate.push({
                  clientId,
                  policyNumber: row.policyNumber || undefined,
                  insurer: row.insurer,
                  product: row.product,
                  dueDate: row.dueDate,
                  premium: row.premium,
                  status: "active",
                  notes,
                });
              });
            });

            console.log("[IMPORT TRACE] Policies to INSERT (first 5):", policiesToCreate.slice(0, 5).map((p, i) => ({
              idx: i,
              policyNumber: p.policyNumber,
              insurer: p.insurer,
              product: p.product,
            })));

            console.log("[IMPORT TRACE] Policies to insert (first 3):", policiesToCreate.slice(0, 3).map((p) => ({ clientId: p.clientId?.slice(0, 8) + "...", policy_number: p.policyNumber, insurer: p.insurer, dueDate: p.dueDate })));

            // Create policies
            if (policiesToCreate.length > 0) {
              await createPoliciesBatchFn(policiesToCreate as Policy[]);
            }

            setStatus({
              type: "success",
              message: `Importação concluída com sucesso!`,
              stats: {
                clients: createdClients.length,
                policies: policiesToCreate.length,
                totalRows: jsonData.length,
                emptyRowsSkipped,
                validationSkipped,
                duplicateSkipped,
              },
            });
          } catch (error) {
            console.error("Error processing file:", error);
            setStatus({
              type: "error",
              message: `Erro ao processar o arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            });
          } finally {
            setIsProcessing(false);
          }
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("Error reading file:", error);
        setStatus({ type: "error", message: "Erro ao ler o arquivo Excel" });
        setIsProcessing(false);
      }
    },
    [createClientsBatch, createPoliciesBatchFn],
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      if (!isProcessing) setIsDragging(true);
    },
    [isProcessing],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isProcessing) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
      ];
      const validExt = /\.(xlsx|xlsm|xls)$/i;
      if (!validTypes.includes(file.type) && !validExt.test(file.name)) {
        setStatus({
          type: "error",
          message: "Arquivo inválido. Use .xlsx, .xlsm ou .xls",
        });
        return;
      }
      processFile(file);
    },
    [isProcessing, processFile],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-2">
            Importar Dados
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Faça upload do arquivo Excel e os dados serão importados
            automaticamente
          </p>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx, .xlsm, .xls). As colunas serão
              detectadas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-lg border-2 border-dashed p-6 sm:p-8 lg:p-12 transition-colors cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer w-full text-center block"
                >
                  <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin text-primary" />
                        <span className="text-sm sm:text-base lg:text-lg font-medium">
                          Processando arquivo...
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground" />
                        <div className="text-center">
                          <span className="text-sm sm:text-base lg:text-lg font-medium">
                            Clique para fazer upload
                          </span>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            ou arraste o arquivo aqui
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xlsm,.xls"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />

                {status.type !== "idle" && (
                  <div
                    className={`rounded-lg p-4 ${
                      status.type === "success"
                        ? "bg-green-950/20 border border-green-900"
                        : "bg-red-950/20 border border-red-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {status.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium whitespace-pre-line ${
                            status.type === "success"
                              ? "text-green-100"
                              : "text-red-100"
                          }`}
                        >
                          {status.message}
                        </p>
                        {status.stats && (
                          <div className="mt-2 space-y-1 text-sm text-green-200">
                            <p>• {status.stats.clients} cliente(s) criado(s)</p>
                            <p>
                              • {status.stats.policies} apólice(s) criada(s)
                            </p>
                            <p>
                              • {status.stats.totalRows} linha(s) no arquivo
                            </p>
                            {status.stats.emptyRowsSkipped > 0 && (
                              <p>
                                • {status.stats.emptyRowsSkipped} linha(s)
                                vazia(s) ignorada(s)
                              </p>
                            )}
                            {status.stats.validationSkipped > 0 && (
                              <p>
                                • {status.stats.validationSkipped} ignorada(s)
                                por validação (sem nome ou data)
                              </p>
                            )}
                            {status.stats.duplicateSkipped > 0 && (
                              <p>
                                • {status.stats.duplicateSkipped} duplicata(s)
                                ignorada(s)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
