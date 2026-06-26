import type { NotificationAudience, NotificationType } from "@/types/database";

export const STAFF_NOTIFICATION_AUDIENCE: NotificationAudience = "staff";
export const CUSTOMER_NOTIFICATION_AUDIENCE: NotificationAudience = "customer";

/** Resolve audience from row; realtime payloads may omit `audience` on first event. */
export function resolveNotificationAudience(
  notification: Partial<Pick<{ audience: NotificationAudience; type: NotificationType }, "audience" | "type">>
): NotificationAudience | null {
  if (notification.audience) return notification.audience;
  if (notification.type === "booking_created") return STAFF_NOTIFICATION_AUDIENCE;
  return null;
}

export function isStaffNotification(
  notification: Partial<Pick<{ audience: NotificationAudience; type: NotificationType }, "audience" | "type">>
): boolean {
  return resolveNotificationAudience(notification) === STAFF_NOTIFICATION_AUDIENCE;
}

export function isCustomerNotification(
  notification: Partial<Pick<{ audience: NotificationAudience; type: NotificationType }, "audience" | "type">>
): boolean {
  return resolveNotificationAudience(notification) === CUSTOMER_NOTIFICATION_AUDIENCE;
}
