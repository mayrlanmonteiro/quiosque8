import { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { DashboardSummary, SalesTimeseries, TopProduct } from "./types";

const CACHE_TTL = 60; // 60 segundos

export async function getDashboardSummary(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<DashboardSummary> {
  const cachedFn = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("get_dashboard_summary", {
        p_tenant_id: tenantId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) {
        console.error("Error fetching dashboard summary:", error);
        throw new Error(`Falha ao carregar o dashboard: ${error.message} (${error.code})`);
      }

      return data as DashboardSummary;
    },
    [`dashboard-summary-${tenantId}-${dateFrom}-${dateTo}`],
    { revalidate: CACHE_TTL }
  );

  return cachedFn();
}

export async function getSalesTimeseries(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<SalesTimeseries[]> {
  const cachedFn = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("get_sales_timeseries", {
        p_tenant_id: tenantId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) {
        console.error("Error fetching sales timeseries:", error);
        return [];
      }

      return data as SalesTimeseries[];
    },
    [`sales-timeseries-${tenantId}-${dateFrom}-${dateTo}`],
    { revalidate: CACHE_TTL }
  );

  return cachedFn();
}

export async function getTopProducts(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  limit: number = 5
): Promise<TopProduct[]> {
  const cachedFn = unstable_cache(
    async () => {
      const { data, error } = await supabase.rpc("get_top_products", {
        p_tenant_id: tenantId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_limit: limit,
      });

      if (error) {
        console.error("Error fetching top products:", error);
        return [];
      }

      return data as TopProduct[];
    },
    [`top-products-${tenantId}-${dateFrom}-${dateTo}-${limit}`],
    { revalidate: CACHE_TTL }
  );

  return cachedFn();
}
