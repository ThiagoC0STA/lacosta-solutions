"use client";

import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { parseDate } from "@/lib/date-helpers";
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
  cpfCnpj?: string;
  plate?: string;
  uniqueKey: string; // CPF/CNPJ + VENCIMENTO ou PLACA + VENCIMENTO
}

// Auto-detect column mapping based on header names
function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  headers.forEach((header) => {
    const headerLower = header.toLowerCase().trim();
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
    if (headerNormalized.includes("telefone") || headerNormalized.includes("fone")) {
      if (headerNormalized.includes("celular") || headerNormalized.includes("cel")) {
        mapping.phone = header;
      } else if (headerNormalized.includes("comercial") || headerNormalized.includes("comerc")) {
        if (!mapping.phone || !mapping.phone.toLowerCase().includes("celular")) {
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
    if (!mapping.birthday && (
      headerNormalized.includes("nascimento") ||
      headerNormalized.includes("aniversario") ||
      headerNormalized.includes("datanasc")
    )) {
      mapping.birthday = header;
    }
    
    // Vencimento - várias variações
    if (!mapping.dueDate) {
      if (
        headerNormalized.includes("vencimento") ||
        headerNormalized.includes("venc") ||
        headerNormalized.includes("vencimentoapolice") ||
        headerNormalized.includes("vencimentoapol") ||
        headerLower.includes("vencimento apólice") ||
        headerLower.includes("vencimento apolice") ||
        headerLower.includes("data vencimento") ||
        headerLower.match(/vencimento.*apol/i)
      ) {
        mapping.dueDate = header;
      }
    }
    
    // Seguradora
    if (!mapping.insurer && (
      headerNormalized.includes("seguradora") ||
      headerNormalized.includes("segurado")
    )) {
      mapping.insurer = header;
    }
    
    // Produto
    if (!mapping.product && (
      headerNormalized.includes("produto") ||
      headerNormalized.includes("prod") ||
      headerNormalized.includes("produt")
    )) {
      mapping.product = header;
    }
    
    // Prêmio - várias variações
    if (!mapping.premium && (
      headerNormalized.includes("premio") ||
      headerNormalized.includes("premium") ||
      headerNormalized.includes("premiototal") ||
      headerNormalized.includes("premio total")
    )) {
      mapping.premium = header;
    }
    
    // CPF/CNPJ
    if (!mapping.cpfCnpj && (
      headerNormalized.includes("cpf") ||
      headerNormalized.includes("cnpj") ||
      headerNormalized.includes("cpfcnpj")
    )) {
      mapping.cpfCnpj = header;
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
    if (!mapping.netPremium && (
      headerNormalized.includes("premioliquido") ||
      headerNormalized.includes("premio liquido") ||
      (headerNormalized.includes("premio") && headerNormalized.includes("liquido"))
    )) {
      mapping.netPremium = header;
    }
    
    // Comissão
    if (!mapping.commission && (
      headerNormalized.includes("comissao") ||
      headerNormalized.includes("comiss")
    )) {
      mapping.commission = header;
    }
  });
  
  return mapping;
}

export default function ImportPage() {
  const { createClientsBatch } = useClients();
  const { createPoliciesBatch: createPoliciesBatchFn } = usePolicies();
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
    stats?: { clients: number; policies: number; skipped: number };
  }>({ type: "idle", message: "" });

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setStatus({ type: "idle", message: "" });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true, cellNF: false, cellText: false });
          
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
              raw: false 
            }) as any[][];
            
            console.log(`\n=== Analisando planilha: ${sheetName} ===`);
            console.log(`Total de linhas: ${arrayData.length}`);
            if (arrayData.length > 0) {
              console.log(`Primeira linha tem ${arrayData[0].length} colunas`);
              console.log("Primeiras 3 linhas:", arrayData.slice(0, 3).map(r => r.filter(c => c).slice(0, 5)));
            }
            
            // Search for header row in this sheet - check ALL rows
            for (let i = 0; i < arrayData.length; i++) {
              const row = arrayData[i];
              if (!row || row.length === 0) continue;
              
              // Get all cells from this row (including empty ones to preserve column positions)
              const cells = row.map(cell => String(cell || "").trim());
              const nonEmptyCells = cells.filter(c => c);
              
              // Need at least 8 columns to be a data table
              if (nonEmptyCells.length < 8 || cells.length < 8) continue;
              
              const rowText = nonEmptyCells.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              
              // Skip rows that are clearly not headers
              if (rowText.includes("painel") || 
                  rowText.includes("alertas") ||
                  rowText.includes("vencimentos por mes") ||
                  rowText.includes("vencidos antes") ||
                  rowText.includes("vence em") ||
                  rowText.includes("mes qtde") ||
                  nonEmptyCells.every(c => c.match(/^[\d.,]+$/) || c.match(/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/\w+$/i))) {
                continue;
              }
              
              // Check each cell individually for header keywords
              let score = 0;
              const foundHeaders: string[] = [];
              
              cells.forEach((cell) => {
                if (!cell) return;
                const cellLower = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                if (cellLower.includes("telefone") || cellLower.includes("fone")) {
                  score += 4;
                  foundHeaders.push(cell);
                }
                if (cellLower.includes("vencimento") && (cellLower.includes("apolice") || cellLower.includes("apol"))) {
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
                if (cellLower.includes("nascimento") || cellLower.includes("aniversario")) {
                  score += 3;
                  foundHeaders.push(cell);
                }
                if (cellLower.includes("produto") || cellLower.includes("prod")) {
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
                if (cellLower.includes("liquido") || (cellLower.includes("premio") && cellLower.includes("liquido"))) {
                  score += 3;
                  foundHeaders.push(cell);
                }
                if (cellLower.includes("comissao") || cellLower.includes("comiss")) {
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
                console.log(`  Linha ${i}: score=${score}, colunas=${cells.length}, headers:`, foundHeaders.slice(0, 8));
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestHeaderRow = i;
                bestSheet = sheetName;
                bestArrayData = arrayData;
              }
            }
          }
          
          if (bestHeaderRow === -1 || bestScore < 8) {
            // Show what was found
            const allSheetsInfo = workbook.SheetNames.map(name => {
              const ws = workbook.Sheets[name];
              const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
              return `${name}: ${arr.length} linhas, primeira linha tem ${arr[0]?.length || 0} colunas`;
            }).join("\n");
            
            setStatus({ 
              type: "error", 
              message: `Não foi possível encontrar os dados no arquivo.\n\nPlanilhas encontradas:\n${allSheetsInfo}\n\nMelhor score encontrado: ${bestScore}\n\nPor favor, verifique se o arquivo contém uma planilha com colunas como:\n"TELEFONE CASA", "TELEFONE COMERCIAL", "VENCIMENTO APÓLICE", "SEGURADORA", "EMAIL", "CPF/CNPJ", "PLACA", etc.` 
            });
            setIsProcessing(false);
            return;
          }
          
          console.log(`\n✓ Melhor resultado: Planilha "${bestSheet}", linha ${bestHeaderRow} (score: ${bestScore})`);
          console.log("Headers encontrados:", bestArrayData[bestHeaderRow].filter(c => c));
          
          // Now read with the correct sheet and header row - read COMPLETE sheet
          // Use raw: false to get calculated values from formulas (Excel formulas are already calculated)
          const worksheet = workbook.Sheets[bestSheet];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { 
            header: bestHeaderRow,
            defval: "",
            raw: false // This ensures formulas are calculated and we get the actual values
            // Don't specify range - read everything
          });
          
          if (jsonData.length === 0) {
            setStatus({ type: "error", message: "O arquivo está vazio ou não foi possível ler os dados" });
            setIsProcessing(false);
            return;
          }

          // Auto-detect columns
          const headers = Object.keys(jsonData[0]);
          const columnMapping = detectColumnMapping(headers);
          
          // Debug: show detected columns
          console.log("Headers encontrados:", headers);
          console.log(`✓ Total de linhas de dados lidas: ${jsonData.length}`);
          console.log("Primeira linha de dados:", jsonData[0]);
          if (jsonData.length > 1) {
            console.log("Última linha de dados:", jsonData[jsonData.length - 1]);
          }
          console.log("Mapeamento detectado:", columnMapping);
          console.log("Colunas financeiras detectadas:", {
            iof: columnMapping.iof || "NÃO ENCONTRADA",
            netPremium: columnMapping.netPremium || "NÃO ENCONTRADA",
            commission: columnMapping.commission || "NÃO ENCONTRADA",
            premium: columnMapping.premium || "NÃO ENCONTRADA"
          });
          
          // Validate required columns - try to find fallback
          if (!columnMapping.clientName) {
            // Try to find email column - we can use email as identifier if no name column
            const emailCol = headers.find(h => {
              const hLower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              return hLower.includes("email");
            });
            
            if (emailCol) {
              // Use email as client identifier if no name column found
              columnMapping.clientName = emailCol;
              console.log("Usando Email como identificador do cliente:", emailCol);
            } else {
              // Try to find any text column that might be names
              for (const header of headers) {
                const headerLower = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                // Skip obvious non-name columns
                if (!headerLower.includes("telefone") && 
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
                    !headerLower.includes("alertas")) {
                  // Check first few rows to see if it contains text that looks like names
                  const sampleValues = jsonData.slice(0, 5)
                    .map(row => String(row[header] || "").trim())
                    .filter(v => v && v.length > 2);
                  
                  if (sampleValues.length > 0 && 
                      sampleValues.some(v => 
                        v.length > 3 && 
                        !v.match(/^\d+$/) && 
                        !v.match(/^\d{2}\/\d{2}\/\d{2,4}$/) &&
                        !v.match(/^[\d.,]+$/) &&
                        !v.includes("@")
                      )) {
                    columnMapping.clientName = header;
                    console.log("Usando coluna como Nome do Cliente (fallback):", header);
                    break;
                  }
                }
              }
            }
          }
          
          if (!columnMapping.dueDate) {
            // Try to find date columns (string dates or Excel serial numbers)
            for (const header of headers) {
              const headerLower = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (headerLower.includes("vencimento") || 
                  (headerLower.includes("data") && headerLower.includes("venc"))) {
                columnMapping.dueDate = header;
                console.log("Usando coluna como Vencimento:", header);
                break;
              }
            }
            
            // If still not found, check data types in columns
            if (!columnMapping.dueDate) {
              for (const header of headers) {
                const headerLower = header.toLowerCase();
                if (headerLower.includes("data") || headerLower.includes("venc")) {
                  // Check if this column has date-like values
                  const sampleValues = jsonData.slice(0, 5)
                    .map(row => row[header])
                    .filter(v => v !== undefined && v !== null && v !== "");
                  
                  const hasDates = sampleValues.some(v => {
                    if (typeof v === "number" && v > 1 && v < 100000) return true;
                    const str = String(v);
                    return str.match(/\d{2}\/\d{2}\/\d{2,4}/) || str.match(/\d{4}-\d{2}-\d{2}/);
                  });
                  
                  if (hasDates) {
                    columnMapping.dueDate = header;
                    console.log("Usando coluna como Vencimento (fallback por conteúdo):", header);
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
            const firstRowSample = jsonData.length > 0 
              ? Object.entries(jsonData[0])
                  .slice(0, 5)
                  .map(([key, value]) => `${key}: ${String(value).substring(0, 30)}`)
                  .join("\n")
              : "Nenhuma linha de dados";
            
            setStatus({ 
              type: "error", 
              message: `Não foi possível detectar as colunas obrigatórias.\n\nColunas detectadas: ${detectedCols || "nenhuma"}\n\nColunas encontradas no arquivo (${headers.length}):\n${headers.join(", ")}\n\nAmostra da primeira linha:\n${firstRowSample}\n\nPor favor, verifique se o arquivo contém colunas com nomes como "Nome", "Cliente", "Vencimento", "Vencimento Apólice", etc.` 
            });
            setIsProcessing(false);
            return;
          }

          // Process rows
          const processedRows: ProcessedRow[] = [];
          
          jsonData.forEach((row) => {
            // Get client name or use email as fallback
            let clientName = String(row[columnMapping.clientName] || "").trim();
            
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
            
            // Handle Excel date serial numbers
            let dueDate: Date | null = null;
            const dueDateValue = row[columnMapping.dueDate];
            
            if (typeof dueDateValue === "number") {
              // Excel serial date (days since 1900-01-01)
              // Excel's epoch starts on 1900-01-01, but Excel incorrectly treats 1900 as a leap year
              // Only treat as Excel date if it's a reasonable date serial number
              if (dueDateValue > 1 && dueDateValue < 100000) {
                const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
                dueDate = new Date(excelEpoch.getTime() + dueDateValue * 24 * 60 * 60 * 1000);
              } else {
                // Might be a year number (like 26), convert to date string first
                const dateStr = String(dueDateValue);
                dueDate = parseDate(dateStr);
              }
            } else {
              const dueDateStr = String(dueDateValue || "");
              dueDate = parseDate(dueDateStr);
            }
            
            if (!clientName || !dueDate || isNaN(dueDate.getTime())) {
              return; // Skip invalid rows
            }

            const phone = columnMapping.phone ? String(row[columnMapping.phone] || "").trim() : undefined;
            const email = columnMapping.email ? String(row[columnMapping.email] || "").trim() : undefined;
            
            // Handle birthday - can be Excel serial number or string
            let birthday: Date | undefined = undefined;
            if (columnMapping.birthday) {
              const birthdayValue = row[columnMapping.birthday];
              if (typeof birthdayValue === "number") {
                const excelEpoch = new Date(1899, 11, 30);
                const parsed = new Date(excelEpoch.getTime() + birthdayValue * 24 * 60 * 60 * 1000);
                if (!isNaN(parsed.getTime())) {
                  birthday = parsed;
                }
              } else {
                const birthdayStr = String(birthdayValue || "");
                const parsed = parseDate(birthdayStr);
                if (parsed) {
                  birthday = parsed;
                }
              }
            }
            const insurer = columnMapping.insurer ? String(row[columnMapping.insurer] || "").trim() : undefined;
            const product = columnMapping.product ? String(row[columnMapping.product] || "").trim() : undefined;
            const premiumStr = columnMapping.premium ? String(row[columnMapping.premium] || "") : undefined;
            const premium = premiumStr ? parseFloat(premiumStr.replace(/[^\d,.-]/g, "").replace(",", ".")) : undefined;
            
            // Helper function to parse numeric values (handles formulas, numbers, and formatted strings)
            // IMPORTANT: Only reads values from Excel, does NOT calculate anything
            const parseNumericValue = (value: any): number | undefined => {
              if (value === undefined || value === null || value === "") return undefined;
              
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
                const cleaned = str.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
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
            const iofValue = columnMapping.iof ? row[columnMapping.iof] : undefined;
            const iof = parseNumericValue(iofValue);
            
            // Prêmio Líquido - APENAS LER do Excel (já calculado pelas fórmulas)
            const netPremiumValue = columnMapping.netPremium ? row[columnMapping.netPremium] : undefined;
            const netPremium = parseNumericValue(netPremiumValue);
            
            // Comissão - APENAS LER do Excel (já calculado pelas fórmulas)
            const commissionValue = columnMapping.commission ? row[columnMapping.commission] : undefined;
            const commission = parseNumericValue(commissionValue);
            
            const cpfCnpj = columnMapping.cpfCnpj ? String(row[columnMapping.cpfCnpj] || "").trim() : undefined;
            const plate = columnMapping.plate ? String(row[columnMapping.plate] || "").trim() : undefined;

            // Create unique key: CPF/CNPJ + VENCIMENTO or PLACA + VENCIMENTO
            const uniqueKey = cpfCnpj 
              ? `${cpfCnpj}_${dueDate.toISOString()}`
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
              cpfCnpj,
              plate,
              uniqueKey,
            });
          });

          // Fetch fresh data from database to check for duplicates (more reliable)
          // Using higher limit for duplicate checking (up to 10k records)
          console.log("Buscando dados do banco para verificação de duplicatas...");
          const existingPoliciesWithClients = await getPoliciesWithClients({ limit: 10000 });
          const existingClients = await getClients({ limit: 10000 });
          
          // Build comprehensive set of unique keys from database
          const existingUniqueKeys = new Set<string>();
          
          existingPoliciesWithClients.forEach((p) => {
            const client = p.client;
            if (!client) return;
            
            const dueDate = typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate;
            const dueDateStr = dueDate.toISOString().split("T")[0]; // Use date only (YYYY-MM-DD)
            
            // Normalize client name for comparison
            const normalizedClientName = client.name.toLowerCase().trim();
            
            // Try to match by CPF/CNPJ, PLACA, or client name
            const policyNotes = p.notes || "";
            const hasPlate = policyNotes.includes("Placa:");
            const plateMatch = hasPlate ? policyNotes.match(/Placa:\s*(\w+)/i)?.[1]?.toUpperCase() : null;
            
            // Create multiple possible unique keys for better matching
            if (p.policyNumber) {
              const normalizedPolicyNumber = String(p.policyNumber).replace(/\D/g, ""); // Remove non-digits
              if (normalizedPolicyNumber) {
                existingUniqueKeys.add(`${normalizedPolicyNumber}_${dueDateStr}`);
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
            const dueDateStr = (typeof row.dueDate === "string" 
              ? new Date(row.dueDate) 
              : row.dueDate).toISOString().split("T")[0];
            
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
              keysToCheck.push(`${row.email.toLowerCase().trim()}_${dueDateStr}`);
            }
            
            // Check if any of the keys already exist
            return !keysToCheck.some(key => existingUniqueKeys.has(key));
          });
          
          const skipped = processedRows.length - newRows.length;
          
          console.log(`Verificação de duplicatas: ${processedRows.length} linhas processadas, ${skipped} duplicatas encontradas, ${newRows.length} novas linhas`);

          if (newRows.length === 0) {
            setStatus({ 
              type: "error", 
              message: `Todas as ${processedRows.length} linhas já existem no sistema. Nenhuma nova linha foi importada.` 
            });
            setIsProcessing(false);
            return;
          }

          // Group clients by name (to avoid duplicates)
          const clientMap = new Map<string, { client: Omit<Client, "id">; rows: ProcessedRow[] }>();
          
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
            console.log(`Criando ${clientsToCreate.length} novo(s) cliente(s)...`);
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
              // Helper to format currency in Brazilian format
              const formatCurrency = (value: number): string => {
                // First format with 2 decimals
                const parts = value.toFixed(2).split(".");
                const integerPart = parts[0];
                const decimalPart = parts[1];
                
                // Add thousand separators to integer part
                const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                
                // Return in Brazilian format: "1.234,56"
                return `${formattedInteger},${decimalPart}`;
              };
              
              // Build notes with all additional information
              const notesParts: string[] = [];
              if (row.plate) notesParts.push(`Placa: ${row.plate}`);
              
              // Save values - only if they are valid numbers and reasonable (not Excel serial dates)
              // Values should be reasonable monetary amounts (less than 1 billion)
              if (row.iof !== undefined && !isNaN(row.iof) && row.iof >= 0 && row.iof < 1e9) {
                notesParts.push(`IOF: R$ ${formatCurrency(row.iof)}`);
              }
              if (row.netPremium !== undefined && !isNaN(row.netPremium) && row.netPremium >= 0 && row.netPremium < 1e9) {
                notesParts.push(`Prêmio Líquido: R$ ${formatCurrency(row.netPremium)}`);
              }
              if (row.commission !== undefined && !isNaN(row.commission) && row.commission >= 0 && row.commission < 1e9) {
                notesParts.push(`Comissão: R$ ${formatCurrency(row.commission)}`);
              }
              
              const finalNotes = notesParts.length > 0 ? notesParts.join(" | ") : undefined;
              
              policiesToCreate.push({
                clientId,
                policyNumber: row.cpfCnpj || row.plate || undefined,
                insurer: row.insurer,
                product: row.product,
                dueDate: row.dueDate,
                premium: row.premium,
                status: "active",
                notes: finalNotes,
              });
            });
      });

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
              skipped,
            },
          });

    } catch (error) {
          console.error("Error processing file:", error);
          setStatus({ 
            type: "error", 
            message: `Erro ao processar o arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}` 
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
  }, [createClientsBatch, createPoliciesBatchFn]);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      processFile(file);
    },
    [processFile]
  );


  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-2">
            Importar Dados
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Faça upload do arquivo Excel e os dados serão importados automaticamente
          </p>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx, .xlsm, .xls). As colunas serão detectadas automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
                <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-lg border-2 border-dashed border-border p-6 sm:p-8 lg:p-12 hover:bg-accent transition-colors">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin text-primary" />
                      <span className="text-sm sm:text-base lg:text-lg font-medium">Processando arquivo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground" />
                      <div className="text-center">
                        <span className="text-sm sm:text-base lg:text-lg font-medium">Clique para fazer upload</span>
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
                <div className={`rounded-lg p-4 ${
                  status.type === "success" 
                    ? "bg-green-950/20 border border-green-900"
                    : "bg-red-950/20 border border-red-900"
                }`}>
                  <div className="flex items-start gap-3">
                    {status.type === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium whitespace-pre-line ${
                        status.type === "success" 
                          ? "text-green-100"
                          : "text-red-100"
                      }`}>
                        {status.message}
                      </p>
                      {status.stats && (
                        <div className="mt-2 space-y-1 text-sm text-green-200">
                          <p>• {status.stats.clients} cliente(s) criado(s)</p>
                          <p>• {status.stats.policies} apólice(s) criada(s)</p>
                          {status.stats.skipped > 0 && (
                            <p>• {status.stats.skipped} linha(s) duplicada(s) ignorada(s)</p>
                          )}
                </div>
              )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

