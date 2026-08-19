import { notFound } from "next/navigation";
import { DocumentChrome } from "@/components/print/document-chrome";
import { DocumentPreviewBar } from "@/components/print/document-preview-bar";
import { InvoiceDocumentBody } from "@/components/print/invoice-document-body";
import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";
import { resolveUniqueKey, formatUniqueKey } from "@/lib/customer-unique-key";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ businessId: string; invoiceId: string }>;
}) {
  const { businessId, invoiceId } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: business }, { data: payments }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*, profiles ( full_name, phone )")
        .eq("id", invoiceId)
        .eq("business_id", businessId)
        .maybeSingle(),
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("sort_order"),
      supabase
        .from("businesses")
        .select(
          "name, logo_url, brand_color, currency, contact_email, contact_whatsapp, contact_phone, address, document_template, customer_unique_key_field, booking_custom_fields"
        )
        .eq("id", businessId)
        .single(),
      supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("paid_at", { ascending: false }),
    ]);

  if (!invoice || !business) notFound();

  const customer = asJoined(invoice.profiles);
  let uniqueKeyLine = formatUniqueKey(
    invoice.customer_unique_key
      ? {
          field: "key",
          label: invoice.customer_unique_key_label || "Reference",
          value: invoice.customer_unique_key,
        }
      : null
  );
  if (!uniqueKeyLine && invoice.appointment_id) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("custom_fields")
      .eq("id", invoice.appointment_id)
      .maybeSingle();
    uniqueKeyLine = formatUniqueKey(
      resolveUniqueKey(
        appointment?.custom_fields,
        business.customer_unique_key_field,
        business.booking_custom_fields
      )
    );
  }

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <DocumentPreviewBar
        backHref={`/dashboard/${businessId}/billing/${invoiceId}`}
        backLabel="Back to invoice"
        pdfHref={`/api/invoices/${invoiceId}/pdf`}
      />
      <DocumentChrome business={business} template={business.document_template}>
        <InvoiceDocumentBody
          customerName={customer?.full_name ?? "Customer"}
          customerPhone={customer?.phone}
          uniqueKeyLine={uniqueKeyLine}
          invoiceNumber={invoice.invoice_number}
          status={invoice.status}
          issuedAt={invoice.issued_at}
          paidAt={invoice.paid_at}
          currency={invoice.currency}
          items={items ?? []}
          subtotal={Number(invoice.subtotal)}
          discountAmount={Number(invoice.discount_amount)}
          total={Number(invoice.total)}
          amountPaid={Number(invoice.amount_paid)}
          notes={invoice.notes}
          payments={payments ?? []}
        />
      </DocumentChrome>
    </div>
  );
}
