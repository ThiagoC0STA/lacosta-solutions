"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
import { formatDate, isBirthdayThisMonth } from "@/lib/date-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, X, User, Phone, Mail, Calendar, FileText, Building2, Package, DollarSign, Info, Search, Filter, Users as UsersIcon, Gift, Sparkles, Edit2, Save, Trash2, Plus, Download } from "lucide-react";
import { exportClientsToExcel } from "@/lib/export-helpers";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { classifyDueStatus } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/colors";

export default function ClientsPage() {
  const { clients, updateClient, deleteClient, createClient } = useClients();
  const { policies } = usePolicies();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [birthdayFilter, setBirthdayFilter] = useState(false);

  // Initialize filter from URL search params
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setGlobalFilter(search);
    }
  }, [searchParams]);
  const [selectedClient, setSelectedClient] = useState<typeof clientsWithStats[0] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedClient, setEditedClient] = useState<Partial<typeof clientsWithStats[0]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const clientsWithStats = useMemo(() => {
    const clientsList: any[] = Array.isArray(clients) ? clients : [];
    const policiesList: any[] = Array.isArray(policies) ? policies : [];
    return clientsList.map((client: any) => {
      const clientPolicies = policiesList.filter((p: any) => p.clientId === client.id);
      const activePolicies = clientPolicies.filter((p: any) => p.status === "active");
      const nextRenewal = activePolicies
        .map((p: any) => (typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];

      return {
        ...client,
        policyCount: clientPolicies.length,
        nextRenewalDate: nextRenewal,
      };
    });
  }, [clients, policies]);

  const filteredData = useMemo(() => {
    let filtered = clientsWithStats;

    // Global search filter
    if (globalFilter) {
      const query = globalFilter.toLowerCase();
      filtered = filtered.filter(
        (c: any) =>
          c.name.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    // Birthday filter
    if (birthdayFilter) {
      filtered = filtered.filter((c: any) => isBirthdayThisMonth(c.birthday));
    }

    return filtered;
  }, [clientsWithStats, globalFilter, birthdayFilter]);

  const columns: ColumnDef<typeof clientsWithStats[0]>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
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
          );
        },
        cell: ({ row }) => {
          const client = row.original;
          const isBirthday = isBirthdayThisMonth(client.birthday);
          const isToday = client.birthday && new Date(client.birthday).getMonth() === new Date().getMonth() && new Date(client.birthday).getDate() === new Date().getDate();
          return (
            <div className="flex items-center gap-2">
              <span className={isBirthday ? "font-semibold" : ""}>{client.name}</span>
              {isBirthday && (
                <Badge 
                  variant={isToday ? "birthdayToday" : "birthday"}
                  className="text-xs font-bold px-2.5 py-1"
                >
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  {isToday ? "Aniversário Hoje!" : "Aniversário"}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "birthday",
        header: "Aniversário",
        cell: ({ row }) =>
          row.original.birthday
            ? formatDate(row.original.birthday)
            : "-",
      },
      {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => row.original.phone || "-",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "-",
      },
      {
        accessorKey: "policyCount",
        header: "# Apólices",
        cell: ({ row }) => row.original.policyCount,
      },
      {
        accessorKey: "nextRenewalDate",
        header: "Próxima Renovação",
        cell: ({ row }) =>
          row.original.nextRenewalDate
            ? formatDate(row.original.nextRenewalDate)
            : "-",
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <UsersIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Clientes
                </h1>
                <p className="text-muted-foreground text-lg mt-1">
                  Gerencie todos os seus clientes
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => exportClientsToExcel(clients as any, policies as any)}
                className="shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(true);
                  setEditedClient({});
                  setSelectedClient(null);
                }}
                className="shadow-lg hover:shadow-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
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
                  placeholder="Nome, telefone, email..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filtros Rápidos
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={birthdayFilter ? "default" : "outline"}
                    onClick={() => setBirthdayFilter(!birthdayFilter)}
                    className="shadow-sm flex-1"
                    size="sm"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Aniversários
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const today = new Date();
                      const thisMonthClients = clientsWithStats.filter((c: any) => {
                        if (!c.birthday) return false;
                        const birthday = typeof c.birthday === "string" ? new Date(c.birthday) : c.birthday;
                        return birthday.getMonth() === today.getMonth();
                      });
                      if (thisMonthClients.length > 0) {
                        setSelectedClient(thisMonthClients[0]);
                      }
                    }}
                    className="shadow-sm"
                    size="sm"
                  >
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Ver Aniversariantes
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Resultados</label>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">
                    {filteredData.length} de {clientsWithStats.length} cliente(s)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-border shadow-lg">
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
                          className="h-14 px-6 text-left align-middle font-bold text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap"
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
                            <UsersIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                          </div>
                          <p className="text-muted-foreground font-medium">Nenhum cliente encontrado</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border transition-all duration-200 cursor-pointer group hover:bg-muted/30",
                            getStatusColor("default").rowHover
                          )}
                          onClick={() => setSelectedClient(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
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
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{" "}
                  de {table.getFilteredRowModel().rows.length} clientes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  Última
                </Button>
                <select
                  value={table.getState().pagination.pageSize.toString()}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value));
                  }}
                  className="ml-2 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Detail/Create Modal */}
        <Dialog open={!!selectedClient || isCreating} onOpenChange={(open) => {
          if (!open) {
            setSelectedClient(null);
            setIsCreating(false);
            setIsEditing(false);
            setEditedClient({});
          }
        }}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl">
                  {isCreating ? "Novo Cliente" : isEditing ? "Editar Cliente" : "Detalhes do Cliente"}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                {!isCreating && selectedClient && (
                  <>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(true);
                          setEditedClient({ ...selectedClient });
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!selectedClient) return;
                            setIsSaving(true);
                            try {
                              await updateClient({
                                id: selectedClient.id,
                                data: {
                                  name: editedClient.name,
                                  phone: editedClient.phone,
                                  email: editedClient.email,
                                  birthday: editedClient.birthday,
                                },
                              });
                              setIsEditing(false);
                              // Refresh client data - the query will update automatically
                              setEditedClient({});
                            } catch (error) {
                              alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedClient({});
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (!selectedClient) return;
                        if (!confirm(`Tem certeza que deseja deletar o cliente "${selectedClient.name}"? Esta ação não pode ser desfeita.`)) return;
                        setIsDeleting(true);
                        try {
                          if (selectedClient) {
                            await deleteClient(selectedClient.id);
                          }
                          setSelectedClient(null);
                        } catch (error) {
                          alert(`Erro ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                        } finally {
                          setIsDeleting(false);
                        }
                      }}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Deletando..." : "Deletar"}
                    </Button>
                  </>
                )}
                {isCreating && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!editedClient.name) {
                          alert("Nome é obrigatório");
                          return;
                        }
                        setIsSaving(true);
                        try {
                          await createClient({
                            name: editedClient.name || "",
                            phone: editedClient.phone,
                            email: editedClient.email,
                            birthday: editedClient.birthday,
                          });
                          setIsCreating(false);
                          setIsEditing(false);
                          setEditedClient({});
                        } catch (error) {
                          alert(`Erro ao criar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Criando..." : "Criar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreating(false);
                        setIsEditing(false);
                        setEditedClient({});
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setIsCreating(false);
                    setIsEditing(false);
                    setEditedClient({});
                  }}
                  className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DialogHeader>
          {(selectedClient || isCreating) && (
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
                      {isEditing || isCreating ? (
                        <Input
                          value={editedClient.name || ""}
                          onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                          placeholder="Nome do cliente"
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold text-base">{selectedClient?.name}</p>
                      )}
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Phone className="h-3.5 w-3.5" />
                        <span>Telefone</span>
                      </div>
                      {isEditing || isCreating ? (
                        <Input
                          value={editedClient.phone || ""}
                          onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                          placeholder="Telefone"
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold text-base">{selectedClient?.phone || "-"}</p>
                      )}
                    </div>
                    <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </div>
                      {isEditing || isCreating ? (
                        <Input
                          type="email"
                          value={editedClient.email || ""}
                          onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                          placeholder="Email"
                          className="font-semibold"
                        />
                      ) : (
                        <p className="font-semibold text-base break-all">{selectedClient?.email || "-"}</p>
                      )}
                    </div>
                    <div className={cn(
                      "space-y-2 p-4 rounded-xl transition-all hover:shadow-md border",
                      !isEditing && !isCreating && selectedClient?.birthday ? (() => {
                        const isToday = selectedClient.birthday && new Date(selectedClient.birthday).getMonth() === new Date().getMonth() && new Date(selectedClient.birthday).getDate() === new Date().getDate();
                        const isThisMonth = isBirthdayThisMonth(selectedClient.birthday);
                        return isToday 
                          ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-lg" 
                          : isThisMonth
                          ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
                          : "bg-muted/40 hover:bg-muted/60 border-border/30";
                      })() : "bg-muted/40 hover:bg-muted/60 border-border/30"
                    )}>
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                        {!isEditing && !isCreating && selectedClient && selectedClient.birthday ? (() => {
                          const isToday = selectedClient.birthday && new Date(selectedClient.birthday).getMonth() === new Date().getMonth() && new Date(selectedClient.birthday).getDate() === new Date().getDate();
                          const isThisMonth = isBirthdayThisMonth(selectedClient.birthday);
                          return isToday ? (
                            <>
                              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                              <span className="text-purple-300 font-bold">Aniversário Hoje! 🎉</span>
                            </>
                          ) : isThisMonth ? (
                            <>
                              <Gift className="h-3.5 w-3.5 text-purple-400" />
                              <span className="text-purple-300 font-semibold">Data de Nascimento</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Data de Nascimento</span>
                            </>
                          );
                        })() : (
                          <>
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Data de Nascimento</span>
                          </>
                        )}
                      </div>
                      {isEditing || isCreating ? (
                        <Input
                          type="date"
                          value={editedClient.birthday ? (typeof editedClient.birthday === "string" ? editedClient.birthday.split("T")[0] : new Date(editedClient.birthday).toISOString().split("T")[0]) : ""}
                          onChange={(e) => setEditedClient({ ...editedClient, birthday: e.target.value ? new Date(e.target.value) : undefined })}
                          className="font-semibold"
                        />
                      ) : (
                        <p className={cn(
                          "font-semibold text-base",
                          selectedClient?.birthday && new Date(selectedClient.birthday).getMonth() === new Date().getMonth() && new Date(selectedClient.birthday).getDate() === new Date().getDate() ? "text-purple-100" : ""
                        )}>{selectedClient?.birthday ? formatDate(selectedClient.birthday) : "-"}</p>
                      )}
                    </div>
                    {selectedClient && (
                      <>
                        <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Total de Apólices</span>
                          </div>
                          <p className="font-semibold text-base">{selectedClient.policyCount}</p>
                        </div>
                        {selectedClient.nextRenewalDate && (
                          <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Próxima Renovação</span>
                            </div>
                            <p className="font-semibold text-base">{formatDate(selectedClient.nextRenewalDate)}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {selectedClient && selectedClient.phone && (
                    <Button
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                      onClick={() => {
                        const phone = selectedClient.phone?.replace(/\D/g, "");
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

              {/* Policies Card */}
              {selectedClient && (
                <Card className="relative overflow-hidden">
                  {/* Decorative accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                  
                  <CardHeader className="pb-4 relative">
                    <CardTitle className="text-lg flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      Apólices ({selectedClient.policyCount})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {(() => {
                      const clientPolicies = (Array.isArray(policies) ? policies : []).filter((p: any) => p.clientId === selectedClient.id);
                    if (clientPolicies.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">Nenhuma apólice encontrada</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {clientPolicies.map((policy: any) => {
                          const status = classifyDueStatus(policy.dueDate);
                          const statusColor = status === "overdue" 
                            ? "bg-red-950/40 border-red-900"
                            : status === "d7"
                            ? "bg-amber-950/40 border-amber-900"
                            : "bg-gradient-to-br from-muted/60 to-muted/40 border-border/50";
                          return (
                            <div key={policy.id} className={`relative border rounded-xl p-4 ${statusColor} transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden`}>
                              {/* Hover accent */}
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 hover:opacity-100 transition-opacity" />
                              <div className="grid gap-3 md:grid-cols-3">
                                {policy.policyNumber && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      <FileText className="h-3 w-3" />
                                      <span>Número</span>
                                    </div>
                                    <p className="text-sm font-semibold">{policy.policyNumber}</p>
                                  </div>
                                )}
                                {policy.insurer && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      <Building2 className="h-3 w-3" />
                                      <span>Seguradora</span>
                                    </div>
                                    <p className="text-sm font-semibold">{policy.insurer}</p>
                                  </div>
                                )}
                                {policy.product && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      <Package className="h-3 w-3" />
                                      <span>Produto</span>
                                    </div>
                                    <p className="text-sm font-semibold">{policy.product}</p>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <Calendar className="h-3 w-3" />
                                    <span>Vencimento</span>
                                  </div>
                                  <p className="text-sm font-semibold">{formatDate(policy.dueDate)}</p>
                                </div>
                                {policy.premium && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                      <DollarSign className="h-3 w-3" />
                                      <span>Prêmio</span>
                                    </div>
                                    <p className="text-base font-bold text-green-400">
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(policy.premium)}
                                    </p>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    <Info className="h-3 w-3" />
                                    <span>Status</span>
                                  </div>
                                  <p className="text-sm font-semibold">
                                    {policy.status === "active" ? "Ativo" : 
                                     policy.status === "renewed" ? "Renovado" : "Perdido"}
                                  </p>
                                </div>
                              </div>
                              {policy.notes && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                    <Info className="h-3 w-3" />
                                    <span>Observações</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{policy.notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              )}
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppLayout>
  );
}

