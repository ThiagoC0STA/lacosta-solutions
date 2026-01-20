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
import { formatDate, isBirthdayThisMonth } from "@/lib/date-helpers";
import type { Client } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientsPage() {
  const [clients] = useClients();
  const [policies] = usePolicies();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [birthdayFilter, setBirthdayFilter] = useState(false);

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
          return (
            <div className="flex items-center gap-2">
              <span>{client.name}</span>
              {isBirthday && (
                <Badge variant="secondary" className="text-xs">
                  Aniversário
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus clientes
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Nome, telefone, email..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant={birthdayFilter ? "default" : "outline"}
                  onClick={() => setBirthdayFilter(!birthdayFilter)}
                >
                  Aniversários este mês
                </Button>
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
                        Nenhum cliente encontrado
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b transition-colors hover:bg-muted/50"
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
                    ))
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

