import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LowStockItem } from "@/lib/dashboard/types";
import { AlertTriangle, PackageSearch } from "lucide-react";
import Link from "next/link";

interface LowStockListProps {
  items: LowStockItem[];
}

export function LowStockList({ items }: LowStockListProps) {
  return (
    <Card className="col-span-1 border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Estoque Baixo
        </CardTitle>
        <Link 
          href="/estoque" 
          className="text-xs text-primary hover:underline font-medium"
        >
          Ver tudo
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageSearch className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Estoque em dia!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none truncate max-w-[180px]">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mínimo: {item.low_stock_threshold} un
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-500">
                    {item.qty} un
                  </span>
                  <Badge variant="destructive" className="h-2 w-2 rounded-full p-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
