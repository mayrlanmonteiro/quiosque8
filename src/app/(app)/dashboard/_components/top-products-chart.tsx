"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopProduct } from "@/lib/dashboard/types";
import { formatCurrency } from "@/lib/format";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  Cell 
} from "recharts";

interface TopProductsChartProps {
  data: TopProduct[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--primary) / 0.8)",
    "hsl(var(--primary) / 0.6)",
    "hsl(var(--primary) / 0.4)",
    "hsl(var(--primary) / 0.2)",
  ];

  return (
    <Card className="col-span-1 border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top 5 Produtos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem vendas para ranquear produtos.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as TopProduct;
                      return (
                        <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                          <p className="text-xs font-bold mb-1">{item.name}</p>
                          <div className="grid grid-cols-2 gap-x-4 text-[10px]">
                            <span className="text-muted-foreground">Receita:</span>
                            <span className="font-medium text-right">{formatCurrency(item.revenue)}</span>
                            <span className="text-muted-foreground">Qtd Sold:</span>
                            <span className="font-medium text-right">{item.qty_sold}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
