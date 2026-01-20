"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useClients, usePolicies } from "@/hooks/use-supabase-data";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { formatDate, classifyDueStatus } from "@/lib/date-helpers";
import type { RenewalWithClient } from "@/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, X, User, Phone, Mail, Calendar, FileText, Building2, Package, DollarSign, Info, Search, Filter, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { getStatusColor } from "@/lib/colors";

export default function RenewalsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [selectedRenewal, setSelectedRenewal] = useState<RenewalWithClient | null>(null);

  const renewalsWithClients = useMemo<RenewalWithClient[]>(() => {
    return policies.map((policy) => {
      const client = clients.find((c) => c.id === policy.clientId);
      return {
        ...policy,
        client: client || { id: policy.clientId, name: "Cliente não encontrado" },
      };
    });
  }, [policies, clients]);

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
      {
        accessorKey: "client.name",
        header: "Cliente",
        cell: ({ row }) => row.original.client.name,
      },
      {
        accessorKey: "client.phone",
        header: "Telefone",
        cell: ({ row }) => row.original.client.phone || "-",
      },
      {
        accessorKey: "client.email",
        header: "Email",
        cell: ({ row }) => row.original.client.email || "-",
      },
      {
        accessorKey: "policyNumber",
        header: "Número da Apólice",
        cell: ({ row }) => row.original.policyNumber || "-",
      },
      {
        accessorKey: "insurer",
        header: "Seguradora",
        cell: ({ row }) => row.original.insurer || "-",
      },
      {
        accessorKey: "product",
        header: "Produto",
        cell: ({ row }) => row.original.product || "-",
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 p-0"
            >
              Vencimento
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => formatDate(row.original.dueDate),
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
        header: "Prêmio Total",
        cell: ({ row }) =>
          row.original.premium
            ? new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(row.original.premium)
            : "-",
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
          const statusLabels: Record<string, string> = {
            active: "Ativo",
            renewed: "Renovado",
            lost: "Perdido",
          };
          return statusLabels[status] || status;
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
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      globalFilter,
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
              <RefreshCw className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Renovações
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Gerencie todas as renovações de apólices
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Filter className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden border border-border shadow-lg">
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
                          className="h-14 px-6 text-left align-middle font-bold text-xs text-muted-foreground uppercase tracking-wider"
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
                      const statusKey = status === "overdue" ? "overdue" : status === "d7" ? "urgent" : "default";
                      const colors = getStatusColor(statusKey);
                      const rowClasses = colors.rowBg && colors.rowHover 
                        ? `${colors.rowBg} ${colors.rowHover}`
                        : colors.rowHover || colors.hoverBg;
                      
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border transition-all duration-200 cursor-pointer group hover:bg-muted/20",
                            rowClasses
                          )}
                          onClick={() => setSelectedRenewal(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-6 py-4 text-sm">
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
          </CardContent>
        </Card>

        {/* Renewal Detail Modal */}
        <Dialog open={!!selectedRenewal} onOpenChange={(open) => !open && setSelectedRenewal(null)}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl">Detalhes da Renovação</DialogTitle>
              </div>
              <button
                onClick={() => setSelectedRenewal(null)}
                className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          {selectedRenewal && (
            <DialogContent className="space-y-6">
              {/* Client Info Card */}
              <Card className="relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                
                <CardHeader className="pb-4 relative">
                  <CardTitle className="text-lg flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <User className="h-3.5 w-3.5" />
                        <span>Nome</span>
                      </div>
                      <p className="font-semibold text-base">{selectedRenewal.client.name}</p>
                    </div>
                    {selectedRenewal.client.phone && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Phone className="h-3.5 w-3.5" />
                          <span>Telefone</span>
                        </div>
                        <p className="font-semibold text-base">{selectedRenewal.client.phone}</p>
                      </div>
                    )}
                    {selectedRenewal.client.email && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                        </div>
                        <p className="font-semibold text-base break-all">{selectedRenewal.client.email}</p>
                      </div>
                    )}
                    {selectedRenewal.client.birthday && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Data de Nascimento</span>
                        </div>
                        <p className="font-semibold text-base">{formatDate(selectedRenewal.client.birthday)}</p>
                      </div>
                    )}
                  </div>
                  {selectedRenewal.client.phone && (
                    <Button
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                      onClick={() => {
                        const phone = selectedRenewal.client.phone?.replace(/\D/g, "");
                        if (phone) {
                          window.open(`https://wa.me/55${phone}`, "_blank");
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Policy Info Card */}
              <Card className="relative overflow-hidden">
                {/* Decorative accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                
                <CardHeader className="pb-4 relative">
                  <CardTitle className="text-lg flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    Informações da Apólice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedRenewal.policyNumber && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Número da Apólice</span>
                        </div>
                        <p className="font-semibold text-base">{selectedRenewal.policyNumber}</p>
                      </div>
                    )}
                    {selectedRenewal.insurer && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>Seguradora</span>
                        </div>
                        <p className="font-semibold text-base">{selectedRenewal.insurer}</p>
                      </div>
                    )}
                    {selectedRenewal.product && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Package className="h-3.5 w-3.5" />
                          <span>Produto</span>
                        </div>
                        <p className="font-semibold text-base">{selectedRenewal.product}</p>
                      </div>
                    )}
                    <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Vencimento</span>
                      </div>
                      <p className="font-semibold text-base">{formatDate(selectedRenewal.dueDate)}</p>
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Info className="h-3.5 w-3.5" />
                        <span>Status</span>
                      </div>
                      <p className="font-semibold text-base">
                        {selectedRenewal.status === "active" ? "Ativo" : 
                         selectedRenewal.status === "renewed" ? "Renovado" : "Perdido"}
                      </p>
                    </div>
                    {selectedRenewal.premium && (
                      <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-50/80 to-green-50/50 dark:from-green-950/30 dark:to-green-950/20 border border-green-200/50 dark:border-green-900/50 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Prêmio Total</span>
                        </div>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(selectedRenewal.premium)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Financial Info */}
                  {selectedRenewal.notes && selectedRenewal.notes.includes("IOF") && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <div className="flex items-center gap-2.5 text-sm font-bold mb-4">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <span>Informações Financeiras</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {selectedRenewal.notes.split(" | ").map((note, idx) => {
                          if (note.includes("IOF") || note.includes("Prêmio Líquido") || note.includes("Comissão")) {
                            return (
                              <div key={idx} className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-xl p-4 border border-border/50 hover:shadow-lg transition-all hover:-translate-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                  {note.split(":")[0]}
                                </p>
                                <p className="text-base font-bold text-foreground">
                                  {note.split(":")[1]?.trim()}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Other Notes */}
                  {selectedRenewal.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Info className="h-4 w-4" />
                        <span>Observações</span>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm">{selectedRenewal.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppLayout>
  );
}

