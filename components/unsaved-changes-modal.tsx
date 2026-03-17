"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Save } from "lucide-react";

interface UnsavedChangesModalProps {
  open: boolean;
  onClose: () => void;
  onSaveAndClose: () => void | Promise<void>;
  onDiscard: () => void;
  isSaving: boolean;
}

export function UnsavedChangesModal({
  open,
  onClose,
  onSaveAndClose,
  onDiscard,
  isSaving,
}: UnsavedChangesModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-[min(400px,95vw)] !w-[min(400px,95vw)] !min-w-[280px] !p-6 flex flex-col gap-6 self-center">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-500/30">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl sm:text-2xl text-foreground">Alterações não salvas</h3>
            <p className="text-lg sm:text-xl text-muted-foreground mt-1.5">Deseja salvar antes de fechar?</p>
          </div>
        </div>
        <div className="flex flex-row justify-end gap-3 pt-4 border-t border-border/50 w-full">
          <Button variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="outline" onClick={onDiscard}>
            Descartar
          </Button>
          <Button onClick={onSaveAndClose} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar e fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
