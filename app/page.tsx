"use client";

import { useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClients, usePolicies } from "@/hooks/use-local-storage";
import {
  computeDashboardStats,
  getTopRenewals,
  getTodaysBirthdays,
  getRenewalsByMonth,
} from "@/lib/dashboard-helpers";
import { formatDate } from "@/lib/date-helpers";
import { getNext12Months, getMonthBucket } from "@/lib/date-helpers";
import type { RenewalWithClient } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const [clients] = useClients();
  const [policies] = usePolicies();

  const renewalsWithClients = useMemo<RenewalWithClient[]>(() => {
    return policies.map((policy) => {
      const client = clients.find((c) => c.id === policy.clientId);
      return {
        ...policy,
        client: client || { id: policy.clientId, name: "Cliente não encontrado" },
      };
    });
  }, [policies, clients]);

  const stats = useMemo(
    () => computeDashboardStats(policies, clients),
    [policies, clients]
  );

  const topRenewals = useMemo(
    () => getTopRenewals(renewalsWithClients, 10),
    [renewalsWithClients]
  );

  const todaysBirthdays = useMemo(
    () => getTodaysBirthdays(clients),
    [clients]
  );

  const months = useMemo(() => getNext12Months(), []);
  const renewalsByMonth = useMemo(
    () => getRenewalsByMonth(renewalsWithClients, months),
    [renewalsWithClients, months]
  );

  const chartData = months.map((month) => ({
    month: getMonthBucket(month),
    count: renewalsByMonth[`${month.getMonth() + 1}/${month.getFullYear()}`] || 0,
  }));

  const statCards = [
    {
      title: "Vencidos",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-900",
    },
    {
      title: "Vence em 0-7 dias",
      value: stats.dueIn0to7,
      icon: Calendar,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-900",
    },
    {
      title: "Vence em 8-15 dias",
      value: stats.dueIn8to15,
      icon: Calendar,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-900",
    },
    {
      title: "Vence em 16-30 dias",
      value: stats.dueIn16to30,
      icon: Calendar,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-900",
    },
    {
      title: "Aniversários este mês",
      value: stats.birthdaysThisMonth,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-900",
    },
    {
      title: "Aniversários hoje",
      value: stats.birthdaysToday,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
      borderColor: "border-purple-200 dark:border-purple-900",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das renovações e aniversários
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`${card.bgColor} ${card.borderColor} border-2 transition-all hover:shadow-lg`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Renovações nos Próximos 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Renewals */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas Renovações</CardTitle>
            </CardHeader>
            <CardContent>
              {topRenewals.length > 0 ? (
                <div className="space-y-3">
                  {topRenewals.map((renewal) => (
                    <div
                      key={renewal.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{renewal.client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {renewal.product || "Sem produto"} • {renewal.insurer || "Sem seguradora"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatDate(renewal.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/renewals">
                    <Button variant="outline" className="w-full">
                      Ver todas as renovações
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma renovação encontrada
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Birthdays */}
          <Card>
            <CardHeader>
              <CardTitle>Aniversários de Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {todaysBirthdays.length > 0 ? (
                <div className="space-y-3">
                  {todaysBirthdays.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        {client.phone && (
                          <p className="text-sm text-muted-foreground">
                            {client.phone}
                          </p>
                        )}
                      </div>
                      {client.birthday && (
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatDate(client.birthday)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <Link href="/clients">
                    <Button variant="outline" className="w-full">
                      Ver todos os clientes
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum aniversário hoje
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
