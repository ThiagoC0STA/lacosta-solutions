"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  FileText,
  User,
  Phone,
  Mail,
  Calendar as CalendarLucide,
  Building2,
  Package,
  DollarSign,
  Info,
  X,
  Edit2,
  Save,
  Trash2,
  MessageCircle,
} from "lucide-react";
import type { RenewalWithClient } from "@/types";
import { formatDate } from "@/lib/date-helpers";

interface RenewalDetailModalProps {
  renewal: RenewalWithClient | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Omit<RenewalWithClient, "id" | "client">>) => Promise<RenewalWithClient>;
  onDelete: (id: string) => Promise<void>;
  allPolicies?: Array<{ id: string; clientId: string; dueDate: Date | string; [key: string]: any }>;
  onSelectPolicy?: (policyId: string) => void;
}

export function RenewalDetailModal({
  renewal,
  onClose,
  onUpdate,
  onDelete,
  allPolicies = [],
  onSelectPolicy,
}: RenewalDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<RenewalWithClient>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = useCallback(() => {
    if (renewal) {
      setIsEditing(true);
      setEditedData({ ...renewal });
    }
  }, [renewal]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedData({});
  }, []);

  const handleSave = useCallback(async () => {
    if (!renewal) return;
    setIsSaving(true);
    try {
      await onUpdate(renewal.id, {
        policyNumber: editedData.policyNumber,
        insurer: editedData.insurer,
        product: editedData.product,
        dueDate: editedData.dueDate,
        premium: editedData.premium,
        status: editedData.status,
        notes: editedData.notes,
      });
      // Close editing mode and clear data after successful update
      setIsEditing(false);
      setEditedData({});
      // Update the renewal prop will be handled by parent component
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  }, [renewal, editedData, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!renewal) return;
    if (!confirm(`Tem certeza que deseja deletar esta apólice? Esta ação não pode ser desfeita.`)) return;
    setIsDeleting(true);
    try {
      await onDelete(renewal.id);
      onClose();
    } catch (error) {
      alert(`Erro ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsDeleting(false);
    }
  }, [renewal, onDelete, onClose]);

  const handleInputChange = useCallback((field: keyof RenewalWithClient, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  }, []);

  if (!renewal) return null;

  const clientPolicies = allPolicies.filter((p) => p.clientId === renewal.clientId);
  const showAllPolicies = clientPolicies.length > 1 && !renewal.id.startsWith("dummy-");

  return (
    <Dialog open={!!renewal} onOpenChange={(open) => !open && onClose()}>
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-2xl">
              {isEditing ? "Editar Apólice" : "Detalhes da Renovação"}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            {!renewal.id.startsWith("dummy-") && (
              <>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                )}
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Deletando..." : "Deletar"}
                </Button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </DialogHeader>
      <DialogContent className="space-y-6">
        {/* Client Info Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          <CardHeader className="pb-4 relative">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                <User className="h-4 w-4 text-primary" />
              </div>
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  <span>Nome</span>
                </div>
                <p className="font-semibold text-base">{renewal.client.name}</p>
              </div>
              {renewal.client.phone && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Phone className="h-3.5 w-3.5" />
                    <span>Telefone</span>
                  </div>
                  <p className="font-semibold text-base">{renewal.client.phone}</p>
                </div>
              )}
              {renewal.client.email && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </div>
                  <p className="font-semibold text-base break-all">{renewal.client.email}</p>
                </div>
              )}
              {renewal.client.birthday && (
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarLucide className="h-3.5 w-3.5" />
                    <span>Data de Nascimento</span>
                  </div>
                  <p className="font-semibold text-base">{formatDate(renewal.client.birthday)}</p>
                </div>
              )}
            </div>
            {renewal.client.phone && (
              <Button
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                onClick={() => {
                  const phone = renewal.client.phone?.replace(/\D/g, "");
                  if (phone) {
                    window.open(`https://wa.me/55${phone}`, "_blank");
                  }
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Policy Info Card */}
        {!renewal.id.startsWith("dummy-") && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            <CardHeader className="pb-4 relative">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Informações da Apólice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Número da Apólice</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={editedData.policyNumber || ""}
                      onChange={(e) => handleInputChange("policyNumber", e.target.value)}
                      placeholder="Número da apólice"
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-base">{renewal.policyNumber || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Seguradora</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={editedData.insurer || ""}
                      onChange={(e) => handleInputChange("insurer", e.target.value)}
                      placeholder="Seguradora"
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-base">{renewal.insurer || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Package className="h-3.5 w-3.5" />
                    <span>Produto</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={editedData.product || ""}
                      onChange={(e) => handleInputChange("product", e.target.value)}
                      placeholder="Produto"
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-base">{renewal.product || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarLucide className="h-3.5 w-3.5" />
                    <span>Vencimento</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={
                        editedData.dueDate
                          ? typeof editedData.dueDate === "string"
                            ? editedData.dueDate.split("T")[0]
                            : new Date(editedData.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange("dueDate", e.target.value ? new Date(e.target.value) : undefined)
                      }
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-base">{formatDate(renewal.dueDate)}</p>
                  )}
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Info className="h-3.5 w-3.5" />
                    <span>Status</span>
                  </div>
                  {isEditing ? (
                    <Select
                      value={editedData.status || renewal.status}
                      onChange={(e) => handleInputChange("status", e.target.value as "active" | "renewed" | "lost")}
                      className="font-semibold w-full"
                    >
                      <option value="active">Ativo</option>
                      <option value="renewed">Renovado</option>
                      <option value="lost">Perdido</option>
                    </Select>
                  ) : (
                    <p className="font-semibold text-base">
                      {renewal.status === "active" ? "Ativo" : renewal.status === "renewed" ? "Renovado" : "Perdido"}
                    </p>
                  )}
                </div>
                {renewal.premium && (
                  <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-950/30 to-green-950/20 border border-green-900/50 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Prêmio Total</span>
                    </div>
                    <p className="font-bold text-lg text-green-400">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(renewal.premium)}
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Info */}
              {renewal.notes && renewal.notes.includes("IOF") && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="flex items-center gap-2.5 text-sm font-bold mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <span>Informações Financeiras</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {renewal.notes.split(" | ").map((note, idx) => {
                      if (note.includes("IOF") || note.includes("Prêmio Líquido") || note.includes("Comissão")) {
                        return (
                          <div
                            key={idx}
                            className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-xl p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5"
                          >
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                              {note.split(":")[0]}
                            </p>
                            <p className="text-base font-bold text-foreground">{note.split(":")[1]?.trim()}</p>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Other Notes */}
              {renewal.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Info className="h-4 w-4" />
                    <span>Observações</span>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-sm">{renewal.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Policies Card */}
        {showAllPolicies && onSelectPolicy && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            <CardHeader className="pb-4 relative">
              <CardTitle className="text-lg flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Todas as Apólices ({clientPolicies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-3">
                {clientPolicies.map((policy) => {
                  const isSelected = policy.id === renewal.id;
                  return (
                    <div
                      key={policy.id}
                      onClick={() => onSelectPolicy(policy.id)}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isSelected && <span className="text-xs text-primary font-semibold">(Selecionada)</span>}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {policy.policyNumber && (
                          <p>
                            <span className="font-medium">Apólice:</span> {policy.policyNumber}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Vencimento:</span> {formatDate(policy.dueDate)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
