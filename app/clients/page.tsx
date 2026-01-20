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
import { formatDate, isBirthdayThisMonth } from "@/lib/date-helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown, MessageCircle, X, User, Phone, Mail, Calendar, FileText, Building2, Package, DollarSign, Info, Search, Filter, Users as UsersIcon, Gift, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { classifyDueStatus } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/colors";

export default function ClientsPage() {
  const { clients } = useClients();
  const { policies } = usePolicies();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [birthdayFilter, setBirthdayFilter] = useState(false);
  const [selectedClient, setSelectedClient] = useState<typeof clientsWithStats[0] | null>(null);

  const clientsWithStats = useMemo(() => {
    return clients.map((client) => {
      const clientPolicies = policies.filter((p) => p.clientId === client.id);
      const activePolicies = clientPolicies.filter((p) => p.status === "active");
      const nextRenewal = activePolicies
        .map((p) => (typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate))
        .sort((a, b) => a.getTime() - b.getTime())[0];

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
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    // Birthday filter
    if (birthdayFilter) {
      filtered = filtered.filter((c) => isBirthdayThisMonth(c.birthday));
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
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
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
              <div className="flex items-end">
                <Button
                  variant={birthdayFilter ? "default" : "outline"}
                  onClick={() => setBirthdayFilter(!birthdayFilter)}
                  className="shadow-sm"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Aniversários este mês
                </Button>
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
                            <td key={cell.id} className="px-6 py-4 text-sm">
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
          </CardContent>
        </Card>

        {/* Client Detail Modal */}
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl">Detalhes do Cliente</DialogTitle>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-lg p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          {selectedClient && (
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
                      <p className="font-semibold text-base">{selectedClient.name}</p>
                    </div>
                    {selectedClient.phone && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Phone className="h-3.5 w-3.5" />
                          <span>Telefone</span>
                        </div>
                        <p className="font-semibold text-base">{selectedClient.phone}</p>
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="space-y-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all hover:shadow-md border border-border/30">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                        </div>
                        <p className="font-semibold text-base break-all">{selectedClient.email}</p>
                      </div>
                    )}
                    {selectedClient.birthday && (() => {
                      const isToday = selectedClient.birthday && new Date(selectedClient.birthday).getMonth() === new Date().getMonth() && new Date(selectedClient.birthday).getDate() === new Date().getDate();
                      const isThisMonth = isBirthdayThisMonth(selectedClient.birthday);
                      return (
                        <div className={cn(
                          "space-y-2 p-4 rounded-xl transition-all hover:shadow-md border",
                          isToday 
                            ? "bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 border-purple-300 dark:border-purple-500/50 shadow-lg" 
                            : isThisMonth
                            ? "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-200 dark:border-purple-500/30"
                            : "bg-muted/40 hover:bg-muted/60 border-border/30"
                        )}>
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                            {isToday ? (
                              <>
                                <Sparkles className={cn("h-3.5 w-3.5 text-purple-600 dark:text-purple-400")} />
                                <span className="text-purple-700 dark:text-purple-300 font-bold">Aniversário Hoje! 🎉</span>
                              </>
                            ) : isThisMonth ? (
                              <>
                                <Gift className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                <span className="text-purple-700 dark:text-purple-300 font-semibold">Data de Nascimento</span>
                              </>
                            ) : (
                              <>
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Data de Nascimento</span>
                              </>
                            )}
                          </div>
                          <p className={cn(
                            "font-semibold text-base",
                            isToday ? "text-purple-900 dark:text-purple-100" : ""
                          )}>{formatDate(selectedClient.birthday)}</p>
                        </div>
                      );
                    })()}
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
                  </div>
                  {selectedClient.phone && (
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
                    const clientPolicies = policies.filter((p) => p.clientId === selectedClient.id);
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
                        {clientPolicies.map((policy) => {
                          const status = classifyDueStatus(policy.dueDate);
                          const statusColor = status === "overdue" 
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                            : status === "d7"
                            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
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
                                    <p className="text-base font-bold text-green-600 dark:text-green-400">
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
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AppLayout>
  );
}

