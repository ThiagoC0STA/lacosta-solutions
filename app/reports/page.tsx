"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import { computeDashboardStats } from "@/lib/dashboard-helpers";
import { toLocalDate } from "@/lib/date-helpers";
import { exportDashboardToExcel } from "@/lib/export-helpers";
import { calculateFromPremium } from "@/lib/insurance-calculations";
import { BarChart3, TrendingUp, DollarSign, FileText, Download, Users, Building2, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Get commission for a policy: from notes or calculated from premium (15% as default)
function getCommission15(policy: { notes?: string; premium?: number }): number {
  if (!policy.notes) {
    if (policy.premium && policy.premium > 0) {
      return calculateFromPremium(policy.premium).commission15;
    }
    return 0;
  }
  const comm15Match = policy.notes.match(/Comissão\s+15%\s*:\s*R\$\s*([\d.,]+)/i);
  if (comm15Match?.[1]) {
    const val = parseFloat(comm15Match[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val) && val > 0) return val;
  }
  const legacyMatch = policy.notes.match(/Comissão\s*:\s*R\$\s*([\d.,]+)/i);
  if (legacyMatch?.[1]) {
    const val = parseFloat(legacyMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val) && val > 0) return val;
  }
  if (policy.premium && policy.premium > 0) {
    return calculateFromPremium(policy.premium).commission15;
  }
  return 0;
}

