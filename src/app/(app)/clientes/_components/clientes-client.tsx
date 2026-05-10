"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Users, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const customerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().max(2, "Use a sigla do estado (ex: PE)").optional(),
  notes: z.string().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

interface Customer {
  id: string; name: string; phone: string | null; email: string | null;
  city: string | null; state: string | null; notes: string | null; created_at: string;
  sales: { total: number; status: string }[];
}

interface ClientesClientProps {
  initialCustomers: Customer[]; tenantId: string; userRole: UserRole;
}

export function ClientesClient({ initialCustomers, tenantId, userRole }: ClientesClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const supabase = createClient();
  const canEdit = ["admin", "gerente"].includes(userRole);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  });

  const filtered = useMemo(() =>
    customers
      .filter((c) =>
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const totalA = a.sales.filter((s) => s.status === "pago").reduce((s, v) => s + Number(v.total), 0);
        const totalB = b.sales.filter((s) => s.status === "pago").reduce((s, v) => s + Number(v.total), 0);
        return totalB - totalA;
      }),
    [customers, search]
  );

  function openCreate() { setEditCustomer(null); reset({}); setDialogOpen(true); }
  function openEdit(c: Customer) {
    setEditCustomer(c);
    reset({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", city: c.city ?? "", state: c.state ?? "", notes: c.notes ?? "" });
    setDialogOpen(true);
  }

  const onSubmit = async (data: CustomerForm) => {
    const payload = {
      tenant_id: tenantId, name: data.name,
      phone: data.phone || null, email: data.email || null,
      city: data.city || null, state: data.state?.toUpperCase() || null,
      notes: data.notes || null,
    };

    if (editCustomer) {
      const { data: updated, error } = await supabase.from("customers").update(payload)
        .eq("id", editCustomer.id)
        .select(`id, name, phone, email, city, state, notes, created_at, sales:sales(total, status)`)
        .single();
      if (error) { toast.error("Erro ao atualizar cliente"); return; }
      setCustomers((prev) => prev.map((c) => c.id === editCustomer.id ? (updated as unknown as Customer) : c));
      toast.success("Cliente atualizado!");
    } else {
      const { data: created, error } = await supabase.from("customers").insert(payload)
        .select(`id, name, phone, email, city, state, notes, created_at, sales:sales(total, status)`)
        .single();
      if (error) { toast.error("Erro ao criar cliente"); return; }
      setCustomers((prev) => [created as unknown as Customer, ...prev]);
      toast.success("Cliente cadastrado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("customers").delete().eq("id", deleteId);
    if (error) { toast.error("Não é possível excluir um cliente com vendas"); return; }
    setCustomers((prev) => prev.filter((c) => c.id !== deleteId));
    toast.success("Cliente excluído");
    setDeleteId(null);
  };

  const totalSales = (c: Customer) =>
    c.sales.filter((s) => s.status === "pago").reduce((s, v) => s + Number(v.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} clientes</p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden lg:table-cell">Localização</TableHead>
                <TableHead>Total Compras</TableHead>
                <TableHead className="hidden sm:table-cell">Pedidos</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum cliente encontrado
                </TableCell></TableRow>
              ) : filtered.map((c, idx) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailCustomer(c)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{c.name}</p>
                          {idx < 3 && totalSales(c) > 0 && (
                            <Badge variant="warning" className="text-xs">🏆 Top {idx + 1}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Desde {formatDate(c.created_at)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {c.city && c.state ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}/{c.state}</span> : "—"}
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600">{formatCurrency(totalSales(c))}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary">{c.sales.filter((s) => s.status === "pago").length} vendas</Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>Cadastre informações do cliente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp/Telefone</Label>
                <Input placeholder="(81) 99999-0000" {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@exemplo.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="Recife" {...register("city")} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input placeholder="PE" maxLength={2} {...register("state")} className="uppercase" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Preferências, histórico..." {...register("notes")} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={isSubmitting}>{editCustomer ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={(o) => !o && setDetailCustomer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{detailCustomer?.name}</DialogTitle>
            <DialogDescription>Histórico de compras</DialogDescription>
          </DialogHeader>
          {detailCustomer && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Total gasto</span><p className="font-bold text-lg text-emerald-600">{formatCurrency(totalSales(detailCustomer))}</p></div>
                <div><span className="text-muted-foreground">Compras</span><p className="font-bold text-lg">{detailCustomer.sales.filter((s) => s.status === "pago").length}</p></div>
              </div>
              {detailCustomer.notes && (
                <div className="rounded-lg bg-muted p-3 text-sm"><p className="text-muted-foreground text-xs mb-1">Observações</p>{detailCustomer.notes}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>Clientes com vendas não podem ser excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
