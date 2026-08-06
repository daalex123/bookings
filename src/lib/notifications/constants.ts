import type { NotificationAudience, NotificationType } from "@/types/database";

export const STAFF_NOTIFICATION_AUDIENCE: NotificationAudience = "staff";
export const CUSTOMER_NOTIFICATION_AUDIENCE: NotificationAudience = "customer";

/**
 * Resolve audience from row.
 * Realtime payloads may omit `audience` — return null so the client refetches
 * the full row. Do not infer from `type`: staff and customers both get
 * `booking_created` / `booking_confirmed` / `booking_cancelled`.
 */
export function resolveNotificationAudience(
  notification: Partial<
    Pick<
      { audience: NotificationAudience; type: NotificationType },
      "audience" | "type"
    >
  >
): NotificationAudience | null {
  if (notification.audience === STAFF_NOTIFICATION_AUDIENCE) {
    return STAFF_NOTIFICATION_AUDIENCE;
  }
  if (notification.audience === CUSTOMER_NOTIFICATION_AUDIENCE) {
    return CUSTOMER_NOTIFICATION_AUDIENCE;
  }
  return null;
}

export function isStaffNotification(
  notification: Partial<
    Pick<
      { audience: NotificationAudience; type: NotificationType },
      "audience" | "type"
    >
  >
): boolean {
  return resolveNotificationAudience(notification) === STAFF_NOTIFICATION_AUDIENCE;
}

export function isCustomerNotification(
  notification: Partial<
    Pick<
      { audience: NotificationAudience; type: NotificationType },
      "audience" | "type"
    >
  >
): boolean {
  return (
    resolveNotificationAudience(notification) === CUSTOMER_NOTIFICATION_AUDIENCE
  );
}
