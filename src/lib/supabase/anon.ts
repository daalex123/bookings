import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Cookie-less client for public RPCs (safe inside unstable_cache). */
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
