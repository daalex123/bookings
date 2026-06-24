import { asJoined } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingDetails } from "@/lib/notifications/templates";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants";

export async function loadBookingDetails(
  appointmentId: string
): Promise<BookingDetails | null> {
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
      businesses ( id, name, slug, timezone, currency, contact_email, contact_whatsapp ),
      services ( name, price, duration_minutes ),
      profiles ( full_name, phone )
    `
    )
    .eq("id", appointmentId)
    .single();

  if (error || !appointment) {
    console.error("[notifications] Appointment not found:", error?.message);
    return null;
  }

  const business = asJoined(appointment.businesses);
  const service = asJoined(appointment.services);
  const profile = asJoined(appointment.profiles);

  if (!business || !service) return null;

  const { data: addonRows } = await admin
    .from("appointment_addons")
    .select("price, services ( name )")
    .eq("appointment_id", appointmentId);

  const addonNames: string[] = [];
  let addonTotal = 0;
  for (const row of addonRows ?? []) {
    const addonService = asJoined(row.services);
    if (addonService?.name) addonNames.push(addonService.name);
    addonTotal += Number(row.price);
  }

  const { data: customerAuth } = await admin.auth.admin.getUserById(
    appointment.customer_id
  );
  const customerEmail = customerAuth.user?.email ?? null;

  return {
    appointmentId: appointment.id,
    customerId: appointment.customer_id,
    businessId: business.id,
    businessName: business.name,
    businessSlug: business.slug,
    timezone: business.timezone ?? DEFAULT_TIMEZONE,
    currency: business.currency ?? DEFAULT_CURRENCY,
    serviceName: service.name,
    servicePrice: Number(service.price),
    addonNames,
    addonTotal,
    durationMinutes: service.duration_minutes,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    notes: appointment.notes,
    customerName:
      profile?.full_name ?? customerEmail?.split("@")[0] ?? "Customer",
    customerEmail,
    customerPhone: profile?.phone ?? null,
    businessContactEmail: business.contact_email ?? null,
    businessContactWhatsApp: business.contact_whatsapp ?? null,
  };
}

export async function loadBusinessMemberUserIds(
  businessId: string
): Promise<string[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", businessId)
    .in("role", ["owner", "admin", "staff"]);

  return (members ?? []).map((m) => m.user_id);
}

export async function loadOwnerAdminUserIds(
  businessId: string
): Promise<string[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("business_members")
    .select("user_id, role")
    .eq("business_id", businessId)
    .in("role", ["owner", "admin"]);

  return (members ?? []).map((m) => m.user_id);
}
