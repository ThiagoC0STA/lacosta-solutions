"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import {
  computeDashboardStats,
  getTopRenewals,
  getTodaysBirthdays,
  getRenewalsByMonth,
} from "@/lib/dashboard-helpers";
import { formatDate } from "@/lib/date-helpers";
import { getNext12Months, getMonthBucket } from "@/lib/date-helpers";
import type { RenewalWithClient } from "@/types";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, AlertTriangle, Users, FileText, TrendingUp, Clock, Sparkles, BarChart3, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getStatusFromTitle, getStatusColor } from "@/lib/colors";

export default function DashboardPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();

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
      description: "Requer atenção imediata",
    },
    {
      title: "Vence em 0-7 dias",
      value: stats.dueIn0to7,
      icon: Clock,
      description: "Urgente - ação necessária",
    },
    {
      title: "Vence em 8-15 dias",
      value: stats.dueIn8to15,
      icon: Calendar,
      description: "Próximas renovações",
    },
    {
      title: "Vence em 16-30 dias",
      value: stats.dueIn16to30,
      icon: BarChart3,
      description: "Planejamento futuro",
    },
    {
      title: "Aniversários este mês",
      value: stats.birthdaysThisMonth,
      icon: Gift,
      description: "Celebrações do mês",
    },
    {
      title: "Aniversários hoje",
      value: stats.birthdaysToday,
      icon: Sparkles,
      description: "Parabéns de hoje!",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <AppLayout>
      <motion.div 
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Visão geral das renovações e aniversários
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards - Layout em grid moderno */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            const status = getStatusFromTitle(card.title);
            const colors = getStatusColor(status);
            
            return (
              <motion.div
                key={card.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <Card className={`p-6 border ${colors.borderColor} bg-card shadow-md hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${colors.hoverBg} hover:border-primary/30`}>
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative flex flex-col gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center border ${colors.borderColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md group-hover:shadow-lg`}>
                      <Icon className={`h-6 w-6 ${colors.iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div>
                      <p className={`text-4xl font-bold tracking-tight mb-2 ${colors.numberColor}`}>
                        {card.value}
                      </p>
                      <p className="text-sm text-card-foreground font-semibold leading-snug mb-1">
                        {card.title}
                      </p>
                      {card.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Chart - Layout moderno com área */}
        <motion.div variants={itemVariants}>
          <Card className="p-8 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
            {/* Decorative accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            
            <div className="mb-7 flex items-start justify-between relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shadow-md">
                  <BarChart3 className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Renovações nos Próximos 12 Meses</h3>
                  <p className="text-sm text-muted-foreground">Volume de renovações por mês</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-primary/10 dark:to-primary/5 border border-blue-200 dark:border-primary/20 shadow-sm">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-primary" />
                <span className="text-xs font-semibold text-blue-600 dark:text-primary">Tendência</span>
              </div>
            </div>
            <div className="relative z-10">
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} className="dark:opacity-20" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                      padding: '12px 16px'
                    }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.5 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fill="url(#colorGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Bottom Section - Grid moderno */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Top Renewals */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
              
              <div className="mb-6 flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-500/20 dark:to-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shadow-md">
                  <Clock className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Próximas Renovações</h3>
                  <p className="text-sm text-muted-foreground">Top 10 renovações mais próximas</p>
                </div>
              </div>
              {topRenewals.length > 0 ? (
                <div className="space-y-3 flex-1 relative z-10">
                  {topRenewals.slice(0, 5).map((renewal, index) => (
                    <motion.div
                      key={renewal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-border p-4 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-500/10 dark:hover:to-transparent transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {renewal.client.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {renewal.product || "Sem produto"} • {renewal.insurer || "Sem seguradora"}
                          </p>
                        </div>
                      </div>
                      <div className="ml-3 text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          {formatDate(renewal.dueDate)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  <Link href="/renewals" className="block mt-6">
                    <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver todas as renovações
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col items-center justify-center relative z-10">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma renovação encontrada</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Today's Birthdays */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
              
              <div className="mb-6 flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-500/20 dark:to-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center shadow-md">
                  <Sparkles className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Aniversários de Hoje</h3>
                  <p className="text-sm text-muted-foreground">Clientes que fazem aniversário hoje</p>
                </div>
              </div>
              {todaysBirthdays.length > 0 ? (
                <div className="space-y-3 flex-1 relative z-10">
                  {todaysBirthdays.slice(0, 5).map((client, index) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-border p-4 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent dark:hover:from-purple-500/10 dark:hover:to-transparent transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                          <Gift className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                            {client.name}
                          </p>
                          {client.phone && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {client.birthday && (
                        <div className="ml-3 text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            {formatDate(client.birthday)}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  <Link href="/clients" className="block mt-6">
                    <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Ver todos os clientes
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col items-center justify-center relative z-10">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Nenhum aniversário hoje</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
