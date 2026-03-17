"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useProducts, usePolicies } from "@/hooks/use-supabase-data";
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
  Package,
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
} from "lucide-react";
import { productDisplay, type Product } from "@/types";
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { exportProductsToExcel } from "@/lib/export-helpers";
import { extractProductCodeFromPolicy } from "@/lib/product-helpers";

type ProductWithStats = Product & { policyCount: number };

export default function ProductsPage() {
  const { products, createProduct, updateProduct, deleteProduct, isLoading } = useProducts();
  const { policies } = usePolicies();
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<(typeof products)[0] | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editedProduct, setEditedProduct] = useState<{ code: number; name: string }>({ code: 0, name: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "code", desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const policyCountByCode = useMemo(() => {
    const map: Record<number, number> = {};
    for (const policy of policies) {
      const code = extractProductCodeFromPolicy(policy.product);
      if (code != null) {
        map[code] = (map[code] ?? 0) + 1;
      }
    }
    return map;
  }, [policies]);

  const productsWithStats: ProductWithStats[] = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        policyCount: policyCountByCode[p.code] ?? 0,
      })),
    [products, policyCountByCode]
  );

  const totalPoliciesLinked = useMemo(
    () => Object.values(policyCountByCode).reduce((a, b) => a + b, 0),
    [policyCountByCode]
  );

  const nextCode = products.length > 0 ? Math.max(...products.map((p) => p.code)) + 1 : 0;

  const columns: ColumnDef<ProductWithStats>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0"
          >
            Código
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
          <span className="font-medium">{row.original.code}</span>
        ),
      },
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
        cell: ({ row }) => row.original.name,
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
              onClick={() => handleEdit(row.original)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(row.original)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Deletar
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: productsWithStats,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = updater({ pagination });
      if (next.pagination) setPagination(next.pagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue || "").toLowerCase();
      if (!q) return true;
      const p = row.original;
      return (
        String(p.code).includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    },
  });

  const handleSave = async () => {
    if (!editedProduct.name?.trim()) {
      alert("Nome é obrigatório");
      return;
    }
    setIsSaving(true);
    try {
      if (selectedProduct) {
        await updateProduct({
          id: selectedProduct.id,
          data: editedProduct,
        });
        setIsEditing(false);
        setSelectedProduct(null);
      } else if (isCreating) {
        await createProduct(editedProduct);
        setIsCreating(false);
      }
      setEditedProduct({ code: nextCode, name: "" });
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: (typeof products)[0]) => {
    if (!confirm(`Tem certeza que deseja deletar o produto "${productDisplay(product)}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
        setIsEditing(false);
      }
    } catch (error) {
      alert(`Erro ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (product: ProductWithStats) => {
    setSelectedProduct(product);
    setIsEditing(true);
    setEditedProduct({ code: product.code, name: product.name });
    setIsCreating(false);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsCreating(true);
    setIsEditing(true);
    setEditedProduct({ code: nextCode, name: "" });
  };

  const handleCancel = () => {
    setSelectedProduct(null);
    setIsCreating(false);
    setIsEditing(false);
    setEditedProduct({ code: 0, name: "" });
  };

  const handleExport = () => {
    exportProductsToExcel(products, policyCountByCode);
  };

  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                  Produtos
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">
                  Gerencie os produtos de seguros
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={products.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              <Button
                onClick={handleCreateNew}
                className="shadow-lg hover:shadow-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{products.length}</p>
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
                  filtrado de {products.length} produtos
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
                placeholder="Buscar por código ou nome..."
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
                          <Package className="h-8 w-8 text-muted-foreground opacity-50 mb-4" />
                          <p className="text-muted-foreground font-medium">Nenhum produto encontrado</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Execute o SQL no Supabase para criar a tabela e inserir os produtos iniciais.
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

        <Dialog open={isEditing && (!!selectedProduct || isCreating)} onOpenChange={(open) => !open && handleCancel()}>
          <DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {isCreating ? "Novo Produto" : "Editar Produto"}
                </DialogTitle>
                <button onClick={handleCancel} className="rounded-lg p-2 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogHeader>
          <DialogContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Código</label>
                <Input
                  type="number"
                  min={0}
                  value={editedProduct.code}
                  onChange={(e) => setEditedProduct({ ...editedProduct, code: parseInt(e.target.value, 10) || 0 })}
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nome *</label>
                <Input
                  value={editedProduct.name}
                  onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                  placeholder="Ex: AUTOMÓVEL"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
