import type { Database } from "@/types/database";
import type { BookingDetails } from "@/lib/notifications/templates";
import { STAFF_NOTIFICATION_AUDIENCE } from "@/lib/notifications/constants";
import { createAdminClient } from "@/lib/supabase/admin";

type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export async function createBusinessNotifications(
  details: BookingDetails,
  memberUserIds: string[]
): Promise<void> {
  if (memberUserIds.length === 0) return;

  const admin = createAdminClient();
  const title = `New booking: ${details.serviceName}`;
  const body = `${details.customerName} booked for ${details.serviceName}.`;

  const rows: NotificationInsert[] = memberUserIds.map((userId) => ({
    user_id: userId,
    business_id: details.businessId,
    appointment_id: details.appointmentId,
    type: "booking_created",
    audience: STAFF_NOTIFICATION_AUDIENCE,
    title,
    body,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications] In-app insert failed:", error.message);
  }
}

export async function createBusinessStatusNotifications(
  details: BookingDetails,
  memberUserIds: string[],
  status: "confirmed" | "cancelled"
): Promise<void> {
  if (memberUserIds.length === 0) return;

  const admin = createAdminClient();
  const title =
    status === "cancelled"
      ? `Booking cancelled: ${details.serviceName}`
      : `Booking confirmed: ${details.serviceName}`;
  const body =
    status === "cancelled"
      ? `${details.customerName} cancelled ${details.serviceName}.`
      : `${details.customerName}'s ${details.serviceName} appointment was confirmed.`;

  const rows: NotificationInsert[] = memberUserIds.map((userId) => ({
    user_id: userId,
    business_id: details.businessId,
    appointment_id: details.appointmentId,
    type: status === "cancelled" ? "booking_cancelled" : "booking_confirmed",
    audience: STAFF_NOTIFICATION_AUDIENCE,
    title,
    body,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications] In-app status insert failed:", error.message);
  }
}
