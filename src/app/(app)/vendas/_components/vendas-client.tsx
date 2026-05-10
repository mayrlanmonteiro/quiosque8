"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, ShoppingCart, X, Trash2, Receipt, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */
interface Product {
  id: string; name: string; sku: string | null;
  price: number; cost: number;
  inventory_balances: { qty: number }[];
}
interface Customer { id: string; name: string; phone: string | null }
interface SaleItem {
  product_id: string; product_name: string; qty: number;
  price: number; discount: number; cost: number;
}
interface Payment { method: string; amount: number }
interface Sale {
  id: string; status: string; subtotal: number; discount: number;
  total: number; paid_at: string | null; created_at: string;
  cancel_reason: string | null; canceled_at: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  creator: { name: string } | null;
  sale_items: { id: string; qty: number; price: number; discount: number; cost_snapshot: number; product: { id: string; name: string; sku: string | null } | null }[];
  payments: { id: string; method: string; amount: number }[];
}

interface VendasClientProps {
  initialSales: Sale[]; products: Product[]; customers: Customer[];
  tenantId: string; userRole: UserRole;
}

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "💵 Dinheiro" },
  { value: "pix", label: "📱 Pix" },
  { value: "cartao", label: "💳 Cartão" },
  { value: "outros", label: "🔄 Outros" },
];