function getCommission10(policy: { notes?: string; premium?: number }): number {
  if (!policy.notes) {
    if (policy.premium && policy.premium > 0) {
      return calculateFromPremium(policy.premium).commission10;
    }
    return 0;
  }
  const comm10Match = policy.notes.match(/Comissão\s+10%\s*:\s*R\$\s*([\d.,]+)/i);
  if (comm10Match?.[1]) {
    const val = parseFloat(comm10Match[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(val) && val > 0) return val;
  }
  if (policy.premium && policy.premium > 0) {
    return calculateFromPremium(policy.premium).commission10;
  }
  return 0;
}

type PeriodFilter = "1m" | "6m" | "1y";

export default function ReportsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("1y");

  const activePolicies = useMemo(
    () => (Array.isArray(policies) ? policies : []).filter((p: any) => p.status === "active"),
    [policies]
  );

  const totalPremium = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => sum + (p.premium || 0), 0);
  }, [activePolicies]);

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Period length in months
  const periodMonths = periodFilter === "1m" ? 1 : periodFilter === "6m" ? 6 : 12;

  // Premium in period (policies that expire in the selected period)
  const premiumInPeriod = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => {
      const dueDate = toLocalDate(p.dueDate);
      const today = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + periodMonths, 0);
      if (dueDate >= today && dueDate <= endDate) {
        return sum + (p.premium || 0);
      }
      return sum;
    }, 0);
  }, [activePolicies, currentMonth, currentYear, periodMonths]);

  // Commission in period (15% - policies that expire in the selected period)
  const commissionInPeriod = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => {
      const dueDate = toLocalDate(p.dueDate);
      const today = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + periodMonths, 0);
      if (dueDate >= today && dueDate <= endDate) {
        return sum + getCommission15(p);
      }
      return sum;
    }, 0);
  }, [activePolicies, currentMonth, currentYear, periodMonths]);

  // Total commission 10% and 15%
  const totalCommission10 = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => sum + getCommission10(p), 0);
  }, [activePolicies]);

  const totalCommission15 = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => sum + getCommission15(p), 0);
  }, [activePolicies]);

  const totalCommission = totalCommission15;

  // Prêmio Líquido and IOF totals (calculated from premium)
  const { totalNetPremium, totalIOF } = useMemo(() => {
    let net = 0;
    let iof = 0;
    activePolicies.forEach((p: any) => {
      const prem = p.premium || 0;
      if (prem > 0) {
        const { netPremium, iof: iofVal } = calculateFromPremium(prem);
        net += netPremium;
        iof += iofVal;
      }
    });
    return { totalNetPremium: net, totalIOF: iof };
  }, [activePolicies]);

  // Renewals by month (based on period filter)
  const renewalsByMonth = useMemo(() => {
    const months: { month: string; count: number; premium: number }[] = [];
    for (let i = 0; i < periodMonths; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      let count = 0;
      let premium = 0;
      activePolicies.forEach((p: any) => {
        const dueDate = toLocalDate(p.dueDate);
        if (dueDate.getMonth() === d.getMonth() && dueDate.getFullYear() === d.getFullYear()) {
          count++;
          premium += p.premium || 0;
        }
      });
      months.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        count,
        premium,
      });
    }
    return months;
  }, [activePolicies, currentMonth, currentYear, periodMonths]);

  // Insurers with premium value (not just count)
  const insurersWithPremium = useMemo(() => {
    const map = new Map<string, { count: number; premium: number }>();
    activePolicies.forEach((p: any) => {
      if (p.insurer) {
        const current = map.get(p.insurer) || { count: 0, premium: 0 };
        current.count++;
        current.premium += p.premium || 0;
        map.set(p.insurer, current);
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, premium: data.premium }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [activePolicies]);

  const periodLabel = periodFilter === "1m" ? "Este mês" : periodFilter === "6m" ? "6 meses" : "1 ano";

  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

  return (
    <AppLayout>
      <div className="space-y-10 sm:space-y-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Análise e estatísticas do seu negócio</p>
          </div>
          <Button
            onClick={() => {
              const stats = computeDashboardStats(policies as any, clients as any);
              exportDashboardToExcel(clients as any, policies as any, stats);
            }}
            variant="outline"
            size="sm"
            className="w-fit"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Section 1: Overview - always visible, no filter */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Visão geral
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total de Clientes</p>
                <p className="text-2xl sm:text-3xl font-bold">{(Array.isArray(clients) ? clients : []).length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Apólices</p>
                <p className="text-2xl sm:text-3xl font-bold">{(Array.isArray(policies) ? policies : []).length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prêmio Total</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalPremium)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Apólices Ativas</p>
                <p className="text-2xl sm:text-3xl font-bold">{activePolicies.length}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
            </div>
          </Card>
          </div>
        </section>

        {/* Section 2: Próximas Renovações - period filter lives HERE, clear what it affects */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Próximas renovações
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Apólices que vencem no período selecionado
              </p>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
              <Button
                variant={periodFilter === "1m" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodFilter("1m")}
                className="h-8"
              >
                1 mês
              </Button>
              <Button
                variant={periodFilter === "6m" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodFilter("6m")}
                className="h-8"
              >
                6 meses
              </Button>
              <Button
                variant={periodFilter === "1y" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPeriodFilter("1y")}
                className="h-8"
              >
                1 ano
              </Button>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Card className="p-4 sm:p-5 border border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prêmio no período</p>
                  <p className="text-2xl sm:text-3xl font-bold">{formatBRL(premiumInPeriod)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 border border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comissão no período</p>
                  <p className="text-2xl sm:text-3xl font-bold">{formatBRL(commissionInPeriod)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="border border-border bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Renovações por mês
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {periodLabel} • Azul: quantidade | Verde: prêmio
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={renewalsByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    stroke="#a1a1aa"
                    style={{ fontSize: "11px" }}
                    angle={-45}
                    textAnchor="end"
                    height={55}
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis stroke="#a1a1aa" style={{ fontSize: "11px" }} tick={{ fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "8px", padding: "12px" }}
                    formatter={(value = 0, name = "") => {
                      const num = Number(value) || 0;
                      if (name === "count") return [`${num} apólice(s)`, "Quantidade"];
                      return [formatBRL(num), "Prêmio"];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="count" />
                  <Bar dataKey="premium" fill="#10b981" radius={[4, 4, 0, 0]} name="premium" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Totais financeiros - all policies, no filter */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Totais financeiros
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Valores consolidados de todas as apólices ativas</p>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4 sm:p-5 border border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comissão Total</p>
                  <p className="text-xl sm:text-2xl font-bold">{formatBRL(totalCommission)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-orange-400" />
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 border border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Prêmio Líquido Total</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalNetPremium)}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-teal-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">IOF Total</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalIOF)}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Comissão 10%</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalCommission10)}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Comissão 15%</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalCommission15)}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              </div>
            </div>
          </Card>
          </div>
        </section>

        {/* Section 4: Top 10 Seguradoras */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Top 10 Seguradoras
          </h2>
          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Top 10 Seguradoras</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={insurersWithPremium.map((i) => ({ ...i, value: i.count }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    stroke="#a1a1aa"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <YAxis
                    stroke="#a1a1aa"
                    style={{ fontSize: "12px" }}
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      padding: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                    }}
                    labelStyle={{ color: "#ffffff", fontWeight: 600, marginBottom: "4px" }}
                    itemStyle={{ color: "#a1a1aa" }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const item = payload[0].payload;
                      const count = item.count || 0;
                      const premium = item.premium || 0;
                      return (
                        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {count} apólice(s)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Prêmio:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 0,
                            }).format(premium)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    style={{ cursor: "pointer" }}
                  >
                    {insurersWithPremium.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${210 + index * 10}, 70%, ${55 - index * 2}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Quantidade de apólices • Passe o mouse para ver prêmio por seguradora
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
