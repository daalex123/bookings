import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMER_NOTIFICATION_AUDIENCE,
  STAFF_NOTIFICATION_AUDIENCE,
} from "@/lib/notifications/constants";
import type { Notification, NotificationAudience } from "@/types/database";

export type NotificationQueryOptions = {
  businessId?: string;
  audience?: NotificationAudience;
  /** @deprecated Use `audience: "customer"` instead. */
  customerOnly?: boolean;
  limit?: number;
};

function resolveAudience(
  options: NotificationQueryOptions
): NotificationAudience | undefined {
  if (options.audience) return options.audience;
  if (options.customerOnly) return CUSTOMER_NOTIFICATION_AUDIENCE;
  return undefined;
}

export async function getUserNotifications(
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<Notification[]> {
  const { businessId, limit = 15 } = options;
  const audience = resolveAudience(options);
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  if (audience) {
    query = query.eq("audience", audience);
  }

  const { data } = await query;
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationCount(
  userId: string,
  options: Omit<NotificationQueryOptions, "limit"> = {}
): Promise<number> {
  const { businessId } = options;
  const audience = resolveAudience(options);
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  if (audience) {
    query = query.eq("audience", audience);
  }

  const { count } = await query;
  return count ?? 0;
}

export { STAFF_NOTIFICATION_AUDIENCE, CUSTOMER_NOTIFICATION_AUDIENCE };
