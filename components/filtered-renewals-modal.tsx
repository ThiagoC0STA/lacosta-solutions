"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { FileText, X } from "lucide-react";
import { formatDate, classifyDueStatus } from "@/lib/date-helpers";
import { InsurerLogo } from "@/components/insurer-logo";
import { getStatusColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { Product, RenewalWithClient } from "@/types";
import { getProductDisplay } from "@/lib/product-helpers";

interface FilteredRenewalsModalProps {
  open: boolean;
  onClose: () => void;
  filter: string | null;
  renewals: RenewalWithClient[];
  onRenewalClick: (renewal: RenewalWithClient) => void;
  products?: Product[];
  insurers?: { id: string; name: string; logoUrl?: string }[];
}

export function FilteredRenewalsModal({
  open,
  onClose,
  filter,
  renewals,
  onRenewalClick,
  products = [],
  insurers = [],
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
                  <div className="flex items-stretch justify-between gap-3 min-h-[100px]">
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
