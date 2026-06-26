import type { BookingDetails } from "@/lib/notifications/templates";
import { formatBookingTimeRange } from "@/lib/notifications/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationType } from "@/types/database";
import { CUSTOMER_NOTIFICATION_AUDIENCE } from "@/lib/notifications/constants";

export async function createUserNotifications(
  rows: {
    user_id: string;
    business_id: string;
    appointment_id: string;
    type: NotificationType;
    audience: typeof CUSTOMER_NOTIFICATION_AUDIENCE;
    title: string;
    body: string;
  }[]
): Promise<void> {
  if (rows.length === 0) return;

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(rows);
  if (error) {
    console.error("[notifications] User notification insert failed:", error.message);
  }
}

export async function createCustomerBookingNotification(
  details: BookingDetails,
  customerId: string
): Promise<void> {
  const when = formatBookingTimeRange(details);
  await createUserNotifications([
    {
      user_id: customerId,
      business_id: details.businessId,
      appointment_id: details.appointmentId,
      type: "booking_confirmed",
      audience: CUSTOMER_NOTIFICATION_AUDIENCE,
      title: `Booking confirmed at ${details.businessName}`,
      body: `${details.serviceName} · ${when}`,
    },
  ]);
}

export async function createCustomerStatusNotification(
  customerId: string,
  businessId: string,
  appointmentId: string,
  businessName: string,
  serviceName: string,
  status: string
): Promise<void> {
  const labels: Record<string, { type: NotificationType; title: string; body: string }> = {
    confirmed: {
      type: "booking_confirmed",
      title: `Appointment confirmed`,
      body: `${serviceName} at ${businessName} is confirmed.`,
    },
    cancelled: {
      type: "booking_cancelled",
      title: `Appointment cancelled`,
      body: `${serviceName} at ${businessName} was cancelled.`,
    },
    completed: {
      type: "booking_confirmed",
      title: `Appointment completed`,
      body: `${serviceName} at ${businessName} is marked completed.`,
    },
    no_show: {
      type: "booking_cancelled",
      title: `Appointment missed`,
      body: `${serviceName} at ${businessName} was marked no-show.`,
    },
  };

  const message = labels[status];
  if (!message) return;

  await createUserNotifications([
    {
      user_id: customerId,
      business_id: businessId,
      appointment_id: appointmentId,
      type: message.type,
      audience: CUSTOMER_NOTIFICATION_AUDIENCE,
      title: message.title,
      body: message.body,
    },
  ]);
}
