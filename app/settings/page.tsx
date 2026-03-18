"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients, usePolicies, useBackups } from "@/hooks/use-supabase-data";
import { Database, Download, FileSpreadsheet, Archive } from "lucide-react";
import { exportClientsToExcel, exportPoliciesToExcel, exportDashboardToExcel } from "@/lib/export-helpers";
import { computeDashboardStats } from "@/lib/dashboard-helpers";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { BackupsListCard } from "@/components/settings/backups-list-card";
import { AlertModal } from "@/components/ui/alert-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function SettingsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const {
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    isCreating,
    isRestoring,
    isDeleting,
  } = useBackups();

  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" }>({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ open: boolean; backupId: string | null }>({
    open: false,
    backupId: null,
  });

  const showAlert = (title: string, message: string, variant: "success" | "error" = "success") => {
    setAlertModal({ open: true, title, message, variant });
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreBackup(id);
      showAlert("Sucesso", "Dados restaurados com sucesso!", "success");
    } catch (error) {
      showAlert("Erro", `Erro ao restaurar: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "error");
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup({ clients, policies });
      showAlert("Sucesso", "Backup criado com sucesso!", "success");
    } catch (error) {
      showAlert("Erro", `Erro ao criar backup: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "error");
    }
  };

  const handleDeleteBackupClick = async (id: string) => {
    setConfirmDeleteModal({ open: true, backupId: id });
  };

  const handleConfirmDeleteBackup = async () => {
    const id = confirmDeleteModal.backupId;
    if (!id) return;
    try {
      await deleteBackup(id);
      setConfirmDeleteModal({ open: false, backupId: null });
      showAlert("Sucesso", "Backup apagado com sucesso!", "success");
    } catch (error) {
      showAlert("Erro", `Erro ao apagar backup: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "error");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-2">
            Configurações
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Estatísticas do Banco de Dados
            </CardTitle>
            <CardDescription>
              Informações sobre os dados armazenados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-xl sm:text-2xl font-semibold">{clients.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Apólices</p>
                <p className="text-xl sm:text-2xl font-semibold">{policies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Fazer Backup
            </CardTitle>
            <CardDescription>
              Crie um backup manual dos dados atuais. O backup ficará salvo e poderá ser restaurado depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || clients.length === 0}
            >
              <Archive className="h-4 w-4 mr-2" />
              {isCreating ? "Criando..." : "Fazer Backup Agora"}
            </Button>
          </CardContent>
        </Card>

        {/* Backups - shown before danger zone when backups exist */}
        <BackupsListCard
          backups={backups}
          onRestore={handleRestore}
          onDelete={handleDeleteBackupClick}
          isRestoring={isRestoring}
          isDeleting={isDeleting}
        />

        {/* Danger Zone */}
        <DangerZoneCard clients={clients} policies={policies} />

        {/* Other Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Outras Configurações</CardTitle>
            <CardDescription>
              Configurações gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span>Exportar Clientes</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Exportar todos os clientes para Excel
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportClientsToExcel(clients, policies)}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span>Exportar Renovações</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Exportar todas as apólices para Excel
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportPoliciesToExcel(policies, clients)}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span>Exportar Dashboard Completo</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Exportar estatísticas, clientes e apólices
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const stats = computeDashboardStats(policies, clients);
                      exportDashboardToExcel(clients, policies, stats);
                    }}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>

      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal((p) => ({ ...p, open }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      <ConfirmModal
        open={confirmDeleteModal.open}
        onOpenChange={(open) => setConfirmDeleteModal((p) => ({ ...p, open, backupId: open ? p.backupId : null }))}
        title="Apagar backup"
        message="Apagar este backup? Esta ação não pode ser desfeita."
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDeleteBackup}
      />
    </AppLayout>
  );
}

