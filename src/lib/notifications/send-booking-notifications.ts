import { createBusinessNotifications } from "@/lib/notifications/in-app";
import { createCustomerBookingNotification } from "@/lib/notifications/customer-in-app";
import { excludeUserIds } from "@/lib/notifications/recipients";
import { sendEmail } from "@/lib/notifications/email";
import { sendBusinessAdminSms, sendSms } from "@/lib/notifications/sms";
import { toE164 } from "@/lib/notifications/phone-e164";
import { sendBusinessWhatsApp, isWhatsAppConfigured } from "@/lib/notifications/whatsapp";
import {
  businessBookingEmail,
  businessBookingSms,
  customerConfirmationEmail,
  customerConfirmationSms,
} from "@/lib/notifications/templates";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { resolveBusinessNotificationEmails } from "@/lib/notifications/business-email";
import { getSiteUrl } from "@/lib/site-url";
import {
  loadBookingDetails,
  loadBusinessMemberUserIds,
  loadOwnerAdminUserIds,
} from "@/lib/notifications/appointment-details";

export type BookingNotificationOptions = {
  /** User who performed the booking action — excluded from staff alerts. */
  actorUserId?: string;
};

export async function sendBookingNotifications(
  appointmentId: string,
  options: BookingNotificationOptions = {}
): Promise<void> {
  if (!hasAdminClient()) {
    console.warn(
      "[notifications] SUPABASE_SERVICE_ROLE_KEY missing on server — skipping notifications. " +
      "Add it in Vercel → Project → Settings → Environment Variables."
    );
    return;
  }

  if (!isWhatsAppConfigured()) {
    console.warn(
      "[notifications] WhatsApp not configured on server — email/in-app may still work. " +
      "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on Vercel."
    );
  }

  const details = await loadBookingDetails(appointmentId);
  if (!details) return;

  const siteUrl = await getSiteUrl();

  const memberUserIds = excludeUserIds(
    await loadBusinessMemberUserIds(details.businessId),
    details.customerId,
    options.actorUserId
  );

  await Promise.all([
    createBusinessNotifications(details, memberUserIds),
    createCustomerBookingNotification(details, details.customerId),
  ]);

  const businessEmailContent = businessBookingEmail(details);
  const customerEmailContent = customerConfirmationEmail(details);

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", details.businessId)
    .in("role", ["owner", "admin", "staff"]);

  const businessEmails = await resolveBusinessNotificationEmails(
    admin,
    details.businessId,
    details.businessContactEmail,
    members ?? []
  );

  const tasks: Promise<boolean>[] = [];

  for (const to of businessEmails) {
    tasks.push(
      sendEmail({
        to,
        subject: businessEmailContent.subject,
        html: businessEmailContent.html,
        text: businessEmailContent.text,
      })
    );
  }

  if (details.customerEmail) {
    tasks.push(
      sendEmail({
        to: details.customerEmail,
        subject: customerEmailContent.subject,
        html: customerEmailContent.html,
        text: customerEmailContent.text,
      })
    );
  }

  if (details.customerPhone) {
    tasks.push(
      sendSms(details.customerPhone, customerConfirmationSms(details, siteUrl))
    );
  }

  if (details.businessContactWhatsApp) {
    tasks.push(
      sendBusinessWhatsApp(details.businessContactWhatsApp, {
        type: "new_booking",
        details,
      }).then((ok) => {
        if (!ok) {
          console.warn(
            "[notifications] WhatsApp not delivered to",
            details.businessContactWhatsApp
          );
        }
        return ok;
      })
    );
  } else {
    console.warn(
      "[notifications] No business WhatsApp number — set Dashboard → Settings → Business WhatsApp"
    );
  }

  const ownerAdminIds = await loadOwnerAdminUserIds(details.businessId);
  const adminRecipients = new Set<string>();

  if (details.businessContactWhatsApp) {
    const e164 = toE164(details.businessContactWhatsApp);
    if (e164) adminRecipients.add(e164);
  }

  if (ownerAdminIds.length > 0) {
    const { data: ownerProfiles } = await admin
      .from("profiles")
      .select("id, phone")
      .in("id", ownerAdminIds);

    for (const ownerProfile of ownerProfiles ?? []) {
      if (!ownerProfile.phone) continue;
      const e164 = toE164(ownerProfile.phone);
      if (e164) adminRecipients.add(e164);
    }
  }

  if (adminRecipients.size > 0) {
    const message = businessBookingSms(details, siteUrl);
    for (const to of adminRecipients) {
      tasks.push(sendBusinessAdminSms(to, message));
    }
  }

  await Promise.all(tasks);
}
