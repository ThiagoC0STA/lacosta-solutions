"use client";

import { useMemo, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
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
import { formatDate, classifyDueStatus } from "@/lib/date-helpers";
import type { RenewalWithClient } from "@/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, RefreshCw, Download, Plus, CheckSquare, Square, Trash2, Info, Calendar, X, FileText, User, Building2, Package, DollarSign, Save, Phone, Mail } from "lucide-react";
import { exportPoliciesToExcel } from "@/lib/export-helpers";
import { cn } from "@/lib/utils";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { getStatusColor } from "@/lib/colors";
import { RenewalDetailModal } from "@/components/renewal-detail-modal";

export default function RenewalsPage() {
  const { clients } = useClients();
  const { policies, updatePolicy, deletePolicy, createPolicy } = usePolicies();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalWithClient | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Partial<RenewalWithClient>>({});

  const renewalsWithClients = useMemo<RenewalWithClient[]>(() => {
    const policiesList: any[] = Array.isArray(policies) ? policies : [];
    const clientsList: any[] = Array.isArray(clients) ? clients : [];
    return policiesList.map((policy: any) => {
      const client = clientsList.find((c: any) => c.id === policy.clientId);
      return {
        ...policy,
        client: client || { id: policy.clientId, name: "Cliente não encontrado" },
      };
    });
  }, [policies, clients]);

  const handleUpdateRenewal = useCallback(async (id: string, data: Partial<Omit<RenewalWithClient, "id" | "client">>) => {
    const updated = await updatePolicy({ id, data });
    // Update selectedRenewal with the returned data
    if (selectedRenewal && selectedRenewal.id === id) {
      setSelectedRenewal({
        ...selectedRenewal,
        ...updated,
        client: selectedRenewal.client,
      });
    }
    return { ...updated, client: selectedRenewal?.client || { id: "", name: "" } };
  }, [updatePolicy, selectedRenewal]);

  const handleSelectPolicy = useCallback((policyId: string) => {
    const renewal = renewalsWithClients.find((r) => r.id === policyId);
    if (renewal) {
      setSelectedRenewal(renewal);
    }
  }, [renewalsWithClients]);

  const filteredData = useMemo(() => {
    let filtered = renewalsWithClients;

    // Global search filter
    if (globalFilter) {
      const query = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.client.name.toLowerCase().includes(query) ||
          r.client.email?.toLowerCase().includes(query) ||
          r.client.phone?.toLowerCase().includes(query) ||
          r.policyNumber?.toLowerCase().includes(query) ||
          r.insurer?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Date range filter
    if (dateRangeFilter !== "all") {
      filtered = filtered.filter((r) => {
        const status = classifyDueStatus(r.dueDate);
        return status === dateRangeFilter;
      });
    }

    // Sort by importance: overdue first, then d7, then by date
    filtered.sort((a, b) => {
      const statusA = classifyDueStatus(a.dueDate);
      const statusB = classifyDueStatus(b.dueDate);
      
      // Priority order: overdue > d7 > others
      const priority = { overdue: 0, d7: 1, d15: 2, d30: 3, future: 4 };
      const priorityDiff = priority[statusA] - priority[statusB];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by date
      const dateA = typeof a.dueDate === "string" ? new Date(a.dueDate) : a.dueDate;
      const dateB = typeof b.dueDate === "string" ? new Date(b.dueDate) : b.dueDate;
      return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [renewalsWithClients, globalFilter, statusFilter, dateRangeFilter]);

  const columns: ColumnDef<RenewalWithClient>[] = useMemo(
    () => [
      ...(isSelectMode
        ? [
            {
              id: "select",
              header: () => (
                <div className="flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedRows.size === filteredData.length) {
                        setSelectedRows(new Set());
                      } else {
                        setSelectedRows(new Set(filteredData.map((r) => r.id)));
                      }
                    }}
                    className="p-1.5 hover:bg-muted/60 rounded-md transition-colors"
                  >
                    {selectedRows.size === filteredData.length ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ),
              cell: ({ row }) => (
                <div className="flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSelected = new Set(selectedRows);
                      if (newSelected.has(row.original.id)) {
                        newSelected.delete(row.original.id);
                      } else {
                        newSelected.add(row.original.id);
                      }
                      setSelectedRows(newSelected);
                    }}
                    className="p-1.5 hover:bg-muted/60 rounded-md transition-colors"
                  >
                    {selectedRows.has(row.original.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ),
              size: 50,
            } as ColumnDef<RenewalWithClient>,
          ]
        : []),
      {
        accessorKey: "client.name",
        header: () => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Cliente</span>
          </div>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-foreground">{row.original.client.name}</div>
        ),
      },
      {
        accessorKey: "client.phone",
        header: () => (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>Telefone</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.client.phone || "-"}</span>
        ),
      },
      {
        accessorKey: "client.email",
        header: () => (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>Email</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.client.email || "-"}</span>
        ),
      },
      {
        accessorKey: "policyNumber",
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Número da Apólice</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.policyNumber || "-"}</span>
        ),
      },
      {
        accessorKey: "insurer",
        header: () => (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>Seguradora</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.insurer || "-"}</span>
        ),
      },
      {
        accessorKey: "product",
        header: () => (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>Produto</span>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.product || "-"}</span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 p-0 hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Vencimento</span>
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                )}
              </div>
            </Button>
          );
        },
        cell: ({ row }) => {
          const status = classifyDueStatus(row.original.dueDate);
          const statusKey = status === "overdue" ? "overdue" : status === "d7" ? "urgent" : "default";
          const colors = getStatusColor(statusKey);
          
          return (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full border ${colors.iconBg} ${colors.borderColor}`} />
              <span className={`font-medium ${colors.numberColor}`}>
                {formatDate(row.original.dueDate)}
              </span>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const dateA = typeof rowA.original.dueDate === "string"
            ? new Date(rowA.original.dueDate)
            : rowA.original.dueDate;
          const dateB = typeof rowB.original.dueDate === "string"
            ? new Date(rowB.original.dueDate)
            : rowB.original.dueDate;
          return dateA.getTime() - dateB.getTime();
        },
      },
      {
        accessorKey: "premium",
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>Prêmio Total</span>
          </div>
        ),
        cell: ({ row }) =>
          row.original.premium ? (
            <span className="font-semibold text-green-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(row.original.premium)}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "iof",
        header: "IOF",
        cell: ({ row }) => {
          // Extract IOF from notes if exists
          const notes = row.original.notes || "";
          // More flexible regex: matches "IOF: R$ 1.234,56" or "IOF: R$ 123,45" or "IOF:R$123,45"
          const iofMatch = notes.match(/IOF\s*:\s*R\$\s*([\d.]+,\d{2})/i);
          if (iofMatch && iofMatch[1]) {
            try {
              // Convert Brazilian format (1.234,56) to number
              const value = parseFloat(iofMatch[1].replace(/\./g, "").replace(",", "."));
              if (!isNaN(value) && value > 0) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value);
              }
            } catch (e) {
              console.error("Error parsing IOF:", e, "Match:", iofMatch, "Notes:", notes);
            }
          }
          return "-";
        },
      },
      {
        accessorKey: "netPremium",
        header: "Prêmio Líquido",
        cell: ({ row }) => {
          // Extract Prêmio Líquido from notes if exists
          const notes = row.original.notes || "";
          // More flexible regex
          const netMatch = notes.match(/Prêmio\s+Líquido\s*:\s*R\$\s*([\d.]+,\d{2})/i);
          if (netMatch && netMatch[1]) {
            try {
              const value = parseFloat(netMatch[1].replace(/\./g, "").replace(",", "."));
              if (!isNaN(value) && value > 0) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value);
              }
            } catch (e) {
              console.error("Error parsing Prêmio Líquido:", e, "Match:", netMatch);
            }
          }
          return "-";
        },
      },
      {
        accessorKey: "commission",
        header: "Comissão",
        cell: ({ row }) => {
          // Extract Comissão from notes if exists
          const notes = row.original.notes || "";
          // More flexible regex
          const commMatch = notes.match(/Comissão\s*:\s*R\$\s*([\d.]+,\d{2})/i);
          if (commMatch && commMatch[1]) {
            try {
              const value = parseFloat(commMatch[1].replace(/\./g, "").replace(",", "."));
              if (!isNaN(value) && value > 0) {
                return new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(value);
              }
            } catch (e) {
              console.error("Error parsing Comissão:", e, "Match:", commMatch);
            }
          }
          return "-";
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const statusLabels: Record<string, { label: string; className: string }> = {
            active: {
              label: "Ativo",
              className: "bg-green-900/30 text-green-400 border-green-800",
            },
            renewed: {
              label: "Renovado",
              className: "bg-blue-900/30 text-blue-400 border-blue-800",
            },
            lost: {
              label: "Perdido",
              className: "bg-gray-800 text-gray-400 border-gray-700",
            },
          };
          const statusConfig = statusLabels[status] || { label: status, className: "" };
          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Observações",
        cell: ({ row }) => {
          // Remove IOF, Prêmio Líquido and Comissão from notes display (already shown in columns)
          let notes = row.original.notes || "";
          notes = notes.replace(/IOF:\s*R\$\s*[\d.,]+\s*\|\s*/g, "");
          notes = notes.replace(/Prêmio Líquido:\s*R\$\s*[\d.,]+\s*\|\s*/g, "");
          notes = notes.replace(/Comissão:\s*R\$\s*[\d.,]+\s*\|\s*/g, "");
          notes = notes.replace(/\s*\|\s*$/g, "").trim();
          return notes || "-";
        },
      },
    ],
    [isSelectMode, selectedRows, filteredData]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      pagination,
      globalFilter,
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <RefreshCw className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Renovações
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                  Gerencie todas as renovações de apólices
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  setIsCreatingPolicy(true);
                  setNewPolicy({});
                }}
                className="shadow-lg hover:shadow-xl flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Apólice
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Filtros</CardTitle>
              </div>
              {isSelectMode && selectedRows.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedRows.size} selecionado(s)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Marcar ${selectedRows.size} apólice(s) como renovada(s)?`)) return;
                      try {
                        await Promise.all(
                          Array.from(selectedRows).map((id) =>
                            updatePolicy({ id, data: { status: "renewed" as const } })
                          )
                        );
                        setSelectedRows(new Set());
                        setIsSelectMode(false);
                      } catch (error) {
                        alert(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Marcar como Renovado
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Deletar ${selectedRows.size} apólice(s)? Esta ação não pode ser desfeita.`)) return;
                      try {
                        await Promise.all(
                          Array.from(selectedRows).map((id) => deletePolicy(id))
                        );
                        setSelectedRows(new Set());
                        setIsSelectMode(false);
                      } catch (error) {
                        alert(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Selecionados
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </label>
                <Input
                  placeholder="Cliente, email, telefone, apólice, seguradora..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="renewed">Renovado</option>
                  <option value="lost">Perdido</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Prazo
                </label>
                <Select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="shadow-sm"
                >
                  <option value="all">Todos</option>
                  <option value="overdue">Vencidos</option>
                  <option value="d7">0-7 dias</option>
                  <option value="d15">8-15 dias</option>
                  <option value="d30">16-30 dias</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Ações
                </label>
                <Button
                  variant={isSelectMode ? "default" : "outline"}
                  onClick={() => {
                    setIsSelectMode(!isSelectMode);
                    if (isSelectMode) setSelectedRows(new Set());
                  }}
                  className="w-full shadow-sm"
                >
                  {isSelectMode ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar Seleção
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Selecionar Múltiplos
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border border-border/50 shadow-lg bg-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto overflow-y-visible w-full">
              <table className="w-full min-w-max">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b border-border/50 bg-muted/20"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-12 px-3 sm:px-4 lg:px-6 text-left align-middle font-semibold text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap"
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
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-40 text-center"
                      >
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <RefreshCw className="h-8 w-8 text-muted-foreground opacity-50" />
                          </div>
                          <p className="text-muted-foreground font-medium">Nenhuma renovação encontrada</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const status = classifyDueStatus(row.original.dueDate);
                      // Map status to StatusColor
                      let statusKey: "overdue" | "urgent" | "d8to15" | "d16to30" | "birthday" | "default" = "default";
                      if (status === "overdue") statusKey = "overdue";
                      else if (status === "d7") statusKey = "urgent";
                      else if (status === "d15") statusKey = "d8to15";
                      else if (status === "d30") statusKey = "d16to30";
                      
                      const colors = getStatusColor(statusKey);
                      
                      // Get border color for left border
                      const getBorderColor = () => {
                        if (statusKey === "overdue") return "#ef4444"; // red-500
                        if (statusKey === "urgent") return "#f59e0b"; // amber-500
                        if (statusKey === "d8to15") return "#3b82f6"; // blue-500
                        if (statusKey === "d16to30") return "#6366f1"; // indigo-500
                        return "transparent";
                      };
                      
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border/30 transition-all duration-150 cursor-pointer group",
                            colors.rowHover || "hover:bg-muted/10"
                          )}
                          style={{
                            borderLeft: `4px solid ${getBorderColor()}`,
                          }}
                          onClick={() => {
                            if (!isSelectMode) {
                              setSelectedRenewal(row.original);
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 text-xs sm:text-sm whitespace-nowrap">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{" "}
                  de {table.getFilteredRowModel().rows.length} renovações
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Primeira
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Anterior
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground px-2 whitespace-nowrap">
                    Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Próxima
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Última
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Por página:</label>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onChange={(e) => {
                      table.setPageSize(Number(e.target.value));
                    }}
                    className="w-full sm:w-20 text-xs sm:text-sm"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="px-4 sm:px-6 pb-4">
              <Button
                variant="outline"
                onClick={() => exportPoliciesToExcel(policies as any, clients as any)}
                className="w-full sm:w-auto shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar para Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Detail Modal */}
        <RenewalDetailModal
          renewal={selectedRenewal}
          onClose={() => setSelectedRenewal(null)}
          onUpdate={handleUpdateRenewal}
          onDelete={deletePolicy}
          allPolicies={Array.isArray(policies) ? policies : []}
          onSelectPolicy={handleSelectPolicy}
        />

        {/* Create Policy Modal */}
        <Dialog open={isCreatingPolicy} onOpenChange={(open) => {
          if (!open) {
            setIsCreatingPolicy(false);
            setNewPolicy({});
          }
        }}>
          <DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <DialogTitle className="text-2xl">Nova Apólice</DialogTitle>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingPolicy(false);
                    setNewPolicy({});
                  }}
                  className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0 z-20"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!newPolicy.clientId) {
                      alert("Selecione um cliente");
                      return;
                    }
                    if (!newPolicy.dueDate) {
                      alert("Data de vencimento é obrigatória");
                      return;
                    }
                    setIsSavingPolicy(true);
                    try {
                      await createPolicy({
                        clientId: newPolicy.clientId as string,
                        policyNumber: newPolicy.policyNumber,
                        insurer: newPolicy.insurer,
                        product: newPolicy.product,
                        dueDate: typeof newPolicy.dueDate === "string" ? new Date(newPolicy.dueDate) : newPolicy.dueDate,
                        premium: newPolicy.premium,
                        status: (newPolicy.status || "active") as "active" | "renewed" | "lost",
                        notes: newPolicy.notes,
                      });
                      setIsCreatingPolicy(false);
                      setNewPolicy({});
                    } catch (error) {
                      alert(`Erro ao criar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                    } finally {
                      setIsSavingPolicy(false);
                    }
                  }}
                  disabled={isSavingPolicy}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingPolicy ? "Criando..." : "Criar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingPolicy(false);
                    setNewPolicy({});
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogHeader>
          <DialogContent className="space-y-6">
            {/* New Policy Form - No Card wrapper */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <User className="h-3.5 w-3.5" />
                      <span>Cliente *</span>
                    </div>
                    <Select
                      value={newPolicy.clientId || ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, clientId: e.target.value })}
                      className="font-semibold w-full"
                    >
                      <option value="">Selecione um cliente</option>
                      {(Array.isArray(clients) ? clients : [] as any[]).map((client: any) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Número da Apólice</span>
                    </div>
                    <Input
                      value={newPolicy.policyNumber || ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, policyNumber: e.target.value })}
                      placeholder="Número da apólice"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Seguradora</span>
                    </div>
                    <Input
                      value={newPolicy.insurer || ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, insurer: e.target.value })}
                      placeholder="Seguradora"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Package className="h-3.5 w-3.5" />
                      <span>Produto</span>
                    </div>
                    <Input
                      value={newPolicy.product || ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, product: e.target.value })}
                      placeholder="Produto"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Vencimento *</span>
                    </div>
                    <Input
                      type="date"
                      value={newPolicy.dueDate ? (typeof newPolicy.dueDate === "string" ? newPolicy.dueDate.split("T")[0] : new Date(newPolicy.dueDate).toISOString().split("T")[0]) : ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, dueDate: e.target.value ? new Date(e.target.value) : undefined })}
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Prêmio</span>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPolicy.premium || ""}
                      onChange={(e) => setNewPolicy({ ...newPolicy, premium: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="0.00"
                      className="font-semibold"
                    />
                  </div>
                  <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Info className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </div>
                    <Select
                      value={newPolicy.status || "active"}
                      onChange={(e) => setNewPolicy({ ...newPolicy, status: e.target.value as "active" | "renewed" | "lost" })}
                      className="font-semibold w-full"
                    >
                      <option value="active">Ativo</option>
                      <option value="renewed">Renovado</option>
                      <option value="lost">Perdido</option>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Observações</span>
                  </div>
                  <textarea
                    value={newPolicy.notes || ""}
                    onChange={(e) => setNewPolicy({ ...newPolicy, notes: e.target.value })}
                    placeholder="Observações adicionais..."
                    className="w-full min-h-[100px] rounded-lg border border-input/50 bg-background/50 backdrop-blur-sm px-3 py-2 text-sm font-semibold ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring focus-visible:bg-background"
                  />
                </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

