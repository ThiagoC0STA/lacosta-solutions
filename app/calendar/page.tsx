"use client";

import { useMemo, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import { formatDate, classifyDueStatus, isBirthdayToday } from "@/lib/date-helpers";
import { getStatusColor } from "@/lib/colors";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Gift, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenewalWithClient } from "@/types";
import type { Client } from "@/types";
import { RenewalDetailModal } from "@/components/renewal-detail-modal";

export default function CalendarPage() {
  const { clients } = useClients();
  const { policies, updatePolicy, deletePolicy } = usePolicies();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalWithClient | null>(null);

  const renewalsWithClients = useMemo<RenewalWithClient[]>(() => {
    return policies.map((policy) => {
      const client = clients.find((c) => c.id === policy.clientId);
      return {
        ...policy,
        client: client || { id: policy.clientId, name: "Cliente não encontrado" },
      };
    });
  }, [policies, clients]);

  const handleUpdateRenewal = useCallback(async (id: string, data: Partial<Omit<RenewalWithClient, "id" | "client">>) => {
    const updated = await updatePolicy({ id, data });
    // Update selectedRenewal with the returned data
    if (selectedRenewal && selectedRenewal.id === id) {
      setSelectedRenewal({
        ...selectedRenewal,
        ...updated,
        client: selectedRenewal.client,
      });
    }
    return { ...updated, client: selectedRenewal?.client || { id: "", name: "" } };
  }, [updatePolicy, selectedRenewal]);

  const handleSelectPolicy = useCallback((policyId: string) => {
    const renewal = renewalsWithClients.find((r) => r.id === policyId);
    if (renewal) {
      setSelectedRenewal(renewal);
    }
  }, [renewalsWithClients]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();


  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const renewalsByDate = useMemo(() => {
    const map = new Map<string, RenewalWithClient[]>();
    renewalsWithClients
      .filter((r) => r.status === "active")
      .forEach((renewal) => {
        const dueDate = typeof renewal.dueDate === "string" ? new Date(renewal.dueDate) : renewal.dueDate;
        const dateKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(renewal);
      });
    return map;
  }, [renewalsWithClients]);

  const birthdaysByDate = useMemo(() => {
    const map = new Map<string, Client[]>();
    const year = currentDate.getFullYear();
    clients
      .filter((c) => c.birthday)
      .forEach((client) => {
        const birthday = typeof client.birthday === "string" ? new Date(client.birthday) : client.birthday;
        if (!birthday) return;
        const dateKey = `${year}-${String(birthday.getMonth() + 1).padStart(2, "0")}-${String(birthday.getDate()).padStart(2, "0")}`;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(client);
      });
    return map;
  }, [clients, currentDate]);

  const getRenewalsForDate = (day: number): RenewalWithClient[] => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return renewalsByDate.get(dateKey) || [];
  };

  const getBirthdaysForDate = (day: number): Client[] => {
    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return birthdaysByDate.get(dateKey) || [];
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const days = [];
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <CalendarIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Calendário
                </h1>
                <p className="text-muted-foreground text-lg mt-1">
                  Visualize renovações e aniversários por data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xl font-bold min-w-[200px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </div>
              <Button variant="outline" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                className="ml-2"
              >
                Hoje
              </Button>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-bold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const renewals = getRenewalsForDate(day);
                const birthdays = getBirthdaysForDate(day);
                const dayDate = new Date(currentYear, currentMonth, day);
                const isPast = dayDate < today && !isToday(day);
                const hasEvents = renewals.length > 0 || birthdays.length > 0;

                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square border rounded-lg p-2 transition-all hover:shadow-md",
                      isToday(day)
                        ? "border-primary bg-primary/5 shadow-md"
                        : isPast
                        ? "border-border/50 bg-muted/20"
                        : "border-border bg-card",
                      hasEvents && "border-2"
                    )}
                  >
                    <div className="flex flex-col h-full">
                      <div
                        className={cn(
                          "text-sm font-semibold mb-1",
                          isToday(day) && "text-primary"
                        )}
                      >
                        {day}
                      </div>
                      <div className="flex-1 overflow-hidden space-y-1">
                        {/* Birthdays first */}
                        {birthdays.slice(0, 2).map((client) => {
                          const isTodayBirthday = isBirthdayToday(client.birthday);
                          // Find first active policy for this client to show in modal
                          const clientRenewal = renewalsWithClients
                            .filter((r) => r.clientId === client.id && r.status === "active")
                            .sort((a, b) => {
                              const dateA = typeof a.dueDate === "string" ? new Date(a.dueDate) : a.dueDate;
                              const dateB = typeof b.dueDate === "string" ? new Date(b.dueDate) : b.dueDate;
                              return dateA.getTime() - dateB.getTime();
                            })[0];
                          
                          return (
                            <div
                              key={`birthday-${client.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                // If client has a renewal, show it. Otherwise create a dummy one for display
                                if (clientRenewal) {
                                  setSelectedRenewal(clientRenewal);
                                } else {
                                  // Create a dummy renewal just for modal display
                                  const dummyRenewal: RenewalWithClient = {
                                    id: `dummy-${client.id}`,
                                    clientId: client.id,
                                    policyNumber: "",
                                    insurer: "",
                                    product: "",
                                    dueDate: new Date(),
                                    premium: 0,
                                    status: "active",
                                    notes: "",
                                    client: client,
                                  };
                                  setSelectedRenewal(dummyRenewal);
                                }
                              }}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1",
                                isTodayBirthday
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                                  : "bg-purple-500/20 text-purple-300"
                              )}
                              title={`${client.name} - Aniversário${isTodayBirthday ? " Hoje! 🎉" : ""}`}
                            >
                              {isTodayBirthday ? (
                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                              ) : (
                                <Gift className="h-2.5 w-2.5 shrink-0" />
                              )}
                              <span className="truncate">{client.name}</span>
                            </div>
                          );
                        })}
                        {/* Renewals */}
                        {renewals.slice(0, birthdays.length > 0 ? 2 : 3).map((renewal) => {
                          const status = classifyDueStatus(renewal.dueDate);
                          const statusKey = status === "overdue" ? "overdue" : status === "d7" ? "urgent" : "default";
                          const colors = getStatusColor(statusKey);
                          return (
                            <div
                              key={renewal.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRenewal(renewal);
                              }}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                                colors.iconBg,
                                colors.iconColor
                              )}
                              title={`${renewal.client.name} - Vence em ${formatDate(renewal.dueDate)}`}
                            >
                              {renewal.client.name}
                            </div>
                          );
                        })}
                        {(renewals.length + birthdays.length) > (birthdays.length > 0 ? 4 : 3) && (
                          <div className="text-xs text-muted-foreground font-medium">
                            +{(renewals.length + birthdays.length) - (birthdays.length > 0 ? 4 : 3)} mais
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Renovações</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                    <span className="text-sm">Vencidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500/20 border border-orange-500/30" />
                    <span className="text-sm">0-7 dias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
                    <span className="text-sm">8-15 dias</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-indigo-500/20 border border-indigo-500/30" />
                    <span className="text-sm">16-30 dias</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Aniversários</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-500 to-pink-500 border border-purple-400" />
                    <span className="text-sm flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Hoje
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30" />
                    <span className="text-sm flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      Este mês
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Detail Modal */}
        <RenewalDetailModal
          renewal={selectedRenewal}
          onClose={() => setSelectedRenewal(null)}
          onUpdate={handleUpdateRenewal}
          onDelete={deletePolicy}
          allPolicies={policies}
          onSelectPolicy={handleSelectPolicy}
        />      
        </div>
    </AppLayout>
  );
}
