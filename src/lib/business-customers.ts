import type { SupabaseClient } from "@supabase/supabase-js";
import { asJoined } from "@/lib/utils";

export type BusinessCustomer = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
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
      [c.full_name, c.email, c.phone].filter(Boolean).join(" · ") || "Customer",
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
    return fromRpc;
  }

  const [fromAppointments, fromInvoices] = await Promise.all([
    customersFromAppointments(supabase, businessId),
    customersFromInvoices(supabase, businessId),
  ]);

  return mergeCustomers(fromRpc, fromAppointments, fromInvoices);
}
