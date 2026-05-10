import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ClientesClient } from "./_components/clientes-client";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("active", true)
    .single();

  if (!member) return null;

  // Clientes com total de compras
  const { data: customers } = await supabase
    .from("customers")
    .select(`
      id, name, phone, email, city, state, notes, created_at,
      sales:sales(total, status)
    `)
    .eq("tenant_id", member.tenant_id)
    .order("name");

  return (
    <ClientesClient
      initialCustomers={customers ?? []}
      tenantId={member.tenant_id}
      userRole={member.role}
    />
  );
}
