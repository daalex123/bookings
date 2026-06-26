import { createBusinessStatusNotifications } from "@/lib/notifications/in-app";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { excludeUserIds } from "@/lib/notifications/recipients";
import { sendBusinessWhatsApp } from "@/lib/notifications/whatsapp";
import { hasAdminClient } from "@/lib/supabase/admin";
import {
  loadBookingDetails,
  loadBusinessMemberUserIds,
} from "@/lib/notifications/appointment-details";

const BUSINESS_WHATSAPP_STATUSES = new Set(["confirmed", "cancelled"]);

export type StatusNotificationOptions = {
  /** User who changed the status — excluded from staff alerts; skips customer alert when they are the customer. */
  actorUserId?: string;
};

export async function notifyAppointmentStatus(
  appointmentId: string,
  status: string,
  options: StatusNotificationOptions = {}
): Promise<void> {
  if (!hasAdminClient()) return;
  if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return;
  }

  const details = await loadBookingDetails(appointmentId);
  if (!details) return;

  const actorUserId = options.actorUserId;
  const customerTriggered = actorUserId === details.customerId;

  if (!customerTriggered) {
    await createCustomerStatusNotification(
      details.customerId,
      details.businessId,
      details.appointmentId,
      details.businessName,
      details.serviceName,
      status
    );
  }

  if (!BUSINESS_WHATSAPP_STATUSES.has(status)) return;

  const memberUserIds = excludeUserIds(
    await loadBusinessMemberUserIds(details.businessId),
    actorUserId
  );
  const businessStatus = status as "confirmed" | "cancelled";

  await createBusinessStatusNotifications(
    details,
    memberUserIds,
    businessStatus
  );

  if (!details.businessContactWhatsApp) return;

  await sendBusinessWhatsApp(details.businessContactWhatsApp, {
    type: status === "cancelled" ? "booking_cancelled" : "booking_confirmed",
    details,
  });
}
