import { sendEmail } from "@/lib/notifications/email";
import { createBusinessNotifications } from "@/lib/notifications/in-app";
import { createCustomerBookingNotification } from "@/lib/notifications/customer-in-app";
import { sendSms } from "@/lib/notifications/sms";
import { sendBusinessWhatsApp, isWhatsAppConfigured } from "@/lib/notifications/whatsapp";
import {
  businessBookingEmail,
  businessBookingSms,
  customerConfirmationEmail,
  customerConfirmationSms,
} from "@/lib/notifications/templates";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { resolveBusinessNotificationEmails } from "@/lib/notifications/business-email";
import {
  loadBookingDetails,
  loadBusinessMemberUserIds,
  loadOwnerAdminUserIds,
} from "@/lib/notifications/appointment-details";

export async function sendBookingNotifications(
  appointmentId: string
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

  const memberUserIds = await loadBusinessMemberUserIds(details.businessId);
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
      sendSms(details.customerPhone, customerConfirmationSms(details))
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
  if (ownerAdminIds.length > 0) {
    const { data: ownerProfiles } = await admin
      .from("profiles")
      .select("id, phone")
      .in("id", ownerAdminIds);

    for (const ownerProfile of ownerProfiles ?? []) {
      if (ownerProfile.phone) {
        tasks.push(sendSms(ownerProfile.phone, businessBookingSms(details)));
      }
    }
  }

  await Promise.all(tasks);
}
