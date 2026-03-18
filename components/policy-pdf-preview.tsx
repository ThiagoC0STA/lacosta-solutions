"use client";

import { useState } from "react";
import { FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PolicyDocument } from "@/types";
import { cn } from "@/lib/utils";

interface PolicyPdfPreviewProps {
  documents: PolicyDocument[];
  className?: string;
}

export function PolicyPdfPreview({ documents, className }: PolicyPdfPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (documents.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 p-8 text-center min-h-[75vh]",
          className
        )}
      >
        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum PDF anexado</p>
      </div>
    );
  }

  const current = documents[selectedIndex];

  return (
    <div className={cn("flex flex-col gap-3 min-h-0", className)}>
      {/* PDF switcher + download */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={selectedIndex <= 0}
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium truncate px-2">
            {current?.name ?? `PDF ${selectedIndex + 1}`}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={selectedIndex >= documents.length - 1}
            onClick={() => setSelectedIndex((i) => Math.min(documents.length - 1, i + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => window.open(current.fileUrl, "_blank", "noopener")}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Baixar
        </Button>
      </div>

      {/* PDF iframe preview */}
      <div className="flex-1 min-h-[75vh] rounded-lg border border-border/50 overflow-hidden bg-muted/20">
        <iframe
          src={`${current.fileUrl}#toolbar=1`}
          title={current.name}
          className="w-full h-full min-h-[75vh]"
        />
      </div>

      {/* Document list pills */}
      {documents.length > 1 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {documents.map((doc, i) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium truncate max-w-[120px] transition-colors",
                i === selectedIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground"
              )}
              title={doc.name}
            >
              {doc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
