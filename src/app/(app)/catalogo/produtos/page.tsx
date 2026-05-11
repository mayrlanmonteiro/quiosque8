import type { Metadata } from "next";
import { createClient, getCachedAuthUser } from "@/lib/supabase/server";
import { ProductsClient } from "./_components/products-client";
import { getCachedUserData } from "@/lib/cache";

export const metadata: Metadata = { title: "Catálogo — Produtos" };

export default async function ProdutosPage() {
  const supabase = await createClient();
  const { user } = await getCachedAuthUser();

  if (!user) return null;

  // Usar o cache para evitar busca redundante do tenant_id (populado no layout)
  let userData = getCachedUserData(user.id);

  if (!userData) {
    const { data: member } = await supabase
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("active", true)
      .single();
    
    if (!member) return null;
    
    userData = { 
      tenantId: member.tenant_id, 
      userRole: member.role,
      userName: "",
      storeName: "" 
    };
  }

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        category:product_categories(id, name),
        inventory_balances(qty)
      `)
      .eq("tenant_id", userData.tenantId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("product_categories")
      .select("id, name")
      .eq("tenant_id", userData.tenantId)
      .order("name"),
  ]);

  return (
    <ProductsClient
      initialProducts={productsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      tenantId={userData.tenantId}
      userRole={userData.userRole}
    />
  );
}
