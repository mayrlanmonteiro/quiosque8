"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Receipt, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const expenseSchema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  description: z.string().min(3, "Descrição muito curta"),
  category_id: z.string().optional(),
  payment_method: z.string().optional(),
  recurring: z.boolean().default(false),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

interface Expense {
  id: string; date: string; amount: number; description: string;
  payment_method: string | null; recurring: boolean; created_at: string;
  category: { id: string; name: string } | null;
}
interface Category { id: string; name: string }

interface DespesasClientProps {
  initialExpenses: Expense[]; categories: Category[];
  tenantId: string; userRole: UserRole;
}

const PAYMENT_METHODS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência", "Outros"];

export function DespesasClient({ initialExpenses, categories, tenantId, userRole }: DespesasClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const supabase = createClient();
  const canEdit = ["admin", "gerente"].includes(userRole);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0], recurring: false },
  });
  const recurringValue = watch("recurring");

  const filtered = useMemo(() =>
    expenses.filter((e) => {
      const matchSearch = search === "" || e.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || e.category?.id === filterCategory;
      const matchMonth = !filterMonth || e.date.startsWith(filterMonth);
      return matchSearch && matchCat && matchMonth;
    }), [expenses, search, filterCategory, filterMonth]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

  function openCreate() {
    setEditExpense(null);
    reset({ date: new Date().toISOString().split("T")[0], recurring: false });
    setDialogOpen(true);
  }

  function openEdit(e: Expense) {
    setEditExpense(e);
    reset({
      date: e.date, amount: e.amount, description: e.description,
      category_id: e.category?.id ?? "", payment_method: e.payment_method ?? "",
      recurring: e.recurring,
    });
    setDialogOpen(true);
  }

  const onSubmit = async (data: ExpenseForm) => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      tenant_id: tenantId,
      date: data.date, amount: data.amount, description: data.description,
      category_id: data.category_id || null,
      payment_method: data.payment_method || null,
      recurring: data.recurring,
      created_by: user?.id ?? null,
    };

    if (editExpense) {
      const { data: updated, error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editExpense.id)
        .select(`id, date, amount, description, payment_method, recurring, created_at, category:expense_categories(id, name)`)
        .single();
      if (error) { toast.error("Erro ao atualizar despesa", { description: error.message }); return; }
      setExpenses((prev) => prev.map((e) => e.id === editExpense.id ? (updated as unknown as Expense) : e));
      toast.success("Despesa atualizada!");
    } else {
      const { data: created, error } = await supabase
        .from("expenses")
        .insert(payload)
        .select(`id, date, amount, description, payment_method, recurring, created_at, category:expense_categories(id, name)`)
        .single();
      if (error) { toast.error("Erro ao criar despesa", { description: error.message }); return; }
      setExpenses((prev) => [created as unknown as Expense, ...prev]);
      toast.success("Despesa registrada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("expenses").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir despesa"); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
    toast.success("Despesa excluída");
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Total no período: <strong className="text-foreground">{formatCurrency(totalFiltered)}</strong>
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Despesa
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-44" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
                <TableHead className="hidden lg:table-cell">Recorrente</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhuma despesa encontrada
                </TableCell></TableRow>
              ) : filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(e.date)}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{e.description}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.category ? <Badge variant="secondary">{e.category.name}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="font-bold text-red-600">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{e.payment_method ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {e.recurring ? <Badge variant="info"><RefreshCw className="h-3 w-3 mr-1" />Recorrente</Badge> : "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(e)} title="Editar">
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editExpense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            <DialogDescription>Registre gastos e despesas operacionais.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" {...register("date")} />
                {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...register("amount")} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Aluguel do mês, energia..." {...register("description")} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select onValueChange={(v) => setValue("category_id", v)} defaultValue={editExpense?.category?.id ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select onValueChange={(v) => setValue("payment_method", v)} defaultValue={editExpense?.payment_method ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="recurring" checked={recurringValue} onCheckedChange={(v) => setValue("recurring", v)} />
              <Label htmlFor="recurring">Despesa recorrente (mensal)</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={isSubmitting}>{editExpense ? "Salvar" : "Registrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
