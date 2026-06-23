import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Deduped per-request user fetch (avoids repeated network calls in layout + page). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  // getSession reads the auth cookie locally; getUser hits the Auth API every time.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});

export const isSuperAdmin = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("current_user_is_super_admin");
  if (error) return false;
  return data === true;
});

export const userIsBusinessMember = cache(async (userId: string) => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("business_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
});

export const canAccessAdminDashboard = cache(async (userId: string) => {
  if (await isSuperAdmin()) return true;
  return userIsBusinessMember(userId);
});

export const userCanAccessBusiness = cache(
  async (userId: string, businessId: string) => {
    if (await isSuperAdmin()) return true;

    const supabase = await createClient();
    const { count } = await supabase
      .from("business_members")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("user_id", userId);

    return (count ?? 0) > 0;
  }
);

export const getProfileName = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.full_name ?? null;
});
