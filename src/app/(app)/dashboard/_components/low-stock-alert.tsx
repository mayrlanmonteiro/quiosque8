"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface LowStockItem {
  product_id: string;
  product_name: string;
  qty: number;
  threshold: number;
}

export function LowStockAlert() {
  const [items, setItems] = useState<LowStockItem[]>([]);
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

      const { data } = await supabase
        .from("inventory_balances")
        .select(`
          product_id,
          qty,
          product:products!inner(name, low_stock_threshold, tenant_id, active)
        `)
        .eq("product.tenant_id", member.tenant_id)
        .eq("product.active", true);

      const lowStock = (data ?? [])
        .filter((b: {
          qty: number;
          product: { name: string; low_stock_threshold: number } | null;
        }) => {
          const threshold = (b.product as { name: string; low_stock_threshold: number } | null)?.low_stock_threshold ?? 5;
          return Number(b.qty) <= threshold;
        })
        .map((b: {
          product_id: string;
          qty: number;
          product: { name: string; low_stock_threshold: number } | null;
        }) => ({
          product_id: b.product_id,
          product_name: (b.product as { name: string; low_stock_threshold: number } | null)?.name ?? "Produto",
          qty: Number(b.qty),
          threshold: (b.product as { name: string; low_stock_threshold: number } | null)?.low_stock_threshold ?? 5,
        }))
        .sort((a: LowStockItem, b: LowStockItem) => a.qty - b.qty)
        .slice(0, 8);

      setItems(lowStock);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Estoque Baixo</CardTitle>
        </div>
        <Badge variant="warning">{items.length} itens</Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">Estoque normalizado!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os produtos estão acima do limite mínimo.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Mínimo: {item.threshold} un
                  </p>
                </div>
                <Badge
                  variant={item.qty === 0 ? "destructive" : "warning"}
                  className="ml-2 shrink-0"
                >
                  {item.qty} un
                </Badge>
              </div>
            ))}
            <Link href="/estoque" className="block mt-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Ver estoque completo
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
