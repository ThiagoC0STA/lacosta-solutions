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
  Car,
} from "lucide-react";
import type { RenewalWithClient } from "@/types";
import { formatDate } from "@/lib/date-helpers";
import {
  calculateFromPremium,
  parseNotesFromPolicy,
  buildNotesFromFinancial,
  formatCurrency,
  parseBRLToNumber,
  formatBRLForInput,
} from "@/lib/insurance-calculations";

interface RenewalDetailModalProps {
  renewal: RenewalWithClient | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Omit<RenewalWithClient, "id" | "client">>) => Promise<RenewalWithClient>;
  onUpdateClient?: (id: string, data: Partial<{ name: string; phone?: string; email?: string; birthday?: Date | string }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  allPolicies?: Array<{ id: string; clientId: string; dueDate: Date | string; [key: string]: any }>;
  onSelectPolicy?: (policyId: string) => void;
}

export function RenewalDetailModal({
  renewal,
  onClose,
  onUpdate,
  onDelete,
  onUpdateClient,
  allPolicies = [],
  onSelectPolicy,
}: RenewalDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<RenewalWithClient>>({});
  const [editedPlate, setEditedPlate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const hasUnsavedChanges = useCallback(() => {
    if (!renewal || !isEditing) return false;
    const c = editedData.client ?? renewal.client;
    const clientChanged =
      (c?.name ?? "") !== (renewal.client?.name ?? "") ||
      (c?.phone ?? "") !== (renewal.client?.phone ?? "") ||
      (c?.email ?? "") !== (renewal.client?.email ?? "") ||
      (c?.birthday?.toString() ?? "") !== (renewal.client?.birthday?.toString() ?? "");
    const policyChanged =
      (editedData.policyNumber ?? renewal.policyNumber ?? "") !== (renewal.policyNumber ?? "") ||
      (editedData.insurer ?? renewal.insurer ?? "") !== (renewal.insurer ?? "") ||
      (editedData.product ?? renewal.product ?? "") !== (renewal.product ?? "") ||
      (editedData.dueDate?.toString() ?? renewal.dueDate?.toString() ?? "") !== (renewal.dueDate?.toString() ?? "") ||
      (editedData.premium ?? renewal.premium ?? 0) !== (renewal.premium ?? 0) ||
      (editedData.status === "active" ? "active" : "inactive") !== (renewal.status === "active" ? "active" : "inactive");
    const plateChanged = (editedPlate || "") !== (parseNotesFromPolicy(renewal.notes).plate || "");
    return clientChanged || policyChanged || plateChanged;
  }, [renewal, isEditing, editedData, editedPlate]);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleEdit = useCallback(() => {
    if (renewal) {
      setIsEditing(true);
      setEditedData({ ...renewal });
      const parsed = parseNotesFromPolicy(renewal.notes);
      setEditedPlate(parsed.plate || "");
    }
  }, [renewal]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedData({});
    setEditedPlate("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!renewal) return;
    setIsSaving(true);
    try {
      const clientChanged = editedData.client && (
        editedData.client.name !== renewal.client.name ||
        editedData.client.phone !== renewal.client.phone ||
        editedData.client.email !== renewal.client.email ||
        (editedData.client.birthday?.toString() ?? "") !== (renewal.client.birthday?.toString() ?? "")
      );
      if (clientChanged && onUpdateClient && editedData.client) {
        await onUpdateClient(renewal.clientId, {
          name: editedData.client.name,
          phone: editedData.client.phone,
          email: editedData.client.email,
          birthday: editedData.client.birthday,
        });
      }
      const premium = editedData.premium ?? renewal.premium;
      let notes = editedData.notes;
      if (premium != null && premium > 0) {
        notes = buildNotesFromFinancial(premium, editedPlate.trim() || undefined);
      }
      const status = editedData.status === "active" ? "active" : "inactive";
      await onUpdate(renewal.id, {
        policyNumber: editedData.policyNumber,
        insurer: editedData.insurer,
        product: editedData.product,
        dueDate: editedData.dueDate,
        premium: editedData.premium,
        status,
        notes,
      });
      setIsEditing(false);
      setEditedData({});
      setEditedPlate("");
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  }, [renewal, editedData, editedPlate, onUpdate, onUpdateClient]);

  const handleCloseAndSave = useCallback(async () => {
    setShowCloseConfirm(false);
    try {
      await handleSave();
      onClose();
    } catch {
      // Error already shown by handleSave
    }
  }, [handleSave, onClose]);

  const handleCloseWithoutSaving = useCallback(() => {
    setShowCloseConfirm(false);
    handleCancel();
    onClose();
  }, [handleCancel, onClose]);

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

  const handleClientChange = useCallback(
    (field: "name" | "phone" | "email" | "birthday", value: string | undefined) => {
      setEditedData((prev) => ({
        ...prev,
        client: {
          ...(prev.client ?? renewal?.client ?? {}),
          [field]: value,
        },
      }));
    },
    [renewal]
  );

  const handlePremiumChange = useCallback((rawValue: string) => {
    const premium = parseBRLToNumber(rawValue);
    setEditedData((prev) => ({ ...prev, premium }));
  }, []);

  if (!renewal) return null;

  const clientPolicies = allPolicies.filter((p) => p.clientId === renewal.clientId);
  const showAllPolicies = clientPolicies.length > 1 && !renewal.id.startsWith("dummy-");

  return (
    <Dialog open={!!renewal} onOpenChange={(open) => !open && requestClose()}>
      <DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg sm:text-xl lg:text-2xl truncate">
                {isEditing ? "Editar Apólice" : "Detalhes da Renovação"}
              </DialogTitle>
            </div>
            <button
              onClick={requestClose}
              className="rounded-lg p-1.5 sm:p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
              aria-label="Fechar"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
          {!renewal.id.startsWith("dummy-") && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit} className="text-xs sm:text-sm shrink-0">
                  <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Editar</span>
                  <span className="sm:hidden">Editar</span>
                </Button>
              ) : (
                <div className="flex gap-1 sm:gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm shrink-0">
                    <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
                    <span className="sm:hidden">{isSaving ? "..." : "Salvar"}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs sm:text-sm shrink-0">
                    Cancelar
                  </Button>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="text-xs sm:text-sm shrink-0">
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">{isDeleting ? "Deletando..." : "Deletar"}</span>
                <span className="sm:hidden">{isDeleting ? "..." : "Del"}</span>
              </Button>
            </div>
          )}
        </div>
      </DialogHeader>
      <DialogContent className="space-y-6">
        {/* Client Info Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          <CardHeader className="pb-3 sm:pb-4 relative">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="text-sm sm:text-base lg:text-lg">Informações do Cliente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 relative">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Nome</span>
                </div>
                {isEditing ? (
                  <Input
                    value={editedData.client?.name ?? renewal.client.name}
                    onChange={(e) => handleClientChange("name", e.target.value)}
                    placeholder="Nome"
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-sm sm:text-base break-words">{renewal.client.name}</p>
                )}
              </div>
              <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Telefone</span>
                </div>
                {isEditing ? (
                  <Input
                    value={editedData.client?.phone ?? renewal.client.phone ?? ""}
                    onChange={(e) => handleClientChange("phone", e.target.value)}
                    placeholder="Telefone"
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-sm sm:text-base break-words">{renewal.client.phone || "-"}</p>
                )}
              </div>
              <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Email</span>
                </div>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editedData.client?.email ?? renewal.client.email ?? ""}
                    onChange={(e) => handleClientChange("email", e.target.value)}
                    placeholder="Email"
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-sm sm:text-base break-all">{renewal.client.email || "-"}</p>
                )}
              </div>
              <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <CalendarLucide className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Data de Nascimento</span>
                </div>
                {isEditing ? (
                  <Input
                    type="date"
                    value={
                      editedData.client?.birthday
                        ? typeof editedData.client.birthday === "string"
                          ? editedData.client.birthday.split("T")[0]
                          : new Date(editedData.client.birthday).toISOString().split("T")[0]
                        : renewal.client.birthday
                        ? typeof renewal.client.birthday === "string"
                          ? renewal.client.birthday.split("T")[0]
                          : new Date(renewal.client.birthday).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => handleClientChange("birthday", e.target.value ? new Date(e.target.value) : undefined)}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-sm sm:text-base">{renewal.client.birthday ? formatDate(renewal.client.birthday) : "-"}</p>
                )}
              </div>
            </div>
            {(renewal.client.phone || editedData.client?.phone) && (
              <Button
                className="w-full mt-3 sm:mt-4 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl text-sm sm:text-base"
                onClick={() => {
                  const phone = renewal.client.phone?.replace(/\D/g, "");
                  if (phone) {
                    window.open(`https://wa.me/55${phone}`, "_blank");
                  }
                }}
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Policy Info Card */}
        {!renewal.id.startsWith("dummy-") && (
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
            <CardHeader className="pb-3 sm:pb-4 relative">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-2.5">
                <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-sm sm:text-base lg:text-lg">Informações da Apólice</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 relative">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarLucide className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Status</span>
                  </div>
                  {isEditing ? (
                    <Select
                      value={editedData.status ?? (renewal.status === "active" ? "active" : "inactive")}
                      onChange={(e) => handleInputChange("status", e.target.value as "active" | "inactive")}
                      className="font-semibold w-full"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </Select>
                  ) : (
                    <p className="font-semibold text-base">
                      {renewal.status === "active" ? "Ativo" : "Inativo"}
                    </p>
                  )}
                </div>
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-950/30 to-green-950/20 border border-green-900/50 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Prêmio Total</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatBRLForInput(editedData.premium ?? renewal.premium ?? 0)}
                      onChange={(e) => handlePremiumChange(e.target.value)}
                      placeholder="R$ 0,00"
                      className="font-bold text-base sm:text-lg text-green-400"
                    />
                  ) : (
                    <p className="font-bold text-base sm:text-lg text-green-400">
                      {(renewal.premium ?? 0) > 0
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(renewal.premium!)
                        : "-"}
                    </p>
                  )}
                </div>
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Car className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Placa</span>
                  </div>
                  {isEditing ? (
                    <Input
                      value={editedPlate}
                      onChange={(e) => setEditedPlate(e.target.value.toUpperCase())}
                      placeholder="ABC1234"
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-sm sm:text-base break-words">
                      {parseNotesFromPolicy(renewal.notes).plate || "-"}
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Info - recalculates when editing and premium changes */}
              {(() => {
                const prem = isEditing ? (editedData.premium ?? renewal.premium) : renewal.premium;
                const hasFinancial = prem && prem > 0;
                if (!hasFinancial) return null;
                const { iof, netPremium, commission10, commission15 } = calculateFromPremium(prem);
                const items = [
                  { label: "IOF", value: formatCurrency(iof) },
                  { label: "Prêmio Líquido", value: formatCurrency(netPremium) },
                  { label: "Comissão 10%", value: formatCurrency(commission10) },
                  { label: "Comissão 15%", value: formatCurrency(commission15) },
                ];
                return (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-bold mb-3 sm:mb-4">
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <span>Informações Financeiras{isEditing && prem ? " (recalculado)" : ""}</span>
                    </div>
                    <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
                      {items.map((item) => (
                        <div
                          key={item.label}
                          className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5"
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wider">
                            {item.label}
                          </p>
                          <p className="text-sm sm:text-base font-bold text-foreground break-words">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Other Notes */}
              {renewal.notes && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-2">
                    <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Observações</span>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2.5 sm:p-3">
                    <p className="text-xs sm:text-sm break-words">{renewal.notes}</p>
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
            <CardHeader className="pb-3 sm:pb-4 relative">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-2.5">
                <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
                <span className="text-sm sm:text-base lg:text-lg">Todas as Apólices ({clientPolicies.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2 sm:space-y-3">
                {clientPolicies.map((policy) => {
                  const isSelected = policy.id === renewal.id;
                  return (
                    <div
                      key={policy.id}
                      onClick={() => onSelectPolicy(policy.id)}
                      className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                        {isSelected && <span className="text-xs text-primary font-semibold">(Selecionada)</span>}
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
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

      {/* Close confirmation when has unsaved changes */}
      <Dialog open={showCloseConfirm} onOpenChange={(open) => !open && setShowCloseConfirm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterações não salvas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Você tem alterações não salvas. O que deseja fazer?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleCloseWithoutSaving}>
              Fechar sem salvar
            </Button>
            <Button onClick={handleCloseAndSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Fechar e salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
