"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Plus,
} from "lucide-react";
import { ClientCreateModal } from "@/components/client-create-modal";
import { ProductCreateModal } from "@/components/product-create-modal";
import { InsurerCreateModal } from "@/components/insurer-create-modal";
import { UnsavedChangesModal } from "@/components/unsaved-changes-modal";
import type { Client, Product, Insurer, RenewalWithClient } from "@/types";
import { productDisplay } from "@/types";
import { getProductDisplay } from "@/lib/product-helpers";
import { getInsurerDisplay, insurerMatchesPolicy } from "@/lib/insurer-helpers";
import { formatDate } from "@/lib/date-helpers";

export const DUMMY_NEW_RENEWAL_ID = "dummy-new";

import {
  calculateFromPremium,
  parseNotesFromPolicy,
  buildNotesWithCommission,
  formatCurrency,
  parseBRLToNumber,
  formatBRLForInput,
} from "@/lib/insurance-calculations";
import { formatPhoneBR, formatCPFCNPJ } from "@/lib/masks";

interface RenewalDetailModalProps {
  renewal: RenewalWithClient | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Omit<RenewalWithClient, "id" | "client">>) => Promise<RenewalWithClient>;
  onUpdateClient?: (id: string, data: Partial<{ name: string; phone?: string; email?: string; birthday?: Date | string }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate?: (data: Omit<RenewalWithClient, "id" | "client"> & { clientId: string }) => Promise<RenewalWithClient>;
  clients?: Array<{ id: string; name: string; phone?: string; email?: string; birthday?: Date | string }>;
  allPolicies?: Array<{ id: string; clientId: string; dueDate: Date | string; [key: string]: any }>;
  onSelectPolicy?: (policyId: string) => void;
  onCreateClient?: (data: Omit<Client, "id">) => Promise<Client>;
  products?: Product[];
  onCreateProduct?: (data: Omit<Product, "id">) => Promise<Product>;
  insurers?: Insurer[];
  onCreateInsurer?: (data: Omit<Insurer, "id">) => Promise<Insurer>;
}

