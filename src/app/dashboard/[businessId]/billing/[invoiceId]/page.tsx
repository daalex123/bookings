import { notFound } from "next/navigation";
import { InvoiceComposer } from "@/components/dashboard/invoice-composer";
import {
  getBusinessCustomers,
  toCustomerOptions,
} from "@/lib/business-customers";
import { listInvoiceLinePresets } from "@/lib/invoices";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CURRENCY } from "@/lib/constants";

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ businessId: string; invoiceId: string }>;
}) {
  const { businessId, invoiceId } = await params;
  const supabase = await createClient();

  const [
    { data: invoice },
    { data: items },
    { data: business },
    { data: services },
    customersRaw,
    savedItems,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("business_id", businessId)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order"),
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

  if (!invoice) notFound();

  const customers = toCustomerOptions(customersRaw);

  return (
    <InvoiceComposer
      businessId={businessId}
      currency={business?.currency ?? invoice.currency ?? DEFAULT_CURRENCY}
      customers={customers}
      catalog={(services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        cost_price: Number((s as { cost_price?: number }).cost_price ?? 0),
      }))}
      savedItems={savedItems}
      mode="edit"
      invoice={{
        id: invoice.id,
        status: invoice.status,
        customer_id: invoice.customer_id,
        appointment_id: invoice.appointment_id,
        job_id: invoice.job_id,
        invoice_number: invoice.invoice_number,
        notes: invoice.notes,
        discount_amount: Number(invoice.discount_amount),
        amount_paid: Number(invoice.amount_paid),
        total: Number(invoice.total),
        customer_unique_key: invoice.customer_unique_key,
        customer_unique_key_label: invoice.customer_unique_key_label,
      }}
      initialLines={(items ?? []).map((item) => ({
        service_id: item.service_id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        cost_price: Number(item.cost_price),
        sort_order: item.sort_order,
      }))}
    />
  );
}
