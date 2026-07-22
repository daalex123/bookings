import { createBusinessStatusNotifications } from "@/lib/notifications/in-app";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { excludeUserIds } from "@/lib/notifications/recipients";
import { sendBusinessAdminSms, sendSms } from "@/lib/notifications/sms";
import { toE164 } from "@/lib/notifications/phone-e164";
import { businessStatusSms, customerStatusSms } from "@/lib/notifications/templates";
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
const CUSTOMER_SMS_STATUSES = new Set(["confirmed", "cancelled"]);

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

  const siteUrl = await getSiteUrl();
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

    if (CUSTOMER_SMS_STATUSES.has(status) && details.customerPhone) {
      await sendSms(
        details.customerPhone,
        customerStatusSms(details, status as "confirmed" | "cancelled", siteUrl)
      );
    }
  }

  const ownerAdminIds = excludeUserIds(
    await loadOwnerAdminUserIds(details.businessId),
    actorUserId
  );

  const admin = createAdminClient();
  const recipients = new Set<string>();

  if (details.businessContactWhatsApp) {
    const e164 = toE164(details.businessContactWhatsApp);
    if (e164) recipients.add(e164);
  }

  if (ownerAdminIds.length > 0) {
    const { data: ownerProfiles } = await admin
      .from("profiles")
      .select("id, phone")
      .in("id", ownerAdminIds);

    for (const profile of ownerProfiles ?? []) {
      if (!profile.phone) continue;
      const e164 = toE164(profile.phone);
      if (e164) recipients.add(e164);
    }
  }

  if (recipients.size > 0) {
    const businessStatus = status as
      | "confirmed"
      | "cancelled"
      | "completed"
      | "no_show";

    const message = businessStatusSms(details, businessStatus, siteUrl);

    await Promise.all(
      Array.from(recipients).map((to) => sendBusinessAdminSms(to, message))
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