export function RenewalDetailModal({
  renewal,
  onClose,
  onUpdate,
  onDelete,
  onUpdateClient,
  onCreate,
  clients = [],
  allPolicies = [],
  onSelectPolicy,
  onCreateClient,
  products = [],
  onCreateProduct,
  insurers = [],
  onCreateInsurer,
}: RenewalDetailModalProps) {
  const isCreateMode = renewal?.id === DUMMY_NEW_RENEWAL_ID;
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [editedData, setEditedData] = useState<Partial<RenewalWithClient>>({});
  const [editedClientId, setEditedClientId] = useState<string>("");
  const [editedPlate, setEditedPlate] = useState<string>("");
  const [editedCommissionRate, setEditedCommissionRate] = useState<number>(15);
  const [isSaving, setIsSaving] = useState(false);

  const prevRenewalIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentId = renewal?.id;
    const prevId = prevRenewalIdRef.current;
    prevRenewalIdRef.current = currentId;
    if (currentId === DUMMY_NEW_RENEWAL_ID && prevId !== DUMMY_NEW_RENEWAL_ID) {
      setEditedData({ status: "active" });
      setEditedClientId("");
      setEditedPlate("");
      setEditedCommissionRate(15);
    }
  }, [renewal?.id]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showClientCreateModal, setShowClientCreateModal] = useState(false);
  const [showProductCreateModal, setShowProductCreateModal] = useState(false);
  const [showInsurerCreateModal, setShowInsurerCreateModal] = useState(false);

  const hasUnsavedChanges = useCallback(() => {
    if (!renewal || !isEditing) return false;
    if (isCreateMode) {
      const hasClient = !!editedClientId;
      const hasPolicy = !!(
        (editedData.policyNumber ?? "") ||
        (editedData.insurer ?? "") ||
        (editedData.product ?? "") ||
        editedData.dueDate ||
        (editedData.premium ?? 0) ||
        editedPlate ||
        editedCommissionRate !== 15
      );
      return hasClient || hasPolicy;
    }
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
    const commissionRateChanged =
      editedCommissionRate !== (parseNotesFromPolicy(renewal.notes).commissionRate ?? 15);
    return clientChanged || policyChanged || plateChanged || commissionRateChanged;
  }, [renewal, isEditing, isCreateMode, editedData, editedPlate, editedCommissionRate, editedClientId]);

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
      setEditedCommissionRate(parsed.commissionRate ?? 15);
    }
  }, [renewal]);

  const handleCancel = useCallback(() => {
    if (isCreateMode) {
      onClose();
      return;
    }
    setIsEditing(false);
    setEditedData({});
    setEditedPlate("");
    setEditedCommissionRate(15);
    setEditedClientId("");
  }, [isCreateMode, onClose]);

  const handleSave = useCallback(async () => {
    if (!renewal) return;
    setIsSaving(true);
    try {
      if (isCreateMode && onCreate) {
        const clientId = editedClientId || renewal.clientId;
        if (!clientId) {
          alert("Selecione um cliente.");
          setIsSaving(false);
          return;
        }
        const dueDate = editedData.dueDate ?? renewal.dueDate;
        if (!dueDate) {
          alert("Data de vencimento é obrigatória.");
          setIsSaving(false);
          return;
        }
        const premium = editedData.premium ?? renewal.premium ?? 0;
        const notes =
          premium > 0
            ? buildNotesWithCommission(premium, editedPlate.trim() || undefined, undefined, editedCommissionRate)
            : undefined;
        const status = editedData.status === "active" ? "active" : "inactive";
        await onCreate({
          clientId,
          policyNumber: editedData.policyNumber,
          insurer: editedData.insurer,
          product: editedData.product,
          dueDate,
          premium: editedData.premium ?? renewal.premium,
          status,
          notes,
        });
        setEditedData({});
        setEditedPlate("");
        setEditedCommissionRate(15);
        setEditedClientId("");
        onClose();
      } else {
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
          notes = buildNotesWithCommission(premium, editedPlate.trim() || undefined, undefined, editedCommissionRate);
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
        setEditedCommissionRate(15);
      }
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  }, [renewal, isCreateMode, editedData, editedPlate, editedCommissionRate, editedClientId, onUpdate, onUpdateClient, onCreate, onClose]);

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
    (field: "name" | "phone" | "email" | "birthday", value: string | Date | undefined) => {
      setEditedData((prev) => {
        const baseClient = prev.client ?? renewal?.client ?? {};
        return {
          ...prev,
          client: {
            ...baseClient,
            [field]: value,
          },
        } as Partial<RenewalWithClient>;
      });
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
                {isCreateMode ? "Nova Apólice" : isEditing ? "Editar Apólice" : "Detalhes da Renovação"}
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
            {isCreateMode ? (
              <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Cliente *</span>
                  </div>
                  {onCreateClient && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClientCreateModal(true)}
                      className="shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                      Novo Cliente
                    </Button>
                  )}
                </div>
                <Select
                  value={editedClientId}
                  onChange={(e) => setEditedClientId(e.target.value)}
                  className="font-semibold w-full"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
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
                      value={formatPhoneBR(editedData.client?.phone ?? renewal.client?.phone ?? "")}
                      onChange={(e) => handleClientChange("phone", formatPhoneBR(e.target.value))}
                      placeholder="(00) 00000-0000"
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
                    onChange={(e) => handleClientChange("birthday", e.target.value || undefined)}
                    className="font-semibold"
                  />
                ) : (
                  <p className="font-semibold text-sm sm:text-base">{renewal.client.birthday ? formatDate(renewal.client.birthday) : "-"}</p>
                )}
              </div>
            </div>
            )}
            {(() => {
              const phoneToUse = isCreateMode
                ? clients.find((c) => c.id === editedClientId)?.phone
                : (renewal.client?.phone || editedData.client?.phone);
              return phoneToUse ? (
                <Button
                  className="w-full mt-3 sm:mt-4 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl text-sm sm:text-base"
                  onClick={() => {
                    const phone = phoneToUse.replace(/\D/g, "");
                    if (phone) {
                      window.open(`https://wa.me/55${phone}`, "_blank");
                    }
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Policy Info Card */}
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
                    <span>CPF/CNPJ</span>
                  </div>
                  {(isEditing || isCreateMode) ? (
                    <Input
                      value={formatCPFCNPJ(editedData.policyNumber ?? renewal.policyNumber ?? "")}
                      onChange={(e) => handleInputChange("policyNumber", formatCPFCNPJ(e.target.value))}
                      placeholder="CPF ou CNPJ"
                      className="font-semibold"
                    />
                  ) : (
                    <p className="font-semibold text-base">{renewal.policyNumber || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>Seguradora</span>
                    </div>
                    {insurers && insurers.length > 0 && onCreateInsurer && (isEditing || isCreateMode) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInsurerCreateModal(true)}
                        className="shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        Nova Asseguradora
                      </Button>
                    )}
                  </div>
                  {(isEditing || isCreateMode) ? (
                    insurers && insurers.length > 0 ? (
                      <Select
                        value={(() => {
                          const v = (editedData.insurer ?? renewal.insurer ?? "").trim();
                          if (!v) return "";
                          const match = insurers.find((i) => insurerMatchesPolicy(i.name, v));
                          return match ? match.name : v;
                        })()}
                        onChange={(e) => handleInputChange("insurer", e.target.value)}
                        className="font-semibold w-full"
                      >
                        <option value="">Selecione uma asseguradora</option>
                        {insurers.map((i) => (
                          <option key={i.id} value={i.name}>
                            {i.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={editedData.insurer || ""}
                        onChange={(e) => handleInputChange("insurer", e.target.value)}
                        placeholder="Seguradora"
                        className="font-semibold"
                      />
                    )
                  ) : (
                    <p className="font-semibold text-base">{getInsurerDisplay(renewal.insurer, insurers) || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>Produto</span>
                    </div>
                    {products && products.length > 0 && onCreateProduct && (isEditing || isCreateMode) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProductCreateModal(true)}
                        className="shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                        Novo Produto
                      </Button>
                    )}
                  </div>
                  {(isEditing || isCreateMode) ? (
                    products && products.length > 0 ? (
                      <Select
                        value={editedData.product ?? renewal.product ?? ""}
                        onChange={(e) => handleInputChange("product", e.target.value)}
                        className="font-semibold w-full"
                      >
                        <option value="">Selecione um produto</option>
                        {products.map((p) => (
                          <option key={p.id} value={productDisplay(p)}>
                            {productDisplay(p)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={editedData.product || ""}
                        onChange={(e) => handleInputChange("product", e.target.value)}
                        placeholder="Produto"
                        className="font-semibold"
                      />
                    )
                  ) : (
                    <p className="font-semibold text-base">{getProductDisplay(renewal.product, products) || "-"}</p>
                  )}
                </div>
                <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <CalendarLucide className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Vencimento</span>
                  </div>
                  {(isEditing || isCreateMode) ? (
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
                  {(isEditing || isCreateMode) ? (
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
                  {(isEditing || isCreateMode) ? (
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
                  {(isEditing || isCreateMode) ? (
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

              {/* Financial Info - recalculates when editing; commission rate editable when editing */}
              {(() => {
                const prem = (isEditing || isCreateMode) ? (editedData.premium ?? renewal.premium) : renewal.premium;
                const hasFinancial = prem && prem > 0;
                if (!hasFinancial) return null;
                const parsed = parseNotesFromPolicy(renewal.notes);
                const rate = (isEditing || isCreateMode) ? editedCommissionRate : (parsed.commissionRate ?? 15);
                const { iof, netPremium, commission } = calculateFromPremium(prem, rate);
                return (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-bold mb-3 sm:mb-4">
                      <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                        <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <span>Informações Financeiras{(isEditing || isCreateMode) && prem ? " (recalculado)" : ""}</span>
                    </div>
                    <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
                      <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wider">IOF</p>
                        <p className="text-sm sm:text-base font-bold text-foreground break-words">{formatCurrency(iof)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wider">Prêmio Líquido</p>
                        <p className="text-sm sm:text-base font-bold text-foreground break-words">{formatCurrency(netPremium)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wider">Comissão %</p>
                        {(isEditing || isCreateMode) ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={editedCommissionRate}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= 100) setEditedCommissionRate(val);
                            }}
                            className="h-8 w-20 text-sm font-bold bg-background"
                          />
                        ) : (
                          <p className="text-sm sm:text-base font-bold text-foreground break-words">{rate}%</p>
                        )}
                      </div>
                      <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2 uppercase tracking-wider">Comissão R$</p>
                        <p className="text-sm sm:text-base font-bold text-foreground break-words">{formatCurrency(commission)}</p>
                      </div>
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

      {(isCreateMode || !renewal.id.startsWith("dummy-")) && (
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-t border-border/50 bg-muted/5 flex items-center justify-end gap-2 flex-wrap shrink-0">
          {isCreateMode ? (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm shrink-0">
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">{isSaving ? "Criando..." : "Criar"}</span>
                <span className="sm:hidden">{isSaving ? "..." : "Criar"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs sm:text-sm shrink-0">
                Cancelar
              </Button>
            </>
          ) : !isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEdit} className="text-xs sm:text-sm shrink-0">
              <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="text-xs sm:text-sm shrink-0">
                <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
                <span className="sm:hidden">{isSaving ? "..." : "Salvar"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel} className="text-xs sm:text-sm shrink-0">
                Cancelar
              </Button>
            </>
          )}
          {!isCreateMode && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="text-xs sm:text-sm shrink-0">
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">{isDeleting ? "Deletando..." : "Deletar"}</span>
              <span className="sm:hidden">{isDeleting ? "..." : "Del"}</span>
            </Button>
          )}
        </div>
      )}

      <UnsavedChangesModal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onSaveAndClose={handleCloseAndSave}
        onDiscard={handleCloseWithoutSaving}
        isSaving={isSaving}
      />

      {onCreateClient && (
        <ClientCreateModal
          open={showClientCreateModal}
          onClose={() => setShowClientCreateModal(false)}
          onCreateClient={onCreateClient}
          onCreated={(client) => {
            setEditedClientId(client.id);
            setShowClientCreateModal(false);
          }}
        />
      )}

      {onCreateProduct && (
        <ProductCreateModal
          open={showProductCreateModal}
          onClose={() => setShowProductCreateModal(false)}
          onCreateProduct={onCreateProduct}
          onCreated={(product) => {
            handleInputChange("product", productDisplay(product));
            setShowProductCreateModal(false);
          }}
        />
      )}

      {onCreateInsurer && (
        <InsurerCreateModal
          open={showInsurerCreateModal}
          onClose={() => setShowInsurerCreateModal(false)}
          onCreateInsurer={onCreateInsurer}
          onCreated={(insurer) => {
            handleInputChange("insurer", insurer.name);
            setShowInsurerCreateModal(false);
          }}
        />
      )}
    </Dialog>
  );
}
