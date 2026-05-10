"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const movementSchema = z.object({
  product_id: z.string().min(1, "Selecione um produto"),
  type: z.enum(["entrada", "saida", "ajuste"]),
  qty: z.coerce.number().min(0.001, "Quantidade deve ser positiva"),
  reason: z.string().min(3, "Informe um motivo"),
});

type MovementForm = z.infer<typeof movementSchema>;

interface Balance {
  product_id: string;
  qty: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    active: boolean;
    low_stock_threshold: number;
    cost: number;
    price: number;
    category: { name: string } | null;
  } | null;
}

interface Movement {
  id: string;
  type: string;
  qty: number;
  reason: string | null;
  created_at: string;
  product: { name: string; sku: string | null } | null;
  creator: { name: string } | null;
}

interface EstoqueClientProps {
  balances: Balance[];
  movements: Movement[];
  tenantId: string;
  userRole: UserRole;
}

export function EstoqueClient({ balances: initialBalances, movements: initialMovements, tenantId, userRole }: EstoqueClientProps) {
  const [balances, setBalances] = useState(initialBalances);
  const [movements, setMovements] = useState(initialMovements);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();
  const canEdit = ["admin", "gerente"].includes(userRole);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "entrada", qty: 1 },
  });

  const typeValue = watch("type");

  const filteredBalances = useMemo(() =>
    balances.filter((b) => {
      if (!b.product) return false;
      return (
        search === "" ||
        b.product.name.toLowerCase().includes(search.toLowerCase()) ||
        b.product.sku?.toLowerCase().includes(search.toLowerCase())
      );
    }),
    [balances, search]
  );

  // Summary stats
  const totalItens = balances.length;
  const totalBaixo = balances.filter((b) => b.qty <= (b.product?.low_stock_threshold ?? 5)).length;
  const totalValorCusto = balances.reduce((s, b) => s + Number(b.qty) * Number(b.product?.cost ?? 0), 0);
  const semEstoque = balances.filter((b) => b.qty <= 0).length;

  const onSubmit = async (data: MovementForm) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: result, error } = await supabase.rpc("add_inventory_movement", {
      p_tenant_id: tenantId,
      p_product_id: data.product_id,
      p_variant_id: null,
      p_type: data.type,
      p_qty: data.type === "saida" ? -Math.abs(data.qty) : Math.abs(data.qty),
      p_reason: data.reason,
      p_created_by: user?.id ?? null,
    });

    if (error) {
      toast.error("Erro ao registrar movimentação", { description: error.message });
      return;
    }

    toast.success("Movimentação registrada com sucesso!");

    // Atualizar saldo local
    const delta =
      data.type === "saida" ? -Math.abs(data.qty) :
      data.type === "ajuste" ? data.qty :
      Math.abs(data.qty);

    setBalances((prev) =>
      prev.map((b) =>
        b.product_id === data.product_id
          ? { ...b, qty: Number(b.qty) + delta }
          : b
      )
    );

    // Recarregar movimentos
    const { data: newMovements } = await supabase
      .from("inventory_movements")
      .select(`id, type, qty, reason, created_at, product:products(name, sku), creator:profiles!created_by(name)`)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (newMovements) setMovements(newMovements as unknown as Movement[]);
    setDialogOpen(false);
    reset();
  };

  const getMovementIcon = (type: string) => {
    if (type === "entrada") return <ArrowUpCircle className="h-4 w-4 text-emerald-500" />;
    if (type === "saida") return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
    return <RefreshCw className="h-4 w-4 text-blue-500" />;
  };

  const getMovementBadge = (type: string) => {
    if (type === "entrada") return <Badge variant="success">Entrada</Badge>;
    if (type === "saida") return <Badge variant="destructive">Saída</Badge>;
    return <Badge variant="info">Ajuste</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle de inventário e movimentações
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => { reset({ type: "entrada", qty: 1 }); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Movimentação
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Total de Itens", value: formatNumber(totalItens), desc: "produtos ativos", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
          { title: "Estoque Baixo", value: formatNumber(totalBaixo), desc: "abaixo do mínimo", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { title: "Sem Estoque", value: formatNumber(semEstoque), desc: "zerados ou negativos", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
          { title: "Valor em Custo", value: formatCurrency(totalValorCusto), desc: "valuation do estoque", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        ].map((s) => (
          <Card key={s.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className={`inline-flex rounded-lg p-2 ${s.bg} mb-3`}>
                <Warehouse className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="saldo">
        <TabsList className="mb-4">
          <TabsTrigger value="saldo">Saldo Atual</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="saldo">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead>Qtd. Atual</TableHead>
                    <TableHead className="hidden sm:table-cell">Mínimo</TableHead>
                    <TableHead className="hidden lg:table-cell">Valor (Custo)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBalances.map((b) => {
                      if (!b.product) return null;
                      const isLow = b.qty <= b.product.low_stock_threshold;
                      const isZero = b.qty <= 0;
                      return (
                        <TableRow key={b.product_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{b.product.name}</p>
                              {b.product.sku && (
                                <p className="text-xs text-muted-foreground font-mono">{b.product.sku}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {b.product.category ? (
                              <Badge variant="secondary">{b.product.category.name}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-lg font-bold ${isZero ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                              {formatNumber(b.qty)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {b.product.low_stock_threshold}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatCurrency(b.qty * b.product.cost)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isZero ? "destructive" : isLow ? "warning" : "success"}>
                              {isZero ? "Zerado" : isLow ? "Baixo" : "OK"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="hidden md:table-cell">Motivo</TableHead>
                    <TableHead className="hidden lg:table-cell">Operador</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhuma movimentação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(m.type)}
                            <span className="hidden sm:inline">{getMovementBadge(m.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{m.product?.name ?? "—"}</p>
                            {m.product?.sku && (
                              <p className="text-xs text-muted-foreground font-mono">{m.product.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${m.type === "saida" ? "text-red-600" : m.type === "entrada" ? "text-emerald-600" : "text-blue-600"}`}>
                            {m.type === "saida" ? "-" : "+"}{Math.abs(m.qty)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {m.reason ?? "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {m.creator?.name ?? "Sistema"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              Registre uma entrada, saída ou ajuste de inventário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select onValueChange={(v) => setValue("product_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar produto" />
                </SelectTrigger>
                <SelectContent>
                  {balances.map((b) => b.product && (
                    <SelectItem key={b.product_id} value={b.product_id}>
                      {b.product.name} — Estoque: {formatNumber(b.qty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && <p className="text-sm text-destructive">{errors.product_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={typeValue} onValueChange={(v) => setValue("type", v as "entrada" | "saida" | "ajuste")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">📦 Entrada (reposição)</SelectItem>
                  <SelectItem value="saida">📤 Saída (perda/uso)</SelectItem>
                  <SelectItem value="ajuste">🔧 Ajuste (inventário)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                placeholder={typeValue === "ajuste" ? "Novo saldo total" : "Quantidade"}
                {...register("qty")}
              />
              {errors.qty && <p className="text-sm text-destructive">{errors.qty.message}</p>}
              {typeValue === "ajuste" && (
                <p className="text-xs text-muted-foreground">Para ajuste, informe a quantidade a adicionar (positivo) ou remover (negativo)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea placeholder="Ex: Reposição de fornecedor, perda por avaria..." {...register("reason")} />
              {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={isSubmitting}>Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
