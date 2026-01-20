"use client";

import { useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import { computeDashboardStats } from "@/lib/dashboard-helpers";
import { formatDate, classifyDueStatus } from "@/lib/date-helpers";
import { exportDashboardToExcel } from "@/lib/export-helpers";
import { BarChart3, TrendingUp, DollarSign, FileText, Download, Users, AlertTriangle, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Helper function to extract commission from notes
function extractCommission(notes: string | undefined): number {
  if (!notes) return 0;
  const commMatch = notes.match(/Comissão\s*:\s*R\$\s*([\d.]+,\d{2})/i);
  if (commMatch && commMatch[1]) {
    try {
      const value = parseFloat(commMatch[1].replace(/\./g, "").replace(",", "."));
      if (!isNaN(value) && value > 0) {
        return value;
      }
    } catch (e) {
      console.error("Error parsing Comissão:", e);
    }
  }
  return 0;
}

export default function ReportsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();

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

  // Premium this month (policies that expire this month)
  const premiumThisMonth = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => {
      const dueDate = typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate;
      if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
        return sum + (p.premium || 0);
      }
      return sum;
    }, 0);
  }, [activePolicies, currentMonth, currentYear]);

  // Commission this month (commissions from policies that expire this month)
  const commissionThisMonth = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => {
      const dueDate = typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate;
      if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
        return sum + extractCommission(p.notes);
      }
      return sum;
    }, 0);
  }, [activePolicies, currentMonth, currentYear]);

  // Total commission (from all policies)
  const totalCommission = useMemo(() => {
    return activePolicies.reduce((sum: number, p: any) => {
      return sum + extractCommission(p.notes);
    }, 0);
  }, [activePolicies]);

  const policiesByInsurer = useMemo(() => {
    const map = new Map<string, number>();
    activePolicies.forEach((p: any) => {
      if (p.insurer) {
        map.set(p.insurer, (map.get(p.insurer) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [activePolicies]);

  const policiesByStatus = useMemo(() => {
    const policiesList: any[] = Array.isArray(policies) ? policies : [];
    const statusCounts = {
      active: policiesList.filter((p: any) => p.status === "active").length,
      renewed: policiesList.filter((p: any) => p.status === "renewed").length,
      lost: policiesList.filter((p: any) => p.status === "lost").length,
    };
    const total = policiesList.length;
    return [
      { name: "Ativo", value: statusCounts.active, color: "#3b82f6", percent: total > 0 ? (statusCounts.active / total) * 100 : 0 },
      { name: "Renovado", value: statusCounts.renewed, color: "#10b981", percent: total > 0 ? (statusCounts.renewed / total) * 100 : 0 },
      { name: "Perdido", value: statusCounts.lost, color: "#ef4444", percent: total > 0 ? (statusCounts.lost / total) * 100 : 0 },
    ].filter((item) => item.value > 0); // Only show slices with values > 0
  }, [policies]);
  
  const policiesListLength = useMemo(() => {
    return (Array.isArray(policies) ? policies : []).length;
  }, [policies]);

  const overduePolicies = useMemo(() => {
    return activePolicies.filter((p: any) => {
      const status = classifyDueStatus(p.dueDate);
      return status === "overdue";
    });
  }, [activePolicies]);

  const urgentPolicies = useMemo(() => {
    return activePolicies.filter((p: any) => {
      const status = classifyDueStatus(p.dueDate);
      return status === "d7";
    });
  }, [activePolicies]);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Relatórios
                </h1>
                <p className="text-xs sm:text-sm lg:text-base lg:text-lg text-muted-foreground mt-1">
                  Análises detalhadas e estatísticas
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                const stats = computeDashboardStats(policies as any, clients as any);
                exportDashboardToExcel(clients as any, policies as any, stats);
              }}
              className="shadow-lg hover:shadow-xl w-full sm:w-auto text-sm sm:text-base"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              <span className="hidden sm:inline">Exportar Relatório Completo</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Financial Cards */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Prêmio Este Mês</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(premiumThisMonth)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Comissão Este Mês</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(commissionThisMonth)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Comissão Total</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(totalCommission)}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Policies by Status */}
          <Card className="p-4 sm:p-5 lg:p-6 border border-border bg-card shadow-lg">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Apólices por Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={250} className="sm:h-[280px] lg:h-[300px]">
                  <PieChart>
                    <Pie
                      data={policiesByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => {
                        // Only show label if percent is >= 5% to avoid overlap
                        // percent from Recharts is already a decimal (0-1), so multiply by 100
                        let percentValue = (percent || 0) * 100;
                        // Safety check: if percent seems wrong, calculate from data
                        if (percentValue > 100 || percentValue < 0) {
                          const total = policiesListLength;
                          percentValue = total > 0 ? ((value || 0) / total) * 100 : 0;
                        }
                        if (percentValue < 5) return "";
                        return `${name}: ${Math.min(Math.round(percentValue), 100)}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {policiesByStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const data = payload[0];
                        const total = policiesListLength;
                        const value = (data.value as number) || 0;
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {value} apólice(s) ({percent}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend below chart */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {policiesByStatus.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium">
                        {entry.name}: {entry.value} ({entry.percent.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policies by Insurer */}
          <Card className="p-4 sm:p-5 lg:p-6 pb-0 border border-border bg-card shadow-lg lg:col-span-2">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Top 10 Seguradoras</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={policiesByInsurer} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
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
                    formatter={(value: any) => [`${value} apólice(s)`, "Quantidade"]}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                    style={{ cursor: "pointer" }}
                  >
                    {policiesByInsurer.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(${210 + index * 10}, 70%, ${55 - index * 2}%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Renewals */}
        <Card className="md:p-6 border border-border bg-card shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Renovações Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3 text-red-400">
                  Vencidas ({overduePolicies.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {overduePolicies.slice(0, 6).map((policy: any) => {
                    const client = (Array.isArray(clients) ? clients : []).find((c: any) => c.id === policy.clientId);
                    return (
                      <div
                        key={policy.id}
                        className="p-4 rounded-lg border border-red-900 bg-red-950/20"
                      >
                        <p className="font-semibold text-sm">{client?.name || "Cliente não encontrado"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Venceu em {formatDate(policy.dueDate)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-amber-400">
                  Vence em 0-7 dias ({urgentPolicies.length})
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {urgentPolicies.slice(0, 6).map((policy: any) => {
                    const client = (Array.isArray(clients) ? clients : []).find((c: any) => c.id === policy.clientId);
                    return (
                      <div
                        key={policy.id}
                        className="p-4 rounded-lg border border-amber-900 bg-amber-950/20"
                      >
                        <p className="font-semibold text-sm">{client?.name || "Cliente não encontrado"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vence em {formatDate(policy.dueDate)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
