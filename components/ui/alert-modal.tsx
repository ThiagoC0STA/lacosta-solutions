"use client";

import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "success" | "error";

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: AlertVariant;
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-green-500",
    titleClass: "text-green-600 dark:text-green-400",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-500",
    titleClass: "text-red-600 dark:text-red-400",
  },
};

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  variant = "success",
}: AlertModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className={cn("flex items-center gap-2", config.titleClass)}>
          <Icon className={cn("h-5 w-5 shrink-0", config.iconClass)} />
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="flex flex-col">
        <p className="text-muted-foreground flex-1">{message}</p>
        <div className="mt-6 pt-4 border-t border-border/50 flex justify-end bg-muted/5 -mx-4 -mb-4 px-4 pb-4">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
