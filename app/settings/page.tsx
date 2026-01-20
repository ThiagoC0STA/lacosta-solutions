"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import { deleteAllClients, deleteAllPolicies } from "@/lib/supabase/queries";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, Database, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleClearAllData = async () => {
    if (confirmText !== "DELETAR TUDO") {
      alert('Digite "DELETAR TUDO" para confirmar');
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all policies first (they have foreign key to clients)
      await deleteAllPolicies();
      // Then delete all clients
      await deleteAllClients();
      
      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      
      alert("Todos os dados foram deletados com sucesso!");
      setShowConfirm(false);
      setConfirmText("");
    } catch (error) {
      console.error("Error deleting data:", error);
      alert(`Erro ao deletar dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight mb-2">
            Configurações
          </h1>
          <p className="text-muted-foreground text-lg">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-semibold">{clients.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total de Apólices</p>
                <p className="text-2xl font-semibold">{policies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que podem causar perda de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Limpar Todos os Dados
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                Esta ação irá deletar permanentemente todos os clientes e apólices do sistema.
                Esta ação não pode ser desfeita.
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
                    <label className="text-sm font-medium text-red-900 dark:text-red-100">
                      Digite "DELETAR TUDO" para confirmar:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 dark:border-red-800 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
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
        </Card>

        {/* Other Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Outras Configurações</CardTitle>
            <CardDescription>
              Configurações gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Tema</h3>
                  <p className="text-sm text-muted-foreground">
                    Alterar entre tema claro e escuro
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configurar
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Exportar Dados</h3>
                  <p className="text-sm text-muted-foreground">
                    Exportar todos os dados para Excel
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Exportar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

