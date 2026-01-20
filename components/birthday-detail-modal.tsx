"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, X, Phone, Mail, Calendar, MessageCircle, FileText, Building2, Package, DollarSign, Info } from "lucide-react";
import { formatDate, isBirthdayToday } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import type { Client } from "@/types";
import type { Policy } from "@/types";

interface BirthdayDetailModalProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  policies?: Policy[];
}

export function BirthdayDetailModal({
  open,
  onClose,
  client,
  policies = [],
}: BirthdayDetailModalProps) {
  if (!client) return null;

  const isToday = isBirthdayToday(client.birthday);
  const clientPolicies = policies.filter((p) => p.clientId === client.id);
  const activePolicies = clientPolicies.filter((p) => p.status === "active");

  const handleWhatsApp = () => {
    if (!client.phone) return;
    const phone = client.phone.replace(/\D/g, "");
    if (phone) {
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                isToday
                  ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/50"
                  : "bg-purple-500/20 border border-purple-500/30"
              )}>
                {isToday ? (
                  <Sparkles className="h-6 w-6 text-purple-300 animate-pulse" />
                ) : (
                  <Gift className="h-6 w-6 text-purple-400" />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl sm:text-3xl">
                  {isToday ? "🎉 Parabéns!" : "Aniversariante"}
                </DialogTitle>
                {isToday && (
                  <p className="text-sm text-purple-300 mt-1 font-semibold">
                    Hoje é o aniversário de {client.name}!
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <DialogContent className="space-y-6">
        {/* Birthday Card */}
        <Card className={cn(
          "relative overflow-hidden border-2",
          isToday
            ? "bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-purple-500/20 border-purple-400/50 shadow-xl"
            : "bg-purple-500/10 border-purple-500/30"
        )}>
          {/* Decorative elements */}
          {isToday && (
            <>
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl" />
            </>
          )}
          
          <CardHeader className="relative z-10">
            <CardTitle className="text-xl flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                isToday
                  ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30"
                  : "bg-purple-500/20"
              )}>
                {isToday ? (
                  <Sparkles className="h-6 w-6 text-purple-200" />
                ) : (
                  <Gift className="h-6 w-6 text-purple-400" />
                )}
              </div>
              <span className={isToday ? "text-purple-100" : ""}>
                {client.name}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {client.birthday && (
                <div className={cn(
                  "space-y-2 p-4 rounded-xl border transition-all",
                  isToday
                    ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50"
                    : "bg-purple-500/10 border-purple-500/30"
                )}>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                    <Calendar className={cn("h-4 w-4", isToday ? "text-purple-200" : "text-purple-400")} />
                    <span className={isToday ? "text-purple-200 font-bold" : "text-purple-300"}>
                      {isToday ? "Aniversário Hoje! 🎉" : "Data de Nascimento"}
                    </span>
                  </div>
                  <p className={cn(
                    "font-bold text-lg",
                    isToday ? "text-purple-100" : "text-foreground"
                  )}>
                    {formatDate(client.birthday)}
                  </p>
                </div>
              )}
              
              {client.phone && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Phone className="h-4 w-4" />
                    <span>Telefone</span>
                  </div>
                  <p className="font-semibold text-base break-all">{client.phone}</p>
                </div>
              )}
              
              {client.email && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                  <p className="font-semibold text-sm break-all">{client.email}</p>
                </div>
              )}
              
              <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-4 w-4" />
                  <span>Total de Apólices</span>
                </div>
                <p className="font-semibold text-base">{clientPolicies.length}</p>
              </div>
            </div>

            {client.phone && (
              <Button
                onClick={handleWhatsApp}
                className={cn(
                  "w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all",
                  isToday
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                )}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Enviar Parabéns no WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Policies Card */}
        {activePolicies.length > 0 && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Apólices Ativas ({activePolicies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3">
                {activePolicies.map((policy) => (
                  <div
                    key={policy.id}
                    className="relative border rounded-lg p-4 bg-gradient-to-br from-muted/60 to-muted/40 border-border/50 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="grid gap-3 md:grid-cols-3">
                      {policy.policyNumber && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <FileText className="h-3 w-3" />
                            <span>Número</span>
                          </div>
                          <p className="text-sm font-semibold">{policy.policyNumber}</p>
                        </div>
                      )}
                      {policy.insurer && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Building2 className="h-3 w-3" />
                            <span>Seguradora</span>
                          </div>
                          <p className="text-sm font-semibold">{policy.insurer}</p>
                        </div>
                      )}
                      {policy.product && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Package className="h-3 w-3" />
                            <span>Produto</span>
                          </div>
                          <p className="text-sm font-semibold">{policy.product}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Calendar className="h-3 w-3" />
                          <span>Vencimento</span>
                        </div>
                        <p className="text-sm font-semibold">{formatDate(policy.dueDate)}</p>
                      </div>
                      {policy.premium && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <DollarSign className="h-3 w-3" />
                            <span>Prêmio</span>
                          </div>
                          <p className="text-base font-bold text-green-400">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(policy.premium)}
                          </p>
                        </div>
                      )}
                    </div>
                    {policy.notes && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          <Info className="h-3 w-3" />
                          <span>Observações</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{policy.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
