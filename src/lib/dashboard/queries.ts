import { SupabaseClient } from "@supabase/supabase-js";
import { DashboardSummary, SalesTimeseries, TopProduct } from "./types";

export async function getDashboardSummary(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<DashboardSummary> {
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
}

export async function getSalesTimeseries(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string
): Promise<SalesTimeseries[]> {
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
}

export async function getTopProducts(
  supabase: SupabaseClient,
  tenantId: string,
  dateFrom: string,
  dateTo: string,
  limit: number = 5
): Promise<TopProduct[]> {
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
}
