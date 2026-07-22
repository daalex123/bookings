import { createBusinessStatusNotifications } from "@/lib/notifications/in-app";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { excludeUserIds } from "@/lib/notifications/recipients";
import { sendBusinessAdminSms } from "@/lib/notifications/sms";
import { businessStatusSms } from "@/lib/notifications/templates";
import { sendBusinessWhatsApp } from "@/lib/notifications/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  loadBookingDetails,
  loadBusinessMemberUserIds,
  loadOwnerAdminUserIds,
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

  const ownerAdminIds = excludeUserIds(
    await loadOwnerAdminUserIds(details.businessId),
    actorUserId
  );
  if (ownerAdminIds.length > 0) {
    const admin = createAdminClient();
    const { data: ownerProfiles } = await admin
      .from("profiles")
      .select("id, phone")
      .in("id", ownerAdminIds);

    const businessStatus = status as
      | "confirmed"
      | "cancelled"
      | "completed"
      | "no_show";

    const siteUrl = await getSiteUrl();

    await Promise.all(
      (ownerProfiles ?? [])
        .filter((profile) => Boolean(profile.phone))
        .map((profile) =>
          sendBusinessAdminSms(
            profile.phone as string,
            businessStatusSms(details, businessStatus, siteUrl)
          )
        )
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
