"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Archive } from "lucide-react";
import type { Backup } from "@/lib/supabase/backup-queries";

interface BackupsListCardProps {
  backups: Backup[];
  onRestore: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

function formatBackupDate(isoString: string) {
  try {
    return new Date(isoString).toLocaleString("pt-BR");
  } catch {
    return isoString;
  }
}

export function BackupsListCard({
  backups,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
}: BackupsListCardProps) {
  if (backups.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Backups
        </CardTitle>
        <CardDescription>
          Backups criados antes de limpar os dados. Restaure ou apague quando quiser.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {backups.map((backup) => (
            <li
              key={backup.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{backup.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBackupDate(backup.created_at)} · {backup.clients_count} clientes · {backup.policies_count} apólices
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(backup.id)}
                  disabled={isRestoring || isDeleting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(backup.id)}
                  disabled={isRestoring || isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar backup
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
