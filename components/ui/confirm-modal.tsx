"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {variant === "destructive" && (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          )}
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="flex flex-col">
        <p className="text-muted-foreground flex-1">{message}</p>
        <div className="mt-6 pt-4 border-t border-border/50 flex justify-end gap-2 bg-muted/5 -mx-4 -mb-4 px-4 pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
