import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VendasClient } from "./_components/vendas-client";

export const metadata: Metadata = { title: "Vendas" };

export default async function VendasPage() {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("active", true)
    .single();

  if (!member) return null;

  const [salesResult, productsResult, customersResult] = await Promise.all([
    supabase
      .from("sales")
      .select(`
        id, status, subtotal, discount, total, paid_at, created_at,
        cancel_reason, canceled_at,
        customer:customers(id, name, phone),
        creator:profiles!created_by(name),
        sale_items(id, qty, price, discount, cost_snapshot,
          product:products(id, name, sku)),
        payments(id, method, amount)
      `)
      .eq("tenant_id", member.tenant_id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("products")
      .select(`id, name, sku, price, cost, inventory_balances(qty)`)
      .eq("tenant_id", member.tenant_id)
      .eq("active", true)
      .order("name")
      .limit(200),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("tenant_id", member.tenant_id)
      .order("name"),
  ]);

  return (
    <VendasClient
      initialSales={salesResult.data ?? []}
      products={productsResult.data ?? []}
      customers={customersResult.data ?? []}
      tenantId={member.tenant_id}
      userRole={member.role}
    />
  );
}
