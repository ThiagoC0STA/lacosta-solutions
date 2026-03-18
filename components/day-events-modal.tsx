"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, FileText, Calendar as CalendarIcon, X } from "lucide-react";
import { formatDate, classifyDueStatus, isBirthdayToday } from "@/lib/date-helpers";
import { InsurerLogo } from "@/components/insurer-logo";
import { getStatusColor } from "@/lib/colors";
import { getProductDisplay } from "@/lib/product-helpers";
import { cn } from "@/lib/utils";
import type { Product, RenewalWithClient } from "@/types";
import type { Client } from "@/types";

interface DayEventsModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  renewals: RenewalWithClient[];
  birthdays: Client[];
  products?: Product[];
  insurers?: { id: string; name: string; logoUrl?: string }[];
  onRenewalClick: (renewal: RenewalWithClient) => void;
  onBirthdayClick: (client: Client, renewal?: RenewalWithClient) => void;
}

export function DayEventsModal({
  open,
  onClose,
  date,
  renewals,
  birthdays,
  products = [],
  insurers = [],
  onRenewalClick,
  onBirthdayClick,
}: DayEventsModalProps) {
  if (!date) return null;

  const dateStr = formatDate(date);
  const hasEvents = renewals.length > 0 || birthdays.length > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl truncate">
              Eventos do Dia - {dateStr}
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 sm:p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </DialogHeader>
      <DialogContent className="space-y-4">
        {!hasEvents ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm sm:text-base">Nenhum evento neste dia</p>
          </div>
        ) : (
          <>
            {/* Birthdays */}
            {birthdays.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Aniversários ({birthdays.length})
                </h3>
                <div className="space-y-2">
                  {birthdays.map((client) => {
                    const isTodayBirthday = isBirthdayToday(client.birthday);
                    return (
                      <Card
                        key={client.id}
                        className={cn(
                          "p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all",
                          isTodayBirthday
                            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50"
                            : "bg-purple-500/10 border-purple-500/30"
                        )}
                        onClick={() => onBirthdayClick(client)}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          {isTodayBirthday ? (
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 shrink-0" />
                          ) : (
                            <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base truncate">
                              {client.name}
                            </p>
                            {client.phone && (
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {client.phone}
                              </p>
                            )}
                          </div>
                          {isTodayBirthday && (
                            <span className="text-xs sm:text-sm font-bold text-purple-300 shrink-0">
                              Hoje! 🎉
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Renewals */}
            {renewals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Renovações ({renewals.length})
                </h3>
                <div className="space-y-2">
                  {renewals.map((renewal) => {
                    const status = classifyDueStatus(renewal.dueDate);
                    const statusKey = status === "overdue" ? "overdue" : status === "d7" ? "urgent" : "default";
                    const colors = getStatusColor(statusKey);
                    return (
                      <Card
                        key={renewal.id}
                        className={cn(
                          "p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all border-l-4",
                          colors.rowBg
                        )}
                        onClick={() => onRenewalClick(renewal)}
                      >
                        <div className="flex items-stretch justify-between gap-2 sm:gap-3 min-h-[100px]">
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="font-semibold text-base sm:text-lg truncate">
                              {renewal.client.name}
                            </p>
                            {renewal.policyNumber && (
                              <p className="text-sm text-muted-foreground">
                                CPF/CNPJ: {renewal.policyNumber}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Vence em: {formatDate(renewal.dueDate)}
                            </p>
                            {renewal.insurer && (
                              <InsurerLogo insurerName={renewal.insurer} insurers={insurers} width={88} height={44} className="shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-col justify-between items-end shrink-0">
                            <div className={cn("px-2.5 py-1 rounded-md text-xs font-medium", colors.iconBg, colors.iconColor)}>
                              {status === "overdue" ? "Vencido" : status === "d7" ? "Urgente" : "Normal"}
                            </div>
                            {renewal.product && (
                              <span className="inline-flex px-3 py-1.5 text-sm font-medium bg-slate-500/20 text-slate-200 rounded-lg border border-slate-500/40">
                                {getProductDisplay(renewal.product, products)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
