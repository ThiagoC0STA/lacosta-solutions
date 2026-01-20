"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-in fade-in-0 h-full w-full"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 transform px-4 animate-in fade-in-0 zoom-in-95 duration-200">
        <div 
          className="relative bg-background rounded-2xl shadow-[0_20px_25px_-5px_rgb(0_0_0_/_0.1),0_10px_10px_-5px_rgb(0_0_0_/_0.04)] border border-border/50 p-0 max-h-[90vh] overflow-hidden flex flex-col before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-transparent before:pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative px-8 pt-8 pb-6 border-b border-border/50 bg-gradient-to-b from-background via-background to-muted/10 overflow-hidden", className)}>
      {/* Decorative element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text", className)}>
      {children}
    </h2>
  );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-8 py-6 overflow-y-auto flex-1", className)}>
      {children}
    </div>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  );
}

