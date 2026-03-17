"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { clearAllWithBackup } from "@/lib/supabase/backup-queries";
import { AlertModal } from "@/components/ui/alert-modal";
import type { Client, Policy } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

interface DangerZoneCardProps {
  clients: Client[];
  policies: Policy[];
}

export function DangerZoneCard({ clients, policies }: DangerZoneCardProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; message: string; variant: "success" | "error" }>({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });

  const showAlert = (title: string, message: string, variant: "success" | "error" = "success") => {
    setAlertModal({ open: true, title, message, variant });
  };

  const handleClearAllData = async () => {
    if (confirmText !== "DELETAR TUDO") {
      showAlert("Atenção", 'Digite "DELETAR TUDO" para confirmar', "error");
      return;
    }

    setIsDeleting(true);
    try {
      await clearAllWithBackup(clients, policies);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      showAlert("Sucesso", "Backup criado e todos os dados foram deletados com sucesso!", "success");
      setShowConfirm(false);
      setConfirmText("");
    } catch (error) {
      console.error("Error deleting data:", error);
      showAlert("Erro", `Erro ao deletar dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-red-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis que podem causar perda de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 sm:p-4 bg-red-950/20 border border-red-900 rounded-lg">
          <h3 className="text-sm sm:text-base font-semibold text-red-100 mb-2">
            Limpar Todos os Dados
          </h3>
          <p className="text-xs sm:text-sm text-red-200 mb-3 sm:mb-4">
            Um backup será criado automaticamente antes de deletar. Depois você pode restaurar ou apagar o backup na seção abaixo.
          </p>

          {!showConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Todos os Dados
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-red-100">
                  Digite &quot;DELETAR TUDO&quot; para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-red-800 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETAR TUDO"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleClearAllData}
                  disabled={isDeleting || confirmText !== "DELETAR TUDO"}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deletando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Confirmar e Deletar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                  }}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal((p) => ({ ...p, open }))}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />
    </Card>
  );
}
