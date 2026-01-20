"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { FileText, X } from "lucide-react";
import { formatDate, classifyDueStatus } from "@/lib/date-helpers";
import { getStatusColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { RenewalWithClient } from "@/types";

interface FilteredRenewalsModalProps {
  open: boolean;
  onClose: () => void;
  filter: string | null;
  renewals: RenewalWithClient[];
  onRenewalClick: (renewal: RenewalWithClient) => void;
}

export function FilteredRenewalsModal({
  open,
  onClose,
  filter,
  renewals,
  onRenewalClick,
}: FilteredRenewalsModalProps) {
  const getTitle = () => {
    switch (filter) {
      case "overdue":
        return "Renovações Vencidas";
      case "d7":
        return "Renovações Urgentes";
      case "d15":
        return "Próximas Renovações";
      case "d30":
        return "Renovações Futuras";
      default:
        return "Renovações";
    }
  };

  const filteredRenewals = renewals.filter((r) => {
    if (r.status !== "active") return false;
    const status = classifyDueStatus(r.dueDate);
    switch (filter) {
      case "overdue":
        return status === "overdue";
      case "d7":
        return status === "d7";
      case "d15":
        return status === "d15";
      case "d30":
        return status === "d30";
      default:
        return false;
    }
  }).sort((a, b) => {
    const dateA = typeof a.dueDate === "string" ? new Date(a.dueDate) : a.dueDate;
    const dateB = typeof b.dueDate === "string" ? new Date(b.dueDate) : b.dueDate;
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
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
        {filteredRenewals.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredRenewals.map((renewal) => {
              const status = classifyDueStatus(renewal.dueDate);
              const statusKey = status === "overdue" ? "overdue" : status === "d7" ? "urgent" : "default";
              const colors = getStatusColor(statusKey);
              return (
                <div
                  key={renewal.id}
                  onClick={() => {
                    onClose();
                    onRenewalClick(renewal);
                  }}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all",
                    colors.rowBg
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">
                        {renewal.client.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {renewal.policyNumber && (
                          <span className="text-xs text-muted-foreground">
                            Apólice: {renewal.policyNumber}
                          </span>
                        )}
                        {renewal.insurer && (
                          <span className="text-xs text-muted-foreground">
                            {renewal.insurer}
                          </span>
                        )}
                        {renewal.product && (
                          <span className="text-xs text-muted-foreground">
                            {renewal.product}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Vence em: {formatDate(renewal.dueDate)}
                      </p>
                    </div>
                    <div className={cn("px-2 py-1 rounded text-xs font-medium shrink-0", colors.iconBg, colors.iconColor)}>
                      {status === "overdue" ? "Vencido" : status === "d7" ? "Urgente" : "Normal"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">Nenhuma renovação encontrada</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
