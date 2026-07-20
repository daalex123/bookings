import { createBusinessStatusNotifications } from "@/lib/notifications/in-app";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { excludeUserIds } from "@/lib/notifications/recipients";
import { sendBusinessWhatsApp } from "@/lib/notifications/whatsapp";
import { sendOneSignalPush } from "@/lib/push/onesignal/send-push";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";
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

    const siteUrl = await getSiteUrl();
    const customerTitle =
      status === "cancelled"
        ? `Booking cancelled: ${details.serviceName}`
        : status === "confirmed"
          ? `Booking confirmed: ${details.serviceName}`
          : `Appointment update: ${details.serviceName}`;
    const customerBody =
      status === "cancelled"
        ? `Your ${details.serviceName} appointment at ${details.businessName} was cancelled.`
        : status === "confirmed"
          ? `Your ${details.serviceName} appointment at ${details.businessName} is confirmed.`
          : `Your ${details.serviceName} appointment status is now ${status.replace("_", " ")}.`;

    await sendOneSignalPush({
      userIds: [details.customerId],
      title: customerTitle,
      body: customerBody,
      url: absoluteUrl(siteUrl, "/my-appointments"),
    });
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

  const siteUrl = await getSiteUrl();
  const staffTitle =
    status === "cancelled"
      ? `Booking cancelled: ${details.serviceName}`
      : `Booking confirmed: ${details.serviceName}`;
  const staffBody =
    status === "cancelled"
      ? `${details.customerName} cancelled ${details.serviceName}.`
      : `${details.customerName}'s ${details.serviceName} appointment was confirmed.`;

  await sendOneSignalPush({
    userIds: memberUserIds,
    title: staffTitle,
    body: staffBody,
    url: absoluteUrl(
      siteUrl,
      `/dashboard/${details.businessId}/appointments?id=${details.appointmentId}`
    ),
  });

  if (!details.businessContactWhatsApp) return;

  await sendBusinessWhatsApp(details.businessContactWhatsApp, {
    type: status === "cancelled" ? "booking_cancelled" : "booking_confirmed",
    details,
  });
}
