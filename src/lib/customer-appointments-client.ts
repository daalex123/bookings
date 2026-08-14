import { asJoined } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";
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
  appointment_addons?:
    | { services: { name: string } | { name: string }[] | null }[]
    | null;
  jobs?:
    | {
        status: string;
        job_number?: string | null;
        next_service_visible?: boolean | null;
        next_service_name?: string | null;
        next_service_due_on?: string | null;
        next_service_notes?: string | null;
        invoices?:
          | { status: string; invoice_number: string | null }[]
          | { status: string; invoice_number: string | null }
          | null;
      }[]
    | {
        status: string;
        job_number?: string | null;
        next_service_visible?: boolean | null;
        next_service_name?: string | null;
        next_service_due_on?: string | null;
        next_service_notes?: string | null;
        invoices?:
          | { status: string; invoice_number: string | null }[]
          | { status: string; invoice_number: string | null }
          | null;
      }
    | null;
};

export function mapCustomerAppointment(
  row: AppointmentJoinRow
): CustomerAppointmentItem {
  const business = asJoined(row.businesses);
  const service = asJoined(row.services);
  const job = asJoined(row.jobs);
  const invoices = job?.invoices
    ? Array.isArray(job.invoices)
      ? job.invoices
      : [job.invoices]
    : [];
  const invoice =
    invoices.find((i) => i.status === "issued" || i.status === "paid") ??
    invoices[0] ??
    null;

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
    addon_names: mapAddonNames(row.appointment_addons),
    job_status: job?.status ?? null,
    job_number: job?.job_number ?? null,
    invoice_status: invoice?.status ?? null,
    invoice_number: invoice?.invoice_number ?? null,
    next_service_name: job?.next_service_visible
      ? job.next_service_name ?? null
      : null,
    next_service_due_on: job?.next_service_visible
      ? job.next_service_due_on ?? null
      : null,
    next_service_notes: job?.next_service_visible
      ? job.next_service_notes ?? null
      : null,
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
      services ( name ),
      appointment_addons ( services ( name ) ),
      jobs ( status, job_number, next_service_visible, next_service_name, next_service_due_on, next_service_notes, invoices ( status, invoice_number ) )
    `
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;
  return mapCustomerAppointment(data as AppointmentJoinRow);
}
