import type { Client, Policy, Product, Insurer } from "@/types";
import * as XLSX from "xlsx";
import { formatDate } from "./date-helpers";
import { parseNotesFromPolicy } from "./insurance-calculations";

export function exportClientsToExcel(clients: Client[], policies: Policy[]) {
  const data = clients.map((client) => {
    const clientPolicies = policies.filter((p) => p.clientId === client.id);
    return {
      Nome: client.name,
      Telefone: client.phone || "",
      Email: client.email || "",
      "Data de Nascimento": client.birthday ? formatDate(client.birthday) : "",
      "Total de Apólices": clientPolicies.length,
      "Próxima Renovação": clientPolicies
        .filter((p) => p.status === "active")
        .map((p) =>
          typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate,
        )
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ? formatDate(
            clientPolicies
              .filter((p) => p.status === "active")
              .map((p) =>
                typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate,
              )
              .sort((a, b) => a.getTime() - b.getTime())[0],
          )
        : "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

  // Auto-size columns
  const maxWidth = data.reduce(
    (w, r) => Math.max(w, Object.keys(r).length),
    10,
  );
  worksheet["!cols"] = Array.from({ length: maxWidth }, () => ({ wch: 20 }));

  const fileName = `clientes_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportPoliciesToExcel(policies: Policy[], clients: Client[]) {
  const data = policies.map((policy) => {
    const client = clients.find((c) => c.id === policy.clientId);
    const dueDate =
      typeof policy.dueDate === "string"
        ? new Date(policy.dueDate)
        : policy.dueDate;

    // Extract IOF, Prêmio Líquido, Comissão from notes (parsed supports new and legacy formats)
    const notes = policy.notes || "";
    const parsed = parseNotesFromPolicy(notes);
    const iofMatch = notes.match(/IOF:\s*R\$\s*([\d.,]+)/i);
    const netMatch = notes.match(/Prêmio\s+Líquido:\s*R\$\s*([\d.,]+)/i);
    const plateMatch = notes.match(/Placa:\s*(\w+)/i);

    const commPct =
      parsed.commissionRate != null ? `${parsed.commissionRate}%` : "";
    const commBRL =
      parsed.commission != null && parsed.commission > 0
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(parsed.commission)
        : "";

    return {
      Cliente: client?.name || "",
      Telefone: client?.phone || "",
      Email: client?.email || "",
      "CPF/CNPJ": policy.policyNumber || "",
      Seguradora: policy.insurer || "",
      Produto: policy.product || "",
      "Data de Vencimento": formatDate(dueDate),
      "Prêmio Total": policy.premium
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(policy.premium)
        : "",
      IOF: iofMatch ? `R$ ${iofMatch[1]}` : "",
      "Prêmio Líquido": netMatch ? `R$ ${netMatch[1]}` : "",
      "Comissão %": commPct,
      "Comissão R$": commBRL,
      Placa: plateMatch ? plateMatch[1] : "",
      Status: policy.status === "active" ? "Ativo" : "Inativo",
      Observações:
        notes
          .replace(/IOF:.*?\|/g, "")
          .replace(/Prêmio Líquido:.*?\|/g, "")
          .replace(/Comissão(\s+\d+%)?:.*?\|/g, "")
          .replace(/Placa:.*?\|/g, "")
          .replace(/\|/g, "")
          .trim() || "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Renovações");

  // Auto-size columns
  const maxWidth = data.reduce(
    (w, r) => Math.max(w, Object.keys(r).length),
    10,
  );
  worksheet["!cols"] = Array.from({ length: maxWidth }, () => ({ wch: 20 }));

  const fileName = `renovacoes_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportDashboardToExcel(
  clients: Client[],
  policies: Policy[],
  stats: {
    overdue: number;
    dueIn0to7: number;
    dueIn8to15: number;
    dueIn16to30: number;
    birthdaysThisMonth: number;
    birthdaysToday: number;
  },
) {
  const workbook = XLSX.utils.book_new();

  // Stats sheet
  const statsData = [
    { Métrica: "Vencidos", Valor: stats.overdue },
    { Métrica: "Vence em 0-7 dias", Valor: stats.dueIn0to7 },
    { Métrica: "Vence em 8-15 dias", Valor: stats.dueIn8to15 },
    { Métrica: "Vence em 16-30 dias", Valor: stats.dueIn16to30 },
    { Métrica: "Aniversários este mês", Valor: stats.birthdaysThisMonth },
    { Métrica: "Aniversários hoje", Valor: stats.birthdaysToday },
  ];
  const statsSheet = XLSX.utils.json_to_sheet(statsData);
  XLSX.utils.book_append_sheet(workbook, statsSheet, "Estatísticas");

  // Clients sheet
  const clientsData = clients.map((client) => ({
    Nome: client.name,
    Telefone: client.phone || "",
    Email: client.email || "",
    "Data de Nascimento": client.birthday ? formatDate(client.birthday) : "",
  }));
  const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
  XLSX.utils.book_append_sheet(workbook, clientsSheet, "Clientes");

  // Policies sheet
  const policiesData = policies.map((policy) => {
    const client = clients.find((c) => c.id === policy.clientId);
    const dueDate =
      typeof policy.dueDate === "string"
        ? new Date(policy.dueDate)
        : policy.dueDate;
    return {
      Cliente: client?.name || "",
      "CPF/CNPJ": policy.policyNumber || "",
      Seguradora: policy.insurer || "",
      Produto: policy.product || "",
      "Data de Vencimento": formatDate(dueDate),
      "Prêmio Total": policy.premium || "",
      Status: policy.status === "active" ? "Ativo" : "Inativo",
    };
  });
  const policiesSheet = XLSX.utils.json_to_sheet(policiesData);
  XLSX.utils.book_append_sheet(workbook, policiesSheet, "Apólices");

  const fileName = `dashboard_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportProductsToExcel(
  products: Product[],
  policyCountByCode: Record<number, number>,
) {
  const data = products.map((p) => ({
    Código: p.code,
    Nome: p.name,
    "Apólices vinculadas": policyCountByCode[p.code] ?? 0,
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
  worksheet["!cols"] = [{ wch: 10 }, { wch: 25 }, { wch: 18 }];
  const fileName = `produtos_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportInsurersToExcel(
  insurers: Insurer[],
  policyCountByName: Record<string, number>,
) {
  const data = insurers.map((i) => ({
    Nome: i.name,
    "Apólices vinculadas": policyCountByName[i.name] ?? 0,
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Asseguradoras");
  worksheet["!cols"] = [{ wch: 30 }, { wch: 18 }];
  const fileName = `asseguradoras_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
