"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useClients, usePolicies } from "@/hooks/use-local-storage";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { formatDate, classifyDueStatus, getStatusColor } from "@/lib/date-helpers";
import type { RenewalWithClient, Policy } from "@/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RenewalsPage() {
  const [clients] = useClients();
  const [policies] = usePolicies();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "dueDate", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

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
        header: "Prêmio",
        cell: ({ row }) =>
          row.original.premium
            ? new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(row.original.premium)
            : "-",
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
        cell: ({ row }) => row.original.notes || "-",
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Renovações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as renovações de apólices
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Cliente, apólice, seguradora..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="renewed">Renovado</option>
                  <option value="lost">Perdido</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prazo</label>
                <Select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b bg-muted/50"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
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
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhuma renovação encontrada
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => {
                      const status = classifyDueStatus(row.original.dueDate);
                      const rowColor = getStatusColor(status);
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b transition-colors hover:bg-muted/50",
                            rowColor
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="p-4">
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
      </div>
    </AppLayout>
  );
}

