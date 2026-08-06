import { asJoined, utcToLocalParts } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";
import type { StoreAppointmentRow } from "@/lib/store-appointments";
import { normalizeStoreAppointments } from "@/lib/store-appointments";
import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_APPOINTMENT_SELECT = `
  id, start_at, end_at, created_at, status, notes, custom_fields, service_id, customer_id,
  services ( name ),
  profiles ( full_name, phone ),
  appointment_addons ( services ( name ) )
`;

export async function fetchBusinessAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  timezone: string
): Promise<StoreAppointmentRow | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(BUSINESS_APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error || !data) return null;

  return normalizeStoreAppointments([data], timezone)[0] ?? null;
}

export async function fetchBusinessAppointments(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string
): Promise<StoreAppointmentRow[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(BUSINESS_APPOINTMENT_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return normalizeStoreAppointments(data, timezone);
}

/** Patch local/date fields when a realtime UPDATE payload has new times. */
export function patchStoreAppointmentTimes(
  existing: StoreAppointmentRow,
  row: {
    start_at: string;
    end_at: string;
    created_at: string;
    status: string;
    notes: string | null;
    custom_fields?: Record<string, unknown> | null;
    service_id?: string;
  },
  timezone: string
): StoreAppointmentRow {
  const local = utcToLocalParts(row.start_at, timezone);
  return {
    ...existing,
    start_at: row.start_at,
    end_at: row.end_at,
    created_at: row.created_at,
    status: row.status,
    notes: row.notes,
    custom_fields:
      row.custom_fields && typeof row.custom_fields === "object"
        ? row.custom_fields
        : existing.custom_fields,
    service_id: row.service_id ?? existing.service_id,
    date: local.date,
    time: local.time,
  };
}

export function sortStoreAppointments(
  items: StoreAppointmentRow[]
): StoreAppointmentRow[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function upsertStoreAppointment(
  items: StoreAppointmentRow[],
  next: StoreAppointmentRow
): StoreAppointmentRow[] {
  const without = items.filter((item) => item.id !== next.id);
  return sortStoreAppointments([next, ...without]);
}

export function hasMeaningfulAppointmentChange(
  previous: StoreAppointmentRow[],
  next: StoreAppointmentRow[]
): boolean {
  const previousMap = new Map(previous.map((item) => [item.id, item]));

  for (const item of next) {
    const existing = previousMap.get(item.id);
    if (!existing) return true;
    if (existing.status !== item.status) return true;
    if (existing.start_at !== item.start_at) return true;
    if (existing.service_id !== item.service_id) return true;
  }

  if (previous.length !== next.length) return true;
  return false;
}

/** Re-export for callers that only need joined name helpers. */
export { asJoined };
