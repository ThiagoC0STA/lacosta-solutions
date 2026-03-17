"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useInsurers, usePolicies } from "@/hooks/use-supabase-data";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Save,
  Trash2,
  X,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { Insurer } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { exportInsurersToExcel } from "@/lib/export-helpers";
import { insurerMatchesPolicy } from "@/lib/insurer-helpers";

type InsurerWithStats = Insurer & { policyCount: number };

export default function InsurersPage() {
  const { insurers, createInsurer, updateInsurer, deleteInsurer, isLoading } = useInsurers();
  const { policies } = usePolicies();
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedInsurer, setSelectedInsurer] = useState<Insurer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const hasAutoExtractedRef = useRef(false);

  // Auto-extract insurers from policies when table is empty but policies have insurer data
  useEffect(() => {
    if (isLoading || isExtracting || hasAutoExtractedRef.current) return;
    if (insurers.length > 0) return;
    const hasPoliciesWithInsurer = policies.some((p) => (p.insurer || "").trim());
    if (!hasPoliciesWithInsurer) return;

    hasAutoExtractedRef.current = true;
    const run = async () => {
      const seen = new Map<string, string>();
      for (const p of policies) {
        const raw = (p.insurer || "").trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (!seen.has(key)) seen.set(key, raw);
      }
      const toCreate = Array.from(seen.values());
      if (toCreate.length === 0) return;

      setIsExtracting(true);
      try {
        for (const name of toCreate) {
          try {
            await createInsurer({ name: name.trim() });
          } catch {
            // Skip duplicates
          }
        }
      } finally {
        setIsExtracting(false);
      }
    };
    run();
  }, [isLoading, isExtracting, insurers.length, policies, createInsurer]);

  const policyCountByName = useMemo(() => {
    const map: Record<string, number> = {};
    for (const insurer of insurers) {
      const count = policies.filter((p) =>
        insurerMatchesPolicy(insurer.name, p.insurer)
      ).length;
      map[insurer.name] = count;
    }
    return map;
  }, [insurers, policies]);

  const insurersWithStats: InsurerWithStats[] = useMemo(
    () =>
      insurers.map((i) => ({
        ...i,
        policyCount: policyCountByName[i.name] ?? 0,
      })),
    [insurers, policyCountByName]
  );

  const totalPoliciesLinked = useMemo(
    () => Object.values(policyCountByName).reduce((a, b) => a + b, 0),
    [policyCountByName]
  );

  const handleExtractFromPolicies = async () => {
    const seen = new Map<string, string>();
    for (const p of policies) {
      const raw = (p.insurer || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    const toCreate = Array.from(seen.values()).filter(
      (name) =>
        !insurers.some((i) => insurerMatchesPolicy(i.name, name))
    );
    if (toCreate.length === 0) {
      alert("Todas as asseguradoras das apólices já estão cadastradas.");
      return;
    }
    setIsExtracting(true);
    try {
      let created = 0;
      for (const name of toCreate) {
        try {
          await createInsurer({ name: name.trim() });
          created++;
        } catch {
          // Skip duplicates (e.g. case variation)
        }
      }
      alert(`${created} asseguradora(s) extraída(s) das apólices.`);
    } catch (error) {
      alert(`Erro ao extrair: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const columns: ColumnDef<InsurerWithStats>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Nome
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "policyCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Apólices
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.policyCount}</span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedInsurer(row.original);
                setIsEditing(true);
                setEditedName(row.original.name);
                setIsCreating(false);
              }}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm(`Deletar a asseguradora "${row.original.name}"?`)) return;
                try {
                  await deleteInsurer(row.original.id);
                  if (selectedInsurer?.id === row.original.id) {
                    setSelectedInsurer(null);
                    setIsEditing(false);
                  }
                } catch (error) {
                  alert(`Erro ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                }
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Deletar
            </Button>
          </div>
        ),
      },
    ],
    [selectedInsurer, deleteInsurer]
  );

  const table = useReactTable({
    data: insurersWithStats,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue || "").toLowerCase();
      if (!q) return true;
      return row.original.name.toLowerCase().includes(q);
    },
  });

  const handleSave = async () => {
    if (!editedName?.trim()) {
      alert("Nome é obrigatório");
      return;
    }
    setIsSaving(true);
    try {
      if (selectedInsurer) {
        await updateInsurer({
          id: selectedInsurer.id,
          data: { name: editedName.trim() },
        });
        setIsEditing(false);
        setSelectedInsurer(null);
      } else if (isCreating) {
        await createInsurer({ name: editedName.trim() });
        setIsCreating(false);
      }
      setEditedName("");
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedInsurer(null);
    setIsCreating(true);
    setIsEditing(true);
    setEditedName("");
  };

  const handleCancel = () => {
    setSelectedInsurer(null);
    setIsCreating(false);
    setIsEditing(false);
    setEditedName("");
  };

  const handleExport = () => {
    exportInsurersToExcel(insurers, policyCountByName);
  };

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Asseguradoras
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                  Gerencie as seguradoras vinculadas às apólices
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleExtractFromPolicies}
                disabled={isExtracting || policies.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isExtracting ? "Extraindo..." : "Extrair das apólices"}
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={insurers.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              <Button onClick={handleCreateNew} className="shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4 mr-2" />
                Nova Asseguradora
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Total de Asseguradoras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{insurers.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Apólices vinculadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalPoliciesLinked}</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-border sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                Resultados na busca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{filteredCount}</p>
              {globalFilter && (
                <p className="text-xs text-muted-foreground mt-1">
                  filtrado de {insurers.length} asseguradoras
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Buscar</CardTitle>
              </div>
              <Input
                placeholder="Buscar por nome..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-border bg-gradient-to-r from-muted/50 to-muted/30"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-12 sm:h-14 px-3 sm:px-4 lg:px-6 text-left align-middle font-bold text-xs text-muted-foreground uppercase tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={columns.length} className="h-40 text-center">
                        <div className="text-muted-foreground">Carregando...</div>
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center py-8">
                          <Building2 className="h-8 w-8 text-muted-foreground opacity-50 mb-4" />
                          <p className="text-muted-foreground font-medium">Nenhuma asseguradora encontrada</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Clique em &quot;Extrair das apólices&quot; para criar a partir das apólices existentes.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {table.getPageCount() > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Página {table.getState().pagination.pageIndex + 1} de{" "}
                  {table.getPageCount()} ({filteredCount} resultados)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={isEditing && (!!selectedInsurer || isCreating)}
          onOpenChange={(open) => !open && handleCancel()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isCreating ? "Nova Asseguradora" : "Editar Asseguradora"}
              </DialogTitle>
              <button onClick={handleCancel} className="rounded-lg p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          <DialogContent>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Nome *</label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Ex: Porto Seguro"
              />
            </div>
          </DialogContent>
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-t border-border/50 bg-muted/5 flex items-center justify-end gap-2 flex-wrap shrink-0 mt-auto">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Dialog>
      </div>
    </AppLayout>
  );
}
