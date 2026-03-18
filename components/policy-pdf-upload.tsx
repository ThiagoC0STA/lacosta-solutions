"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPolicyPdf } from "@/lib/supabase/storage";
import type { PolicyDocument } from "@/types";
import { cn } from "@/lib/utils";

interface PolicyPdfUploadProps {
  policyId: string;
  documents: PolicyDocument[];
  onUpload: (fileUrl: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isCreating?: boolean;
  isDeleting?: boolean;
  disabled?: boolean;
  className?: string;
}

const PDF_ACCEPT = "application/pdf,.pdf";

export function PolicyPdfUpload({
  policyId,
  documents,
  onUpload,
  onDelete,
  isCreating,
  isDeleting,
  disabled,
  className,
}: PolicyPdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const id = file.name + Date.now();
    setUploadingId(id);
    try {
      const url = await uploadPolicyPdf(policyId, file);
      await onUpload(url, file.name);
    } catch (err) {
      alert(`Erro ao enviar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setUploadingId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: PolicyDocument) => {
    if (!confirm(`Remover "${doc.name}"?`)) return;
    setDeletingId(doc.id);
    try {
      await onDelete(doc.id);
    } catch (err) {
      alert(`Erro ao remover: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={PDF_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploadingId || isCreating ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1.5" />
          )}
          {uploadingId || isCreating ? "Enviando..." : "Enviar PDF"}
        </Button>
      </div>
      {documents.length > 0 && (
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-muted/40 border border-border/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{doc.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                disabled={disabled}
                onClick={() => handleDelete(doc)}
              >
                {deletingId === doc.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
