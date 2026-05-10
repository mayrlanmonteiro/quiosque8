import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DespesasClient } from "./_components/despesas-client";

export const metadata: Metadata = { title: "Despesas" };

export default async function DespesasPage() {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("active", true)
    .single();

  if (!member) return null;

  const [expensesResult, categoriesResult] = await Promise.all([
    supabase
      .from("expenses")
      .select(`id, date, amount, description, payment_method, recurring, created_at,
        category:expense_categories(id, name)`)
      .eq("tenant_id", member.tenant_id)
      .order("date", { ascending: false })
      .limit(300),
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("tenant_id", member.tenant_id)
      .order("name"),
  ]);

  return (
    <DespesasClient
      initialExpenses={expensesResult.data ?? []}
      categories={categoriesResult.data ?? []}
      tenantId={member.tenant_id}
      userRole={member.role}
    />
  );
}
