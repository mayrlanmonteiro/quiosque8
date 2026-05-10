import type { Metadata } from "next";
import { createClient, getCachedAuthUser } from "@/lib/supabase/server";
import { getCachedUserData } from "@/lib/cache";
import { ConfiguracoesClient } from "./_components/configuracoes-client";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const { user } = await getCachedAuthUser();
  if (!user) return null;

  const userData = getCachedUserData(user.id);
  if (!userData) return null;

  const [settingsResult, profileResult, membersResult] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", userData.tenantId)
      .single(),
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("tenant_members")
      .select("id, role, active, created_at, profile:profiles(name, user_id)")
      .eq("tenant_id", userData.tenantId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ConfiguracoesClient
      settings={settingsResult.data}
      profile={profileResult.data}
      members={membersResult.data ?? []}
      tenantId={userData.tenantId}
      userRole={userData.userRole}
      userId={user.id}
    />
  );
}
