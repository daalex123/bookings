import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_NOTIFICATION_TYPES } from "@/lib/notifications/constants";
import type { Notification } from "@/types/database";

export type NotificationQueryOptions = {
  businessId?: string;
  /** When true, only customer-facing types (excludes staff booking_created). */
  customerOnly?: boolean;
  limit?: number;
};

export async function getUserNotifications(
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<Notification[]> {
  const { businessId, customerOnly = false, limit = 15 } = options;
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

  if (customerOnly) {
    query = query.in("type", CUSTOMER_NOTIFICATION_TYPES);
  }

  const { data } = await query;
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationCount(
  userId: string,
  options: Omit<NotificationQueryOptions, "limit"> = {}
): Promise<number> {
  const { businessId, customerOnly = false } = options;
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  if (customerOnly) {
    query = query.in("type", CUSTOMER_NOTIFICATION_TYPES);
  }

  const { count } = await query;
  return count ?? 0;
}
