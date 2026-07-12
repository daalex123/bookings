import { asJoined, utcToLocalParts } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";

export type StoreAppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  service_id: string;
  service_name: string;
  addon_names: string[];
  customer_name: string;
  customer_phone: string | null;
  customer_label: string;
  date: string;
  time: string;
};

type RawAppointment = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  service_id: string;
  services: { name: string } | { name: string }[] | null;
  profiles:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
  appointment_addons?:
    | { services: { name: string } | { name: string }[] | null }[]
    | null;
};

export function normalizeStoreAppointments(
  appointments: RawAppointment[] | null | undefined,
  timezone: string
): StoreAppointmentRow[] {
  return (appointments ?? []).map((appt) => {
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
      addon_names: mapAddonNames(appt.appointment_addons),
      customer_name: customerName,
      customer_phone: profile?.phone ?? null,
      customer_label: profile?.phone
        ? `${customerName} · ${profile.phone}`
        : customerName,
      date: local.date,
      time: local.time,
    };
  });
}
