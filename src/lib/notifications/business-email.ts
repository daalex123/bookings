import type { SupabaseClient } from "@supabase/supabase-js";

type MemberRow = { user_id: string; role: string };

export async function resolveBusinessNotificationEmails(
  admin: SupabaseClient,
  businessId: string,
  contactEmail: string | null | undefined,
  members: MemberRow[]
): Promise<string[]> {
  const normalized = contactEmail?.trim().toLowerCase();
  if (normalized) {
    return [normalized];
  }

  const fallbackRoles = new Set(["owner", "admin"]);
  const emails = new Set<string>();

  for (const member of members) {
    if (!fallbackRoles.has(member.role)) continue;

    const { data: memberAuth } = await admin.auth.admin.getUserById(
      member.user_id
    );
    const email = memberAuth.user?.email?.trim().toLowerCase();
    if (email) emails.add(email);
  }

  if (emails.size === 0) {
    for (const member of members) {
      const { data: memberAuth } = await admin.auth.admin.getUserById(
        member.user_id
      );
      const email = memberAuth.user?.email?.trim().toLowerCase();
      if (email) emails.add(email);
    }
  }

  void businessId;
  return [...emails];
}