export function VendasClient({ initialSales, products, customers, tenantId, userRole }: VendasClientProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ method: "dinheiro", amount: 0 }]);
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [productSearchQ, setProductSearchQ] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const filtered = useMemo(() =>
    sales.filter((s) => {
      const matchSearch = search === "" || s.customer?.name?.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchSearch && matchStatus;
    }), [sales, search, filterStatus]);

  const cartSubtotal = cartItems.reduce((s, i) => s + (i.price * i.qty) - i.discount, 0);
  const cartTotal = Math.max(cartSubtotal - saleDiscount, 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  function addToCart(product: Product) {
    const existing = cartItems.find((i) => i.product_id === product.id);
    if (existing) {
      setCartItems((prev) => prev.map((i) => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCartItems((prev) => [...prev, {
        product_id: product.id, product_name: product.name,
        qty: 1, price: product.price, discount: 0, cost: product.cost,
      }]);
    }
    setPayments([{ method: "dinheiro", amount: cartTotal + product.price }]);
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) return removeFromCart(productId);
    setCartItems((prev) => prev.map((i) => i.product_id === productId ? { ...i, qty } : i));
  }

  async function handleCreateSale() {
    if (cartItems.length === 0) { toast.error("Adicione ao menos um item"); return; }
    if (Math.abs(totalPaid - cartTotal) > 0.01) {
      toast.error("Valor pago não confere com o total", { description: `Total: ${formatCurrency(cartTotal)} | Pago: ${formatCurrency(totalPaid)}` });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const items = cartItems.map((i) => ({
      product_id: i.product_id, variant_id: null,
      qty: i.qty, price: i.price, discount: i.discount, cost_snapshot: i.cost,
    }));

    const { data: saleId, error } = await supabase.rpc("create_sale", {
      p_tenant_id: tenantId,
      p_customer_id: selectedCustomerId || null,
      p_items: items,
      p_payments: payments,
      p_discount: saleDiscount,
      p_created_by: user?.id ?? "",
    });

    if (error) {
      toast.error("Erro ao registrar venda", { description: error.message });
      setSubmitting(false);
      return;
    }

    toast.success("Venda registrada com sucesso!");

    // Reload sales
    const { data: newSales } = await supabase
      .from("sales")
      .select(`id, status, subtotal, discount, total, paid_at, created_at, cancel_reason, canceled_at, customer:customers(id, name, phone), creator:profiles!created_by(name), sale_items(id, qty, price, discount, cost_snapshot, product:products(id, name, sku)), payments(id, method, amount)`)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (newSales) setSales(newSales as unknown as Sale[]);
    setNewSaleOpen(false);
    setCartItems([]); setPayments([{ method: "dinheiro", amount: 0 }]);
    setSaleDiscount(0); setSelectedCustomerId("");
    setSubmitting(false);
  }

  async function handleCancel() {
    if (!cancelId || !cancelReason.trim()) { toast.error("Informe o motivo do cancelamento"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.rpc("cancel_sale", {
      p_tenant_id: tenantId, p_sale_id: cancelId,
      p_reason: cancelReason, p_canceled_by: user?.id ?? "",
    });
    if (error) { toast.error("Erro ao cancelar venda", { description: error.message }); return; }
    setSales((prev) => prev.map((s) => s.id === cancelId ? { ...s, status: "cancelado", cancel_reason: cancelReason, canceled_at: new Date().toISOString() } : s));
    toast.success("Venda cancelada e estoque estornado");
    setCancelId(null); setCancelReason("");
  }

  const statusBadge = (status: string) => {
    if (status === "pago") return <Badge variant="success">Pago</Badge>;
    if (status === "pendente") return <Badge variant="warning">Pendente</Badge>;
    return <Badge variant="destructive">Cancelado</Badge>;
  };

  const filteredProducts = products.filter((p) =>
    productSearchQ === "" ||
    p.name.toLowerCase().includes(productSearchQ.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchQ.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} vendas encontradas</p>
        </div>
        <Button onClick={() => setNewSaleOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Venda
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhuma venda encontrada
                </TableCell></TableRow>
              ) : filtered.map((sale) => (
                <TableRow key={sale.id} className="cursor-pointer" onClick={() => setDetailSale(sale)}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(sale.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.customer?.name ?? "Consumidor Final"}
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(sale.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sale.payments.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs capitalize">{p.method}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(sale.status)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {sale.status === "pago" && ["admin", "gerente"].includes(userRole) && (
                      <Button
                        variant="ghost" size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelId(sale.id)}
                        title="Cancelar venda"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Nova Venda Dialog ── */}
      <Dialog open={newSaleOpen} onOpenChange={setNewSaleOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
            <DialogDescription>Adicione produtos e registre o pagamento.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Product search */}
            <div className="space-y-3">
              <Label>Produtos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." value={productSearchQ} onChange={(e) => setProductSearchQ(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {filteredProducts.map((p) => {
                  const stock = p.inventory_balances?.[0]?.qty ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={stock <= 0}
                      className="w-full flex items-center justify-between rounded-lg p-2.5 text-sm text-left hover:bg-accent transition-colors disabled:opacity-40"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(p.price)} · estoque: {stock}</p>
                      </div>
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Customer */}
              <div className="space-y-2 pt-2">
                <Label>Cliente (opcional)</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Consumidor final" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Consumidor final</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Cart + Payment */}
            <div className="space-y-3">
              <Label>Carrinho</Label>
              {cartItems.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum item adicionado
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" onClick={() => updateCartQty(item.product_id, item.qty - 1)}>-</Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <Button variant="outline" size="icon-sm" onClick={() => updateCartQty(item.product_id, item.qty + 1)}>+</Button>
                      </div>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeFromCart(item.product_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Desconto geral */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0">Desconto geral (R$)</Label>
                <Input type="number" min="0" step="0.01" value={saleDiscount}
                  onChange={(e) => setSaleDiscount(Number(e.target.value))} className="w-28" />
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
                {saleDiscount > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatCurrency(saleDiscount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-border pt-1 mt-1"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label>Pagamento</Label>
                {payments.map((pay, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={pay.method} onValueChange={(v) => setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, method: v } : p))}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="number" step="0.01" min="0" value={pay.amount}
                      onChange={(e) => setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, amount: Number(e.target.value) } : p))}
                      className="w-28" />
                    {payments.length > 1 && (
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setPayments((prev) => [...prev, { method: "pix", amount: 0 }])}>
                  + Adicionar forma de pagamento
                </Button>

                {Math.abs(totalPaid - cartTotal) > 0.01 && cartTotal > 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠ Diferença: {formatCurrency(Math.abs(totalPaid - cartTotal))}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setNewSaleOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateSale} loading={submitting} className="gap-2">
              <CheckCircle className="h-4 w-4" /> Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale Detail Dialog */}
      <Dialog open={!!detailSale} onOpenChange={(o) => !o && setDetailSale(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
            <DialogDescription>ID: {detailSale?.id}</DialogDescription>
          </DialogHeader>
          {detailSale && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {statusBadge(detailSale.status)}
                <span className="text-sm text-muted-foreground">{formatDateTime(detailSale.created_at)}</span>
              </div>
              {detailSale.customer && (
                <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <strong>{detailSale.customer.name}</strong></p>
              )}
              <div className="border border-border rounded-lg divide-y divide-border">
                {detailSale.sale_items.map((item) => (
                  <div key={item.id} className="flex justify-between p-3 text-sm">
                    <span>{item.product?.name} × {item.qty}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.qty - item.discount)}</span>
                  </div>
                ))}
              </div>
              <div className="text-sm space-y-1">
                {detailSale.discount > 0 && <div className="flex justify-between text-red-600"><span>Desconto</span><span>-{formatCurrency(detailSale.discount)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(detailSale.total)}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {detailSale.payments.map((p, i) => (
                  <Badge key={i} variant="outline" className="capitalize">{p.method}: {formatCurrency(p.amount)}</Badge>
                ))}
              </div>
              {detailSale.cancel_reason && (
                <p className="text-sm text-destructive">Cancelado: {detailSale.cancel_reason}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
            <AlertDialogDescription>
              O estoque será estornado automaticamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Motivo do cancelamento *</Label>
            <Textarea className="mt-2" placeholder="Informe o motivo..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Confirmar cancelamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
