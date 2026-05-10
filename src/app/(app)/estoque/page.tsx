import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EstoqueClient } from "./_components/estoque-client";

export const metadata: Metadata = { title: "Estoque" };

export default async function EstoquePage() {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("active", true)
    .single();

  if (!member) return null;

  const [balancesResult, movementsResult] = await Promise.all([
    supabase
      .from("inventory_balances")
      .select(`
        product_id,
        qty,
        product:products!inner(id, name, sku, active, low_stock_threshold, cost, price,
          category:product_categories(name))
      `)
      .eq("product.tenant_id", member.tenant_id)
      .eq("product.active", true)
      .order("qty", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select(`
        id, type, qty, reason, created_at,
        product:products(name, sku),
        creator:profiles!created_by(name)
      `)
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <EstoqueClient
      balances={balancesResult.data ?? []}
      movements={movementsResult.data ?? []}
      tenantId={member.tenant_id}
      userRole={member.role}
    />
  );
}
