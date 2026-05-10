import { redirect } from "next/navigation";
import { createClient, getCachedAuthUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getCachedUserData, setCachedUserData } from "@/lib/cache";

async function fetchUserData(userId: string) {
  const supabase = await createClient();

  const [profileResult, memberResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("tenant_members")
      .select("role, tenant_id")
      .eq("user_id", userId)
      .eq("active", true)
      .single(),
  ]);

  let storeName = "Quiosque8";
  
  if (memberResult.data?.tenant_id) {
    const settingsResult = await supabase
      .from("tenant_settings")
      .select("store_name")
      .eq("tenant_id", memberResult.data.tenant_id)
      .single();
      
    if (settingsResult.data?.store_name) {
      storeName = settingsResult.data.store_name;
    }
  }

  return {
    userId,
    userName: profileResult.data?.name ?? userId.slice(0, 8),
    userRole: memberResult.data?.role ?? "operador",
    tenantId: memberResult.data?.tenant_id ?? "",
    storeName,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  let userData = getCachedUserData(user.id);
  
  if (!userData) {
    userData = await fetchUserData(user.id);
    setCachedUserData(user.id, userData);
  }

  return (
    <AppShell 
      userName={userData.userName} 
      userRole={userData.userRole} 
      storeName={userData.storeName}
    >
      {children}
    </AppShell>
  );
}