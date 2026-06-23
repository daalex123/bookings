import { asJoined } from "@/lib/utils";
import { createCustomerStatusNotification } from "@/lib/notifications/customer-in-app";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export async function notifyCustomerAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<void> {
  if (!hasAdminClient()) return;
  if (!["confirmed", "cancelled", "completed", "no_show"].includes(status)) {
    return;
  }

  const admin = createAdminClient();
  const { data: appointment } = await admin
    .from("appointments")
    .select(
      `
      id,
      customer_id,
      business_id,
      businesses ( name ),
      services ( name )
    `
    )
    .eq("id", appointmentId)
    .single();

  if (!appointment) return;

  const business = asJoined(appointment.businesses);
  const service = asJoined(appointment.services);
  if (!business || !service) return;

  await createCustomerStatusNotification(
    appointment.customer_id,
    appointment.business_id,
    appointment.id,
    business.name,
    service.name,
    status
  );
}
