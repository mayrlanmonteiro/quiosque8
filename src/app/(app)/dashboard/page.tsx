import { Metadata } from "next";
import { createClient, getCachedAuthUser } from "@/lib/supabase/server";
import { DashboardHeader } from "./_components/dashboard-header";
import { KpiCards } from "./_components/kpi-cards";
import { SalesChart } from "./_components/sales-chart";
import { TopProductsChart } from "./_components/top-products-chart";
import { LowStockList } from "./_components/low-stock-list";
import { RecentSalesList } from "./_components/recent-sales-list";
import { getDashboardSummary, getSalesTimeseries, getTopProducts } from "@/lib/dashboard/queries";
import { getDateRange, DatePreset } from "@/lib/dashboard/date-utils";
import { getCachedUserData } from "@/lib/cache";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Dashboard — Quiosque8",
  description: "Visão geral do seu negócio Quiosque8",
};

interface DashboardPageProps {
  searchParams: {
    preset?: string;
    from?: string;
    to?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const { user } = await getCachedAuthUser();

  if (!user) return null;

  // Obter tenant_id via cache ou banco
  let userData = getCachedUserData(user.id);
  if (!userData) {
    const { data: member } = await supabase
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("active", true)
      .single();
    
    if (!member) return null;
    userData = { tenantId: member.tenant_id, userRole: member.role, userName: "", storeName: "" };
  }

  // Calcular datas baseadas no filtro
  const { from, to } = getDateRange(
    (searchParams.preset as DatePreset) || "last30days",
    searchParams.from,
    searchParams.to
  );

  // Buscar todos os dados em paralelo (Server Side)
  const [summary, timeseries, topProducts] = await Promise.all([
    getDashboardSummary(supabase, userData.tenantId, from, to),
    getSalesTimeseries(supabase, userData.tenantId, from, to),
    getTopProducts(supabase, userData.tenantId, from, to),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <DashboardHeader />

      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards metrics={summary.metrics} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <SalesChart data={timeseries} />
        <TopProductsChart data={topProducts} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RecentSalesList sales={summary.recent_sales} />
        <LowStockList items={summary.low_stock_items} />
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  );
}
