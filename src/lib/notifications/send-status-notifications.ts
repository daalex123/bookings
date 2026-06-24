import { createBusinessStatusNotifications } from "@/lib/notifications/in-app";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { sendBusinessWhatsApp } from "@/lib/notifications/whatsapp";
import { hasAdminClient } from "@/lib/supabase/admin";
import {
  loadBookingDetails,
  loadBusinessMemberUserIds,
} from "@/lib/notifications/appointment-details";

const BUSINESS_WHATSAPP_STATUSES = new Set(["confirmed", "cancelled"]);

export async function notifyAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<void> {
  if (!hasAdminClient()) return;
  if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return;
  }

  const details = await loadBookingDetails(appointmentId);
  if (!details) return;

  await createCustomerStatusNotification(
    details.customerId,
    details.businessId,
    details.appointmentId,
    details.businessName,
    details.serviceName,
    status
  );

  if (!BUSINESS_WHATSAPP_STATUSES.has(status)) return;

  const memberUserIds = await loadBusinessMemberUserIds(details.businessId);
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
