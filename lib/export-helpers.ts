import type { Client, Policy } from "@/types";
import * as XLSX from "xlsx";
import { formatDate } from "./date-helpers";

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
        .map((p) => typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate)
        .sort((a, b) => a.getTime() - b.getTime())[0]
        ? formatDate(
            clientPolicies
              .filter((p) => p.status === "active")
              .map((p) => typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate)
              .sort((a, b) => a.getTime() - b.getTime())[0]
          )
        : "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  worksheet["!cols"] = Array.from({ length: maxWidth }, () => ({ wch: 20 }));

  const fileName = `clientes_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export function exportPoliciesToExcel(policies: Policy[], clients: Client[]) {
  const data = policies.map((policy) => {
    const client = clients.find((c) => c.id === policy.clientId);
    const dueDate = typeof policy.dueDate === "string" ? new Date(policy.dueDate) : policy.dueDate;
    
    // Extract IOF, Prêmio Líquido, Comissão from notes
    const notes = policy.notes || "";
    const iofMatch = notes.match(/IOF:\s*R\$\s*([\d.,]+)/i);
    const netMatch = notes.match(/Prêmio\s+Líquido:\s*R\$\s*([\d.,]+)/i);
    const commMatch = notes.match(/Comissão:\s*R\$\s*([\d.,]+)/i);
    const plateMatch = notes.match(/Placa:\s*(\w+)/i);

    return {
      Cliente: client?.name || "",
      Telefone: client?.phone || "",
      Email: client?.email || "",
      "Número da Apólice": policy.policyNumber || "",
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
      Comissão: commMatch ? `R$ ${commMatch[1]}` : "",
      Placa: plateMatch ? plateMatch[1] : "",
      Status: policy.status === "active" ? "Ativo" : policy.status === "renewed" ? "Renovado" : "Perdido",
      Observações: notes.replace(/IOF:.*?\|/g, "").replace(/Prêmio Líquido:.*?\|/g, "").replace(/Comissão:.*?\|/g, "").replace(/Placa:.*?\|/g, "").replace(/\|/g, "").trim() || "",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Renovações");

  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
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
  }
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
    const dueDate = typeof policy.dueDate === "string" ? new Date(policy.dueDate) : policy.dueDate;
    return {
      Cliente: client?.name || "",
      "Número da Apólice": policy.policyNumber || "",
      Seguradora: policy.insurer || "",
      Produto: policy.product || "",
      "Data de Vencimento": formatDate(dueDate),
      "Prêmio Total": policy.premium || "",
      Status: policy.status === "active" ? "Ativo" : policy.status === "renewed" ? "Renovado" : "Perdido",
    };
  });
  const policiesSheet = XLSX.utils.json_to_sheet(policiesData);
  XLSX.utils.book_append_sheet(workbook, policiesSheet, "Apólices");

  const fileName = `dashboard_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
