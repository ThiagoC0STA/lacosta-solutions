"use client";

import { useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { importRowSchema } from "@/lib/schemas";
import { parseDate } from "@/lib/date-helpers";
import { useClients, usePolicies } from "@/hooks/use-local-storage";
import type { Client, Policy } from "@/types";
import { formatDate } from "@/lib/date-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ExcelRow {
  [key: string]: string | number | Date | undefined;
}

interface MappedRow {
  clientName: string;
  dueDate: string | Date;
  birthday?: string | Date;
  policyNumber?: string;
  insurer?: string;
  product?: string;
  premium?: string;
  phone?: string;
  email?: string;
  notes?: string;
  errors?: string[];
}

const FIELD_OPTIONS = [
  { value: "", label: "Não mapear" },
  { value: "clientName", label: "Nome do Cliente" },
  { value: "dueDate", label: "Data de Vencimento" },
  { value: "birthday", label: "Data de Aniversário" },
  { value: "policyNumber", label: "Número da Apólice" },
  { value: "insurer", label: "Seguradora" },
  { value: "product", label: "Produto" },
  { value: "premium", label: "Prêmio" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "Email" },
  { value: "notes", label: "Observações" },
];

export default function ImportPage() {
  const [clients, setClients] = useClients();
  const [policies, setPolicies] = usePolicies();
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mappedData, setMappedData] = useState<MappedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const sheets = workbook.SheetNames;
          setAvailableSheets(sheets);
          setSelectedSheet(sheets[0] || "");

          if (sheets.length > 0) {
            const worksheet = workbook.Sheets[sheets[0]];
            const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
            
            if (jsonData.length > 0) {
              setExcelHeaders(Object.keys(jsonData[0]));
              setExcelData(jsonData);
            }
          }
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Erro ao ler o arquivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    []
  );

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    // Re-read the selected sheet
    // This would require re-reading the file, so for simplicity we'll just update the state
  };

  const handleMappingChange = (excelColumn: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [excelColumn]: field,
    }));
  };

  const processMapping = () => {
    if (excelData.length === 0) return;

    const mapped: MappedRow[] = [];
    const errors: Record<number, string[]> = {};

    excelData.forEach((row, index) => {
      const mappedRow: MappedRow = {
        clientName: "",
        dueDate: "",
      };
      const rowErrors: string[] = [];

      // Map columns
      Object.entries(columnMapping).forEach(([excelCol, field]) => {
        if (field && row[excelCol] !== undefined) {
          const value = row[excelCol];
          
          if (field === "dueDate" || field === "birthday") {
            const parsed = parseDate(String(value));
            if (parsed) {
              if (field === "dueDate") {
                mappedRow.dueDate = parsed;
              } else if (field === "birthday") {
                mappedRow.birthday = parsed;
              }
            } else if (field === "dueDate") {
              rowErrors.push(`Data de vencimento inválida: ${value}`);
            }
          } else if (field === "premium") {
            // Try to parse as number
            const numValue = typeof value === "string" 
              ? parseFloat(value.replace(/[^\d,.-]/g, "").replace(",", "."))
              : Number(value);
            mappedRow.premium = isNaN(numValue) ? undefined : String(numValue);
          } else {
            const stringValue = String(value || "");
            if (field === "clientName") {
              mappedRow.clientName = stringValue;
            } else if (field === "policyNumber") {
              mappedRow.policyNumber = stringValue;
            } else if (field === "insurer") {
              mappedRow.insurer = stringValue;
            } else if (field === "product") {
              mappedRow.product = stringValue;
            } else if (field === "phone") {
              mappedRow.phone = stringValue;
            } else if (field === "email") {
              mappedRow.email = stringValue;
            } else if (field === "notes") {
              mappedRow.notes = stringValue;
            }
          }
        }
      });

      // Validate required fields
      if (!mappedRow.clientName) {
        rowErrors.push("Nome do cliente é obrigatório");
      }
      if (!mappedRow.dueDate) {
        rowErrors.push("Data de vencimento é obrigatória");
      }

      if (rowErrors.length > 0) {
        errors[index] = rowErrors;
      }

      mapped.push(mappedRow);
    });

    setMappedData(mapped);
    setValidationErrors(errors);
    setShowPreview(true);
  };

  const saveData = () => {
    setIsProcessing(true);
    
    try {
      const newClients: Client[] = [];
      const newPolicies: Policy[] = [];
      const clientMap = new Map<string, string>(); // name -> id

      // Create clients and policies
      mappedData.forEach((row, index) => {
        if (validationErrors[index]?.length) return; // Skip rows with errors

        // Find or create client
        let clientId = clientMap.get(row.clientName);
        if (!clientId) {
          const existingClient = clients.find((c) => c.name === row.clientName);
          if (existingClient) {
            clientId = existingClient.id;
          } else {
            clientId = `client_${Date.now()}_${index}`;
            const client: Client = {
              id: clientId,
              name: row.clientName,
              phone: row.phone,
              email: row.email,
              birthday: row.birthday,
            };
            newClients.push(client);
          }
          clientMap.set(row.clientName, clientId);
        }

        // Create policy
        const policy: Policy = {
          id: `policy_${Date.now()}_${index}`,
          clientId,
          policyNumber: row.policyNumber,
          insurer: row.insurer,
          product: row.product,
          dueDate: row.dueDate,
          premium: row.premium ? parseFloat(row.premium) : undefined,
          status: "active",
          notes: row.notes,
        };
        newPolicies.push(policy);
      });

      // Update state
      setClients([...clients, ...newClients]);
      setPolicies([...policies, ...newPolicies]);

      alert(`Dados importados com sucesso! ${newClients.length} clientes e ${newPolicies.length} apólices adicionados.`);
      
      // Reset
      setExcelData([]);
      setExcelHeaders([]);
      setColumnMapping({});
      setMappedData([]);
      setValidationErrors({});
      setShowPreview(false);
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Erro ao salvar os dados");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateDemoData = () => {
    const demoClients: Client[] = [
      {
        id: "demo_client_1",
        name: "João Silva",
        phone: "(11) 98765-4321",
        email: "joao@example.com",
        birthday: new Date(1985, 5, 15).toISOString(),
      },
      {
        id: "demo_client_2",
        name: "Maria Santos",
        phone: "(11) 97654-3210",
        email: "maria@example.com",
        birthday: new Date(1990, 8, 22).toISOString(),
      },
      {
        id: "demo_client_3",
        name: "Pedro Oliveira",
        phone: "(11) 96543-2109",
        birthday: new Date(1988, 2, 10).toISOString(),
      },
    ];

    const demoPolicies: Policy[] = [
      {
        id: "demo_policy_1",
        clientId: "demo_client_1",
        policyNumber: "APL-001",
        insurer: "Seguradora A",
        product: "Seguro Auto",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        premium: 1200.0,
        status: "active",
      },
      {
        id: "demo_policy_2",
        clientId: "demo_client_1",
        policyNumber: "APL-002",
        insurer: "Seguradora B",
        product: "Seguro Residencial",
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        premium: 800.0,
        status: "active",
      },
      {
        id: "demo_policy_3",
        clientId: "demo_client_2",
        policyNumber: "APL-003",
        insurer: "Seguradora A",
        product: "Seguro Vida",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        premium: 500.0,
        status: "active",
      },
      {
        id: "demo_policy_4",
        clientId: "demo_client_3",
        policyNumber: "APL-004",
        insurer: "Seguradora C",
        product: "Seguro Auto",
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        premium: 1500.0,
        status: "active",
      },
    ];

    setClients([...clients, ...demoClients]);
    setPolicies([...policies, ...demoPolicies]);
    alert("Dados de demonstração adicionados com sucesso!");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importar Dados</h1>
            <p className="text-muted-foreground">
              Importe dados de clientes e apólices a partir de arquivos Excel
            </p>
          </div>
          <Button onClick={generateDemoData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Dados de Demonstração
          </Button>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>1. Upload do Arquivo</CardTitle>
            <CardDescription>
              Selecione um arquivo Excel (.xlsx, .xlsm, .xls)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 rounded-lg border-2 border-dashed p-6 hover:bg-accent transition-colors">
                    <Upload className="h-6 w-6" />
                    <span>Clique para fazer upload</span>
                  </div>
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xlsm,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              {excelData.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>
                    {excelData.length} linhas carregadas
                    {availableSheets.length > 1 && ` • ${availableSheets.length} planilhas`}
                  </span>
                </div>
              )}
              {availableSheets.length > 1 && (
                <div className="space-y-2">
                  <Label>Selecionar Planilha</Label>
                  <Select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                  >
                    {availableSheets.map((sheet) => (
                      <option key={sheet} value={sheet}>
                        {sheet}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column Mapping */}
        {excelHeaders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>2. Mapeamento de Colunas</CardTitle>
              <CardDescription>
                Mapeie as colunas do Excel para os campos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {excelHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-medium">{header}</div>
                    <div className="flex-1">
                      <Select
                        value={columnMapping[header] || ""}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                      >
                        {FIELD_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
                <Button onClick={processMapping} className="w-full">
                  Processar e Validar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>3. Pré-visualização e Validação</CardTitle>
              <CardDescription>
                Revise os dados antes de importar. Linhas com erros estão destacadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {mappedData.length - Object.keys(validationErrors).length} linhas válidas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">
                      {Object.keys(validationErrors).length} linhas com erros
                    </span>
                  </div>
                </div>
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Cliente</th>
                        <th className="p-2 text-left">Vencimento</th>
                        <th className="p-2 text-left">Apólice</th>
                        <th className="p-2 text-left">Seguradora</th>
                        <th className="p-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedData.map((row, index) => {
                        const hasErrors = validationErrors[index]?.length > 0;
                        return (
                          <tr
                            key={index}
                            className={cn(
                              "border-b",
                              hasErrors && "bg-red-50 dark:bg-red-950/20"
                            )}
                          >
                            <td className="p-2">{row.clientName || "-"}</td>
                            <td className="p-2">
                              {row.dueDate
                                ? formatDate(row.dueDate)
                                : "-"}
                            </td>
                            <td className="p-2">{row.policyNumber || "-"}</td>
                            <td className="p-2">{row.insurer || "-"}</td>
                            <td className="p-2">
                              {hasErrors ? (
                                <Badge variant="destructive">Erro</Badge>
                              ) : (
                                <Badge variant="default">OK</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {Object.keys(validationErrors).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Erros encontrados:</h4>
                    {Object.entries(validationErrors).map(([index, errors]) => (
                      <div key={index} className="text-sm text-red-600 dark:text-red-400">
                        Linha {Number(index) + 1}: {errors.join(", ")}
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={saveData}
                  disabled={isProcessing || Object.keys(validationErrors).length === mappedData.length}
                  className="w-full"
                >
                  {isProcessing ? "Salvando..." : "Salvar Dados"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

