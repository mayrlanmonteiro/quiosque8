import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RelatoriosClient } from "./_components/relatorios-client";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("active", true)
    .single();

  if (!member) return null;

  // We fetch a larger dataset here to allow client-side filtering and aggregation
  // For a real large-scale app, we'd use RPCs to aggregate on the server.
  const [salesResult, expensesResult, itemsResult] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, created_at, status")
      .eq("tenant_id", member.tenant_id)
      .eq("status", "pago")
      .gte("created_at", new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()),
    supabase
      .from("expenses")
      .select("id, amount, date, category:expense_categories(name)")
      .eq("tenant_id", member.tenant_id)
      .gte("date", new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]),
    supabase
      .from("sale_items")
      .select("qty, price, cost_snapshot, product:products(name, category:product_categories(name)), sale:sales!inner(status, tenant_id, created_at)")
      .eq("sale.tenant_id", member.tenant_id)
      .eq("sale.status", "pago")
      .gte("sale.created_at", new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString())
  ]);

  return (
    <RelatoriosClient
      sales={salesResult.data ?? []}
      expenses={expensesResult.data ?? []}
      items={itemsResult.data ?? []}
      tenantId={member.tenant_id}
    />
  );
}
