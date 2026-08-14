import { InvoiceComposer } from "@/components/dashboard/invoice-composer";
import {
  getBusinessCustomers,
  toCustomerOptions,
} from "@/lib/business-customers";
import { listInvoiceLinePresets } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/lib/constants";

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    jobId?: string;
    appointmentId?: string;
    customerId?: string;
  }>;
}) {
  const { businessId } = await params;
  const { jobId, appointmentId, customerId } = await searchParams;
  const supabase = await createClient();

  const [{ data: business }, { data: services }, customersRaw, savedItems] =
    await Promise.all([
      supabase.from("businesses").select("currency").eq("id", businessId).single(),
      supabase
        .from("services")
        .select("id, name, price, cost_price")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name"),
      getBusinessCustomers(supabase, businessId),
      listInvoiceLinePresets(businessId),
    ]);

  let prefCustomerId = customerId ?? "";
  let prefAppointmentId = appointmentId ?? null;
  let prefJobId = jobId ?? null;
  let initialLines: {
    service_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    cost_price?: number;
  }[] = [];

  if (jobId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_id, appointment_id")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (job) {
      prefCustomerId = job.customer_id;
      prefAppointmentId = job.appointment_id;
      prefJobId = job.id;
      const { buildLinesFromAppointment } = await import("@/lib/invoices");
      initialLines = await buildLinesFromAppointment(job.appointment_id);
    }
  } else if (appointmentId) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("id, customer_id")
      .eq("id", appointmentId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (appt) {
      prefCustomerId = appt.customer_id;
      prefAppointmentId = appt.id;
      const { buildLinesFromAppointment } = await import("@/lib/invoices");
      initialLines = await buildLinesFromAppointment(appt.id);
    }
  }

  const customers = toCustomerOptions(customersRaw);

  return (
    <InvoiceComposer
      businessId={businessId}
      currency={business?.currency ?? DEFAULT_CURRENCY}
      customers={customers}
      catalog={(services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        cost_price: Number((s as { cost_price?: number }).cost_price ?? 0),
      }))}
      savedItems={savedItems}
      mode="new"
      initialLines={initialLines}
      invoice={
        prefCustomerId || prefAppointmentId || prefJobId
          ? {
              id: "",
              status: "draft" as const,
              customer_id: prefCustomerId,
              appointment_id: prefAppointmentId,
              job_id: prefJobId,
              invoice_number: null,
              notes: null,
              discount_amount: 0,
              amount_paid: 0,
              total: 0,
            }
          : undefined
      }
    />
  );
}
