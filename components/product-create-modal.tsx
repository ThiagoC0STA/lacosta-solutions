"use client";

import { useState, useCallback } from "react";
import { DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, X, Save } from "lucide-react";
import type { Product } from "@/types";

interface ProductCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreateProduct: (data: { code: number; name: string }) => Promise<Product>;
  onCreated: (product: Product) => void;
}

export function ProductCreateModal({
  open,
  onClose,
  onCreateProduct,
  onCreated,
}: ProductCreateModalProps) {
  const [code, setCode] = useState<string>("0");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = useCallback(() => {
    setCode("0");
    setName("");
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    const codeNum = parseInt(code, 10);
    if (isNaN(codeNum) || codeNum < 0) {
      alert("Código deve ser um número válido (0 ou maior)");
      return;
    }
    if (!name?.trim()) {
      alert("Nome é obrigatório");
      return;
    }
    setIsSaving(true);
    try {
      const created = await onCreateProduct({ code: codeNum, name: name.trim() });
      onCreated(created);
      handleClose();
    } catch (error) {
      alert(`Erro ao criar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  }, [code, name, onCreateProduct, onCreated, handleClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-in fade-in-0 h-full w-full"
        onClick={handleClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-[95vw] sm:max-w-2xl -translate-x-1/2 -translate-y-1/2 transform px-2 sm:px-4 animate-in fade-in-0 zoom-in-95 duration-200">
        <div
          className="relative bg-background rounded-xl sm:rounded-2xl shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.1),0_10px_10px_-5px_rgb(0_0_0_/_0.04)] border border-border/50 p-0 max-h-[95vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl lg:text-2xl truncate">Novo Produto</DialogTitle>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1.5 sm:p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted shrink-0"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCreate} disabled={isSaving}>
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  {isSaving ? "Criando..." : "Criar"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleClose}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogHeader>
          <DialogContent className="space-y-6">
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 sm:gap-2.5">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <span className="text-sm sm:text-base lg:text-lg">Informações do Produto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>Código</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="0"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>Nome *</span>
                    </div>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: AUTOMÓVEL"
                      className="font-semibold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </div>
      </div>
    </div>
  );
}
