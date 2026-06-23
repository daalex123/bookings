import { asJoined } from "@/lib/utils";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import type { SupabaseClient } from "@supabase/supabase-js";

type AppointmentJoinRow = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  businesses: { name: string; slug: string } | { name: string; slug: string }[] | null;
  services: { name: string } | { name: string }[] | null;
};

export function mapCustomerAppointment(
  row: AppointmentJoinRow
): CustomerAppointmentItem {
  const business = asJoined(row.businesses);
  const service = asJoined(row.services);

  return {
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    created_at: row.created_at,
    status: row.status,
    notes: row.notes,
    business_name: business?.name ?? "Business",
    business_slug: business?.slug ?? "",
    service_name: service?.name ?? "Appointment",
  };
}

export async function fetchCustomerAppointment(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<CustomerAppointmentItem | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, created_at, status, notes,
      businesses ( name, slug ),
      services ( name )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;
  return mapCustomerAppointment(data as AppointmentJoinRow);
}
