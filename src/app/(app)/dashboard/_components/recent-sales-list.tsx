import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentSale } from "@/lib/dashboard/types";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ShoppingBag } from "lucide-react";

interface RecentSalesListProps {
  sales: RecentSale[];
}

export function RecentSalesList({ sales }: RecentSalesListProps) {
  return (
    <Card className="col-span-1 border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Últimas Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma venda encontrada no período.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {sale.customer_name ?? "Cliente Final"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(sale.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold">{formatCurrency(sale.total)}</span>
                  <Badge variant={sale.status === "pago" ? "default" : "secondary"} className="text-[10px] uppercase py-0 px-1">
                    {sale.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
