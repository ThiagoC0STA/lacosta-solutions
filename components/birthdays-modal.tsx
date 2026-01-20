"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Gift, Sparkles, X, Phone, Mail, Calendar } from "lucide-react";
import { formatDate, isBirthdayToday, isBirthdayThisMonth } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";

interface BirthdaysModalProps {
  open: boolean;
  onClose: () => void;
  filter: "today" | "thisMonth" | null;
  clients: Client[];
  onClientClick: (client: Client) => void;
}

export function BirthdaysModal({
  open,
  onClose,
  filter,
  clients,
  onClientClick,
}: BirthdaysModalProps) {
  const getTitle = () => {
    switch (filter) {
      case "today":
        return "Aniversários Hoje";
      case "thisMonth":
        return "Aniversários Este Mês";
      default:
        return "Aniversários";
    }
  };

  const filteredClients = clients.filter((client) => {
    if (!client.birthday) return false;
    if (filter === "today") {
      return isBirthdayToday(client.birthday);
    }
    if (filter === "thisMonth") {
      return isBirthdayThisMonth(client.birthday);
    }
    return false;
  }).sort((a, b) => {
    if (!a.birthday || !b.birthday) return 0;
    const dateA = typeof a.birthday === "string" ? new Date(a.birthday) : a.birthday;
    const dateB = typeof b.birthday === "string" ? new Date(b.birthday) : b.birthday;
    return dateA.getDate() - dateB.getDate();
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              {filter === "today" ? (
                <Sparkles className="h-5 w-5 text-purple-400" />
              ) : (
                <Gift className="h-5 w-5 text-purple-400" />
              )}
            </div>
            <DialogTitle className="text-2xl">
              {getTitle()}
            </DialogTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogHeader>
      <DialogContent className="space-y-4">
        {filteredClients.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredClients.map((client) => {
              const isToday = isBirthdayToday(client.birthday);
              return (
                <Card
                  key={client.id}
                  onClick={() => {
                    onClose();
                    onClientClick(client);
                  }}
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-md transition-all",
                    isToday
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50"
                      : "bg-purple-500/10 border-purple-500/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {isToday ? (
                          <Sparkles className="h-5 w-5 text-purple-400 shrink-0" />
                        ) : (
                          <Gift className="h-5 w-5 text-purple-400 shrink-0" />
                        )}
                        <p className="font-semibold text-base truncate">
                          {client.name}
                        </p>
                        {isToday && (
                          <span className="text-xs font-bold text-purple-300 shrink-0">
                            Hoje! 🎉
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                        {client.birthday && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(client.birthday)}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4" />
                            <span className="truncate max-w-[200px]">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              {filter === "today" ? (
                <Sparkles className="h-8 w-8 opacity-50" />
              ) : (
                <Gift className="h-8 w-8 opacity-50" />
              )}
            </div>
            <p className="text-sm font-medium">
              {filter === "today" ? "Nenhum aniversário hoje" : "Nenhum aniversário este mês"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
