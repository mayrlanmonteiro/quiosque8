"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Filter, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Preço inválido"),
  cost: z.coerce.number().min(0, "Custo inválido"),
  category_id: z.string().optional(),
  active: z.boolean().default(true),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
});

type ProductForm = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  cost: number;
  active: boolean;
  low_stock_threshold: number;
  category: { id: string; name: string } | null;
  inventory_balances: { qty: number }[];
}

interface Category {
  id: string;
  name: string;
}

interface ProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
  tenantId: string;
  userRole: UserRole;
}

const ITEMS_PER_PAGE = 20;

export function ProductsClient({
  initialProducts,
  categories,
  tenantId,
  userRole,
}: ProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const supabase = createClient();

  const canEdit = ["admin", "gerente"].includes(userRole);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { active: true, low_stock_threshold: 5, cost: 0 },
  });

  const activeValue = watch("active");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCategory === "all" || p.category?.id === filterCategory;
      const matchActive =
        filterActive === "all" ||
        (filterActive === "ativo" ? p.active : !p.active);
      return matchSearch && matchCat && matchActive;
    });
  }, [products, search, filterCategory, filterActive]);

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  function openCreate() {
    setEditProduct(null);
    reset({ active: true, low_stock_threshold: 5, cost: 0 });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    reset({
      name: p.name,
      description: p.description ?? "",
      sku: p.sku ?? "",
      price: p.price,
      cost: p.cost,
      category_id: p.category?.id ?? "",
      active: p.active,
      low_stock_threshold: p.low_stock_threshold,
    });
    setDialogOpen(true);
  }

  const onSubmit = async (data: ProductForm) => {
    if (editProduct) {
      const { data: updated, error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description || null,
          sku: data.sku || null,
          price: data.price,
          cost: data.cost,
          category_id: data.category_id || null,
          active: data.active,
          low_stock_threshold: data.low_stock_threshold,
        })
        .eq("id", editProduct.id)
        .select(`*, category:product_categories(id, name), inventory_balances(qty)`)
        .single();

      if (error) {
        toast.error("Erro ao atualizar produto", { description: error.message });
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === editProduct.id ? (updated as unknown as Product) : p))
      );
      toast.success("Produto atualizado com sucesso!");
    } else {
      const { data: created, error } = await supabase
        .from("products")
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description || null,
          sku: data.sku || null,
          price: data.price,
          cost: data.cost,
          category_id: data.category_id || null,
          active: data.active,
          low_stock_threshold: data.low_stock_threshold,
        })
        .select(`*, category:product_categories(id, name), inventory_balances(qty)`)
        .single();

      if (error) {
        toast.error("Erro ao criar produto", { description: error.message });
        return;
      }
      setProducts((prev) => [created as unknown as Product, ...prev]);
      toast.success("Produto criado com sucesso!");
    }

    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false })
      .eq("id", deleteId);

    if (error) {
      toast.error("Erro ao desativar produto");
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === deleteId ? { ...p, active: false } : p))
    );
    toast.success("Produto desativado");
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} produtos encontrados
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={(v) => { setFilterActive(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground text-sm mt-2">
                {search || filterCategory !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece adicionando seu primeiro produto"}
              </p>
              {canEdit && !search && filterCategory === "all" && (
                <Button onClick={openCreate} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Produto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead className="hidden sm:table-cell">Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((product) => {
                  const stock = product.inventory_balances?.[0]?.qty ?? 0;
                  const isLowStock = stock <= product.low_stock_threshold;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {product.category ? (
                          <Badge variant="secondary">{product.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{formatCurrency(product.price)}</p>
                          <p className="text-xs text-muted-foreground">
                            Custo: {formatCurrency(product.cost)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={
                            stock === 0
                              ? "destructive"
                              : isLowStock
                              ? "warning"
                              : "success"
                          }
                        >
                          {stock} un
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "success" : "secondary"}>
                          {product.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(product)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {userRole === "admin" && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteId(product.id)}
                                title="Desativar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              Preencha as informações do produto abaixo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Nome do produto" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" placeholder="Descrição do produto" {...register("description")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" placeholder="Código SKU" {...register("sku")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select
                  onValueChange={(v) => setValue("category_id", v)}
                  defaultValue={editProduct?.category?.id ?? ""}
                >
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço de Venda (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register("price")}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Custo (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register("cost")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold">Estoque Mínimo</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  min="0"
                  step="1"
                  {...register("low_stock_threshold")}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="active"
                  checked={activeValue}
                  onCheckedChange={(v) => setValue("active", v)}
                />
                <Label htmlFor="active">
                  {activeValue ? "Produto ativo" : "Produto inativo"}
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editProduct ? "Salvar alterações" : "Criar produto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto será marcado como inativo e não aparecerá nas vendas.
              Esta ação pode ser revertida editando o produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Sim, desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
