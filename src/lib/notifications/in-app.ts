import type { Database } from "@/types/database";
import type { BookingDetails } from "@/lib/notifications/templates";
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
    title,
    body,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications] In-app insert failed:", error.message);
  }
}
