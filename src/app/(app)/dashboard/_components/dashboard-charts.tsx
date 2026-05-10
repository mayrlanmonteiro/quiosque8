"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailySale {
  date: string;
  total: number;
  count: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

export function DashboardCharts() {
  const [dailySales, setDailySales] = useState<DailySale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: member } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("active", true)
        .single();

      if (!member) return;

      const start = subDays(new Date(), 29);

      // Vendas por dia (últimos 30 dias)
      const { data: sales } = await supabase
        .from("sales")
        .select("total, created_at")
        .eq("tenant_id", member.tenant_id)
        .eq("status", "pago")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: true });

      // Construir série de 30 dias
      const days = eachDayOfInterval({ start, end: new Date() });
      const dailyMap: Record<string, DailySale> = {};
      days.forEach((d) => {
        const key = format(d, "dd/MM");
        dailyMap[key] = { date: key, total: 0, count: 0 };
      });

      (sales ?? []).forEach((s) => {
        const key = format(new Date(s.created_at), "dd/MM");
        if (dailyMap[key]) {
          dailyMap[key].total += Number(s.total);
          dailyMap[key].count += 1;
        }
      });

      setDailySales(Object.values(dailyMap));

      // Top 5 produtos vendidos no mês
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: items } = await supabase
        .from("sale_items")
        .select("qty, price, product:products!inner(name), sale:sales!inner(status, tenant_id, created_at)")
        .eq("sale.tenant_id", member.tenant_id)
        .eq("sale.status", "pago")
        .gte("sale.created_at", startOfMonth.toISOString());

      const productMap: Record<string, TopProduct> = {};
      (items ?? []).forEach((item: {
        qty: number;
        price: number;
        product: { name: string } | null;
      }) => {
        const name = (item.product as { name: string } | null)?.name ?? "Produto";
        if (!productMap[name]) {
          productMap[name] = { name, qty: 0, revenue: 0 };
        }
        productMap[name].qty += Number(item.qty);
        productMap[name].revenue += Number(item.qty) * Number(item.price);
      });

      const sorted = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopProducts(sorted);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  return (
    <Tabs defaultValue="vendas">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Análise de Vendas</CardTitle>
          <TabsList>
            <TabsTrigger value="vendas" className="text-xs">Últimos 30 dias</TabsTrigger>
            <TabsTrigger value="produtos" className="text-xs">Top Produtos</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="vendas">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailySales} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(220, 13%, 91%)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(262, 83%, 58%)"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="produtos">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "revenue" ? formatCurrency(value) : value,
                    name === "revenue" ? "Receita" : "Qtd",
                  ]}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(220, 13%, 91%)",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
