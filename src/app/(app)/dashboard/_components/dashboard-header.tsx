"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar } from "lucide-react";
import { DatePreset } from "@/lib/dashboard/date-utils";
import { useState } from "react";

export function DashboardHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const currentPreset = (searchParams.get("preset") as DatePreset) || "last30days";
  const currentFrom = searchParams.get("from") || "";
  const currentTo = searchParams.get("to") || "";

  const updateFilter = (preset: string, from?: string, to?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", preset);
    if (from) params.set("from", from);
    else params.delete("from");
    if (to) params.set("to", to);
    else params.delete("to");
    
    router.push(`?${params.toString()}`);
  };

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo ao Quiosque8. Aqui está o resumo do seu negócio.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-card border border-border/50 rounded-lg p-1">
          <Select 
            value={currentPreset} 
            onValueChange={(value) => updateFilter(value)}
          >
            <SelectTrigger className="w-[180px] border-0 focus:ring-0">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="last30days">Últimos 30 dias</SelectItem>
              <SelectItem value="thisMonth">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {currentPreset === "custom" && (
            <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-right-2">
              <input 
                type="date" 
                className="bg-transparent text-xs outline-none" 
                value={currentFrom}
                onChange={(e) => updateFilter("custom", e.target.value, currentTo)}
              />
              <span className="text-muted-foreground text-xs">até</span>
              <input 
                type="date" 
                className="bg-transparent text-xs outline-none" 
                value={currentTo}
                onChange={(e) => updateFilter("custom", currentFrom, e.target.value)}
              />
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleRefresh}
          disabled={loading}
          className="border-border/50"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>
    </div>
  );
}
