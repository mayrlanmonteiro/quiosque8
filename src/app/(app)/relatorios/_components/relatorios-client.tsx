"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatoriosClientProps {
  sales: any[];
  expenses: any[];
  items: any[];
  tenantId: string;
}

const COLORS = ['hsl(262, 83%, 58%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(346, 87%, 43%)'];

export function RelatoriosClient({ sales, expenses, items }: RelatoriosClientProps) {
  const [period, setPeriod] = useState("6m"); // 3m, 6m, 12m, ytd

  const dateRange = useMemo(() => {
    const end = new Date();
    let start = new Date();
    if (period === "3m") start = subMonths(end, 2);
    else if (period === "6m") start = subMonths(end, 5);
    else if (period === "12m") start = subMonths(end, 11);
    else if (period === "ytd") start = new Date(end.getFullYear(), 0, 1);
    return { start: startOfMonth(start), end: endOfMonth(end) };
  }, [period]);

  // --- Fluxo de Caixa (Vendas vs Despesas) ---
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    const map: Record<string, { name: string; receitas: number; despesas: number; lucro: number }> = {};
    
    months.forEach(m => {
      const key = format(m, "MMM/yy", { locale: ptBR });
      map[key] = { name: key, receitas: 0, despesas: 0, lucro: 0 };
    });

    sales.forEach(s => {
      const d = new Date(s.created_at);
      if (isWithinInterval(d, dateRange)) {
        const key = format(d, "MMM/yy", { locale: ptBR });
        if (map[key]) map[key].receitas += Number(s.total);
      }
    });

    expenses.forEach(e => {
      const d = new Date(e.date + 'T12:00:00'); // Prevent timezone shift
      if (isWithinInterval(d, dateRange)) {
        const key = format(d, "MMM/yy", { locale: ptBR });
        if (map[key]) map[key].despesas += Number(e.amount);
      }
    });

    Object.values(map).forEach(m => m.lucro = m.receitas - m.despesas);
    return Object.values(map);
  }, [sales, expenses, dateRange]);

  // --- Produtos mais vendidos ---
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    items.forEach(i => {
      const d = new Date(i.sale.created_at);
      if (isWithinInterval(d, dateRange)) {
        const name = i.product?.name ?? "Desconhecido";
        if (!map[name]) map[name] = { name, value: 0 };
        map[name].value += Number(i.qty) * Number(i.price);
      }
    });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [items, dateRange]);

  // --- Despesas por Categoria ---
  const expensesByCategory = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    expenses.forEach(e => {
      const d = new Date(e.date + 'T12:00:00');
      if (isWithinInterval(d, dateRange)) {
        const name = e.category?.name ?? "Sem categoria";
        if (!map[name]) map[name] = { name, value: 0 };
        map[name].value += Number(e.amount);
      }
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [expenses, dateRange]);

  const totalReceitas = monthlyData.reduce((s, m) => s + m.receitas, 0);
  const totalDespesas = monthlyData.reduce((s, m) => s + m.despesas, 0);
  const totalLucro = totalReceitas - totalDespesas;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground text-sm mt-1">Análise financeira e desempenho</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="6m">Últimos 6 meses</SelectItem>
            <SelectItem value="ytd">Neste ano (YTD)</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceitas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Totais</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Líquido</CardTitle>
          </CardHeader>
          <CardContent><div className={`text-2xl font-bold ${totalLucro >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(totalLucro)}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Caixa (Receitas vs Despesas)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} cursor={{ fill: 'hsl(220, 14%, 96%)' }} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(346, 87%, 43%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos por Faturamento</CardTitle>
            <CardDescription>Produtos que geraram mais receita no período.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {topProducts.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>Distribuição dos gastos operacionais.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {expensesByCategory.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
