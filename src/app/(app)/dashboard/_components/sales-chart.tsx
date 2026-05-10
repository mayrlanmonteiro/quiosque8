"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesTimeseries } from "@/lib/dashboard/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid 
} from "recharts";

interface SalesChartProps {
  data: SalesTimeseries[];
}

export function SalesChart({ data }: SalesChartProps) {
  // Garantir que temos dados para renderizar
  const chartData = data.map(item => ({
    ...item,
    formattedDate: formatDate(item.date, "dd/MM"),
  }));

  return (
    <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Vendas por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem dados de vendas no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase text-muted-foreground">Data</span>
                              <span className="text-sm font-bold">{payload[0].payload.formattedDate}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase text-muted-foreground">Receita</span>
                              <span className="text-sm font-bold text-primary">{formatCurrency(payload[0].value as number)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
