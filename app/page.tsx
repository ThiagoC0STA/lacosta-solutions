"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import {
  computeDashboardStats,
  getTopRenewals,
  getTodaysBirthdays,
  getRenewalsByMonth,
} from "@/lib/dashboard-helpers";
import { formatDate, pluralize, classifyDueStatus } from "@/lib/date-helpers";
import { getNext12Months, getMonthBucket } from "@/lib/date-helpers";
import type { RenewalWithClient } from "@/types";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Calendar, AlertTriangle, Users, FileText, TrendingUp, Clock, Sparkles, BarChart3, Gift, X, Building2, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getStatusFromTitle, getStatusColor } from "@/lib/colors";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const [showUrgentActions, setShowUrgentActions] = useState(false);

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

  const urgentActions = useMemo(() => {
    return renewalsWithClients
      .filter((r) => r.status === "active")
      .filter((r) => {
        const status = classifyDueStatus(r.dueDate);
        return status === "overdue" || status === "d7";
      })
      .sort((a, b) => {
        const statusA = classifyDueStatus(a.dueDate);
        const statusB = classifyDueStatus(b.dueDate);
        // Overdue first, then d7
        if (statusA === "overdue" && statusB !== "overdue") return -1;
        if (statusA !== "overdue" && statusB === "overdue") return 1;
        // Then sort by date
        const dateA = typeof a.dueDate === "string" ? new Date(a.dueDate) : a.dueDate;
        const dateB = typeof b.dueDate === "string" ? new Date(b.dueDate) : b.dueDate;
        return dateA.getTime() - dateB.getTime();
      });
  }, [renewalsWithClients]);

  const urgentCount = stats.overdue + stats.dueIn0to7;

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
        className="space-y-6 sm:space-y-8 w-full max-w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Dashboard
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Visão geral das renovações e aniversários
                </p>
              </div>
            </div>
          </div>
          {urgentCount > 0 && (
            <button
              onClick={() => setShowUrgentActions(true)}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg bg-red-950/20 border border-red-900 hover:bg-red-950/30 transition-all cursor-pointer shadow-sm hover:shadow-md w-full sm:w-auto justify-center sm:justify-start"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
              <span className="text-xs sm:text-sm font-semibold text-red-300">
                {pluralize(urgentCount, "ação urgente", "ações urgentes")}
              </span>
            </button>
          )}
        </motion.div>

        {/* Stats Cards - Layout em grid moderno */}
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 w-full max-w-full">
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
                <Card className={`p-4 sm:p-6 border ${colors.borderColor} bg-card shadow-md hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden ${colors.hoverBg} hover:border-primary/30`}>
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative flex flex-col gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colors.iconBg} flex items-center justify-center border ${colors.borderColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md group-hover:shadow-lg`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div>
                      <p className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 ${colors.numberColor}`}>
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
          <Card className="p-4 sm:p-6 lg:p-8 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
            {/* Decorative accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            
            <div className="mb-4 sm:mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-md">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Renovações nos Próximos 12 Meses</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Volume de renovações por mês</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Tendência</span>
              </div>
            </div>
            <div className="relative z-10 h-[280px] sm:h-[320px] lg:h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
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
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {/* Top Renewals */}
          <motion.div variants={itemVariants} className="min-w-0">
            <Card className="p-4 sm:p-6 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col relative min-w-0">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-md shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">Próximas Renovações</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Top 10 renovações mais próximas</p>
                </div>
              </div>
              {topRenewals.length > 0 ? (
                <div className="flex-1 relative z-10 overflow-y-auto overflow-x-visible max-h-[400px]">
                  <div className="space-y-2 sm:space-y-3 min-w-full">
                    {topRenewals.slice(0, 10).map((renewal, index) => (
                      <motion.div
                        key={renewal.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between rounded-xl border border-border p-3 sm:p-4 hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-transparent transition-all cursor-pointer group shadow-sm hover:shadow-md w-full"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
                              {renewal.client.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {renewal.product || "Sem produto"} • {renewal.insurer || "Sem seguradora"}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-3 text-right shrink-0 whitespace-nowrap">
                          <p className="text-sm font-bold text-foreground">
                            {formatDate(renewal.dueDate)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    <Link href="/renewals" className="block mt-4 pt-2 border-t border-border">
                      <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Ver todas as renovações
                      </Button>
                    </Link>
                  </div>
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
          <motion.div variants={itemVariants} className="min-w-0">
            <Card className="p-4 sm:p-6 border border-border bg-card shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col relative min-w-0">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="mb-4 sm:mb-6 flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-md shrink-0">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">Aniversários de Hoje</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">Clientes que fazem aniversário hoje</p>
                </div>
              </div>
              {todaysBirthdays.length > 0 ? (
                <div className="flex-1 relative z-10 overflow-y-auto overflow-x-visible max-h-[400px]">
                  <div className="space-y-2 sm:space-y-3 min-w-full">
                    {todaysBirthdays.slice(0, 10).map((client, index) => (
                      <motion.div
                        key={client.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between rounded-xl border border-border p-3 sm:p-4 hover:border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-transparent transition-all cursor-pointer group shadow-sm hover:shadow-md w-full"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                            <Gift className="h-4 w-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-purple-400 transition-colors">
                              {client.name}
                            </p>
                            {client.phone && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {client.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        {client.birthday && (
                          <div className="ml-2 sm:ml-3 text-right shrink-0 whitespace-nowrap">
                            <p className="text-sm font-bold text-foreground">
                              {formatDate(client.birthday)}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    <Link href="/clients" className="block mt-4 pt-2 border-t border-border">
                      <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="outline">
                        <Users className="h-4 w-4 mr-2" />
                        Ver todos os clientes
                      </Button>
                    </Link>
                  </div>
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

        {/* Urgent Actions Modal */}
        <Dialog open={showUrgentActions} onOpenChange={setShowUrgentActions}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-950/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                </div>
                <DialogTitle className="text-lg sm:text-xl lg:text-2xl truncate">
                  {pluralize(urgentCount, "Ação Urgente", "Ações Urgentes")}
                </DialogTitle>
              </div>
              <button
                onClick={() => setShowUrgentActions(false)}
                className="rounded-lg p-1.5 sm:p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
                aria-label="Fechar"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </DialogHeader>
          <DialogContent className="space-y-3 sm:space-y-4">
            {urgentActions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Nenhuma ação urgente encontrada
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                {urgentActions.map((action) => {
                  const status = classifyDueStatus(action.dueDate);
                  const isOverdue = status === "overdue";
                  
                  return (
                    <Card
                      key={action.id}
                      className={cn(
                        "relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 border-0",
                        isOverdue
                          ? ""
                          : ""
                      )}
                    >
                      {/* Colored left border */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5 z-10",
                        isOverdue ? "bg-red-500" : "bg-amber-500"
                      )} />
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                isOverdue
                                  ? "bg-red-500/20 border border-red-500/30"
                                  : "bg-amber-500/20 border border-amber-500/30"
                              )}>
                                <FileText className={cn(
                                  "h-5 w-5",
                                  isOverdue ? "text-red-400" : "text-amber-400"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="font-bold text-base sm:text-lg text-foreground truncate">
                                    {action.client.name}
                                  </h3>
                                  {isOverdue && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-md shadow-sm shrink-0">
                                      VENCIDO
                                    </span>
                                  )}
                                  {!isOverdue && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-600 text-white rounded-md shadow-sm shrink-0">
                                      URGENTE
                                    </span>
                                  )}
                                </div>
                                {action.product && (
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    {action.product}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 ml-0 sm:ml-[52px]">
                              {action.policyNumber && (
                                <div className="flex items-start gap-2">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Apólice</p>
                                    <p className="text-sm font-semibold text-foreground break-words">{action.policyNumber}</p>
                                  </div>
                                </div>
                              )}
                              {action.insurer && (
                                <div className="flex items-start gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Seguradora</p>
                                    <p className="text-sm font-semibold text-foreground break-words">{action.insurer}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">Vencimento</p>
                                  <p className={cn(
                                    "text-sm font-bold",
                                    isOverdue ? "text-red-400" : "text-amber-400"
                                  )}>
                                    {formatDate(action.dueDate)}
                                  </p>
                                </div>
                              </div>
                              {action.client.phone && (
                                <div className="flex items-start gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Telefone</p>
                                    <p className="text-sm font-semibold text-foreground break-words">{action.client.phone}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex sm:flex-col gap-2 sm:gap-2 shrink-0">
                            <Link href="/renewals" className="w-full sm:w-auto bg-transparent">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow bg-transparent"
                                onClick={() => setShowUrgentActions(false)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Ver Detalhes
                              </Button>
                            </Link>
                            {action.client.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto bg-green-600/10 border-green-600/30 hover:bg-green-600/20 text-green-400"
                                onClick={() => {
                                  const phone = action.client.phone?.replace(/\D/g, "");
                                  if (phone) {
                                    window.open(`https://wa.me/55${phone}`, "_blank");
                                  }
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                                WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
}
