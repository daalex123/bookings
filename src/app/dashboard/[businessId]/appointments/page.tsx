import {
  deleteAdminAppointment,
  updateAppointmentStatus,
  upsertAdminAppointment,
} from "@/lib/actions";
import { AppointmentsPanel } from "@/components/dashboard/appointments-panel";
import { createClient } from "@/lib/supabase/server";
import { asJoined, utcToLocalParts } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";
import { DEFAULT_TIMEZONE } from "@/lib/constants";

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ time?: string; id?: string }>;
}) {
  const { businessId } = await params;
  const { time, id: highlightAppointmentId } = await searchParams;
  const initialTimeFilter = time === "today" ? "today" : "all";
  const supabase = await createClient();

  const [
    { data: appointments },
    { data: services },
    { data: business },
    customerDirectory,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, start_at, end_at, created_at, status, notes, service_id, customer_id,
         services ( name ),
         profiles ( full_name, phone ),
         appointment_addons ( services ( name ) )`
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    supabase
      .from("services")
      .select("id, name, duration_minutes, is_active")
      .eq("business_id", businessId)
      .is("parent_service_id", null)
      .order("name"),
    supabase
      .from("businesses")
      .select("timezone")
      .eq("id", businessId)
      .single(),
    supabase.rpc("get_business_customer_directory", {
      p_business_id: businessId,
    }),
  ]);

  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;

  let customers: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
  }[] = [];

  if (!customerDirectory.error && customerDirectory.data) {
    customers = customerDirectory.data as typeof customers;
  } else if (appointments?.length) {
    const seen = new Set<string>();
    for (const appt of appointments) {
      const profile = asJoined(appt.profiles);
      if (!profile || !appt.customer_id) continue;
      if (seen.has(appt.customer_id)) continue;
      seen.add(appt.customer_id);
      customers.push({
        id: appt.customer_id,
        full_name: profile.full_name,
        email: "",
        phone: profile.phone,
      });
    }
  }

  const normalizedAppointments =
    appointments?.map((appt) => {
      const service = asJoined(appt.services);
      const profile = asJoined(appt.profiles);
      const local = utcToLocalParts(appt.start_at, timezone);
      const customerName = profile?.full_name ?? "Customer";

      return {
        id: appt.id,
        start_at: appt.start_at,
        end_at: appt.end_at,
        created_at: appt.created_at,
        status: appt.status,
        notes: appt.notes,
        service_id: appt.service_id,
        service_name: service?.name ?? "Service",
        addon_names: mapAddonNames(
          appt.appointment_addons as
            | { services: { name: string } | { name: string }[] | null }[]
            | null
        ),
        customer_name: customerName,
        customer_phone: profile?.phone ?? null,
        customer_label: profile?.phone
          ? `${customerName} · ${profile.phone}`
          : customerName,
        date: local.date,
        time: local.time,
      };
    }) ?? [];

  async function saveAppointment(formData: FormData) {
    "use server";
    return upsertAdminAppointment(businessId, formData);
  }

  async function removeAppointment(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (!id) return { error: "Missing appointment id" };
    return deleteAdminAppointment(businessId, id);
  }

  async function setStatus(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    const status = formData.get("status")?.toString();
    if (!id || !status) return { error: "Missing status update" };
    return updateAppointmentStatus(id, status, businessId);
  }

  return (
    <AppointmentsPanel
      appointments={normalizedAppointments}
      services={services ?? []}
      customers={customers}
      timezone={timezone}
      saveAction={saveAppointment}
      deleteAction={removeAppointment}
      statusAction={setStatus}
      initialTimeFilter={initialTimeFilter}
      highlightAppointmentId={highlightAppointmentId}
    />
  );
}
