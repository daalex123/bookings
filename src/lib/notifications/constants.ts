import type { NotificationType } from "@/types/database";

export const CUSTOMER_NOTIFICATION_TYPES: NotificationType[] = [
  "booking_confirmed",
  "booking_cancelled",
];

export function isCustomerNotification(
  notification: Pick<{ type: string }, "type">
): boolean {
  return CUSTOMER_NOTIFICATION_TYPES.includes(
    notification.type as NotificationType
  );
}
