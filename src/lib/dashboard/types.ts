export interface DashboardMetrics {
  receita: number;
  pedidos_pagos: number;
  ticket_medio: number;
  cogs: number;
  lucro_bruto: number;
  despesas: number;
  lucro_liquido: number;
  estoque_baixo_count: number;
}

export interface RecentSale {
  id: string;
  created_at: string;
  customer_name: string | null;
  total: number;
  status: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  qty: number;
  low_stock_threshold: number;
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  recent_sales: RecentSale[];
  low_stock_items: LowStockItem[];
}

export interface SalesTimeseries {
  date: string;
  revenue: number;
  orders_count: number;
}

export interface TopProduct {
  id: string;
  name: string;
  qty_sold: number;
  revenue: number;
  estimated_profit: number;
}
