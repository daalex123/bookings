import type { SupabaseClient } from "@supabase/supabase-js";
import { collectUniqueKeys, formatUniqueKey } from "@/lib/customer-unique-key";
import { asJoined } from "@/lib/utils";

export type BusinessCustomer = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  unique_keys?: string[];
};

export type BusinessCustomerOption = {
  id: string;
  label: string;
};

export function toCustomerOptions(
  customers: BusinessCustomer[]
): BusinessCustomerOption[] {
  return customers.map((c) => ({
    id: c.id,
    label:
      [c.full_name, ...(c.unique_keys ?? []), c.email, c.phone]
        .filter(Boolean)
        .join(" · ") || "Customer",
  }));
}

async function customersFromAppointments(
  supabase: SupabaseClient,
  businessId: string
): Promise<BusinessCustomer[]> {
  const { data: appointments } = await supabase
    .from("appointments")
    .select("customer_id, profiles ( full_name, phone )")
    .eq("business_id", businessId);

  const seen = new Map<string, BusinessCustomer>();

  for (const appt of appointments ?? []) {
    if (!appt.customer_id || seen.has(appt.customer_id)) continue;
    const profile = asJoined(appt.profiles);
    seen.set(appt.customer_id, {
      id: appt.customer_id,
      full_name: profile?.full_name ?? null,
      email: "",
      phone: profile?.phone ?? null,
    });
  }

  return Array.from(seen.values());
}

async function customersFromInvoices(
  supabase: SupabaseClient,
  businessId: string
): Promise<BusinessCustomer[]> {
  const { data: invoices } = await supabase
    .from("invoices")
    .select("customer_id, profiles ( full_name, phone )")
    .eq("business_id", businessId);

  const seen = new Map<string, BusinessCustomer>();

  for (const inv of invoices ?? []) {
    if (!inv.customer_id || seen.has(inv.customer_id)) continue;
    const profile = asJoined(inv.profiles);
    seen.set(inv.customer_id, {
      id: inv.customer_id,
      full_name: profile?.full_name ?? null,
      email: "",
      phone: profile?.phone ?? null,
    });
  }

  return Array.from(seen.values());
}

function mergeCustomers(
  ...lists: BusinessCustomer[][]
): BusinessCustomer[] {
  const byId = new Map<string, BusinessCustomer>();

  for (const list of lists) {
    for (const customer of list) {
      const existing = byId.get(customer.id);
      if (!existing) {
        byId.set(customer.id, customer);
        continue;
      }
      byId.set(customer.id, {
        id: customer.id,
        full_name: existing.full_name ?? customer.full_name,
        email: existing.email || customer.email,
        phone: existing.phone ?? customer.phone,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "")
  );
}

/** Customers who have booked with this business (RPC with appointment/invoice fallback). */
export async function getBusinessCustomers(
  supabase: SupabaseClient,
  businessId: string
): Promise<BusinessCustomer[]> {
  const { data, error } = await supabase.rpc("get_business_customer_directory", {
    p_business_id: businessId,
  });

  const fromRpc =
    !error && data ? (data as BusinessCustomer[]) : [];

  if (fromRpc.length > 0) {
    return attachUniqueKeys(supabase, businessId, fromRpc);
  }

  const [fromAppointments, fromInvoices] = await Promise.all([
    customersFromAppointments(supabase, businessId),
    customersFromInvoices(supabase, businessId),
  ]);

  return attachUniqueKeys(
    supabase,
    businessId,
    mergeCustomers(fromRpc, fromAppointments, fromInvoices)
  );
}

async function attachUniqueKeys(
  supabase: SupabaseClient,
  businessId: string,
  customers: BusinessCustomer[]
): Promise<BusinessCustomer[]> {
  const { data: business } = await supabase
    .from("businesses")
    .select("customer_unique_key_field, booking_custom_fields")
    .eq("id", businessId)
    .maybeSingle();
  if (!business?.customer_unique_key_field || customers.length === 0) {
    return customers;
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("customer_id, custom_fields")
    .eq("business_id", businessId);

  const byCustomer = new Map<string, string[]>();
  for (const appt of appointments ?? []) {
    const keys = collectUniqueKeys(
      [appt],
      business.customer_unique_key_field,
      business.booking_custom_fields
    );
    if (keys.length === 0) continue;
    const existing = byCustomer.get(appt.customer_id) ?? [];
    for (const key of keys) {
      const line = formatUniqueKey(key);
      if (line && !existing.includes(line)) existing.push(line);
    }
    byCustomer.set(appt.customer_id, existing);
  }

  return customers.map((customer) => ({
    ...customer,
    unique_keys: byCustomer.get(customer.id) ?? [],
  }));
}
