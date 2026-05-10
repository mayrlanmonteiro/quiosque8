import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics } from "@/lib/dashboard/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  metrics: DashboardMetrics;
  loading?: boolean;
}

export function KpiCards({ metrics, loading }: KpiCardsProps) {
  const cards = [
    {
      title: "Receita Total",
      value: formatCurrency(metrics.receita),
      icon: DollarSign,
      description: "Vendas pagas no período",
      color: "text-emerald-500",
    },
    {
      title: "Lucro Líquido",
      value: formatCurrency(metrics.lucro_liquido),
      icon: TrendingUp,
      description: "Após descontar COGS e despesas",
      color: metrics.lucro_liquido >= 0 ? "text-blue-500" : "text-red-500",
    },
    {
      title: "Despesas",
      value: formatCurrency(metrics.despesas),
      icon: TrendingDown,
      description: "Custos operacionais fixos e variáveis",
      color: "text-amber-500",
    },
    {
      title: "Pedidos Pagos",
      value: formatNumber(metrics.pedidos_pagos),
      icon: ShoppingCart,
      description: "Volume de vendas concluídas",
      color: "text-purple-500",
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(metrics.ticket_medio),
      icon: Percent,
      description: "Valor médio por venda",
      color: "text-pink-500",
    },
    {
      title: "Estoque Baixo",
      value: formatNumber(metrics.estoque_baixo_count),
      icon: Package,
      description: "Produtos abaixo do limite",
      color: metrics.estoque_baixo_count > 0 ? "text-red-500" : "text-emerald-500",
      alert: metrics.estoque_baixo_count > 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {card.title}
            </CardTitle>
            <card.icon className={cn("h-4 w-4", card.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
