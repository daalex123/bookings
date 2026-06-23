import { asJoined } from "@/lib/utils";
import { sendEmail } from "@/lib/notifications/email";
import { createBusinessNotifications } from "@/lib/notifications/in-app";
import { createCustomerBookingNotification } from "@/lib/notifications/customer-in-app";
import { sendSms } from "@/lib/notifications/sms";
import {
  businessBookingEmail,
  businessBookingSms,
  customerConfirmationEmail,
  customerConfirmationSms,
  type BookingDetails,
} from "@/lib/notifications/templates";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { resolveBusinessNotificationEmails } from "@/lib/notifications/business-email";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants";

export async function sendBookingNotifications(
  appointmentId: string
): Promise<void> {
  if (!hasAdminClient()) {
    console.warn(
      "[notifications] SUPABASE_SERVICE_ROLE_KEY missing — skipping notifications"
    );
    return;
  }

  const admin = createAdminClient();

  const { data: appointment, error } = await admin
    .from("appointments")
    .select(
      `
      id,
      customer_id,
      start_at,
      end_at,
      notes,
      businesses ( id, name, slug, timezone, currency, contact_email ),
      services ( name, price, duration_minutes ),
      profiles ( full_name, phone )
    `
    )
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    console.error("[notifications] Appointment not found:", error?.message);
    return;
  }

  const business = asJoined(appointment.businesses);
  const service = asJoined(appointment.services);
  const profile = asJoined(appointment.profiles);

  if (!business || !service) return;

  const { data: customerAuth } = await admin.auth.admin.getUserById(
    appointment.customer_id
  );
  const customerEmail = customerAuth.user?.email ?? null;

  const details: BookingDetails = {
    appointmentId: appointment.id,
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    timezone: business.timezone ?? DEFAULT_TIMEZONE,
    currency: business.currency ?? DEFAULT_CURRENCY,
    serviceName: service.name,
    servicePrice: Number(service.price),
    durationMinutes: service.duration_minutes,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    notes: appointment.notes,
    customerName:
      profile?.full_name ?? customerEmail?.split("@")[0] ?? "Customer",
    customerEmail,
    customerPhone: profile?.phone ?? null,
  };

  const { data: members } = await admin
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", business.id)
    .in("role", ["owner", "admin", "staff"]);

  const memberUserIds = (members ?? []).map((m) => m.user_id);
  await Promise.all([
    createBusinessNotifications(details, memberUserIds),
    createCustomerBookingNotification(details, appointment.customer_id),
  ]);

  const businessEmailContent = businessBookingEmail(details);
  const customerEmailContent = customerConfirmationEmail(details);

  const businessEmails = await resolveBusinessNotificationEmails(
    admin,
    business.id,
    business.contact_email,
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

  const ownerAdminIds = (members ?? [])
    .filter((m) => m.role === "owner" || m.role === "admin")
    .map((m) => m.user_id);

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
