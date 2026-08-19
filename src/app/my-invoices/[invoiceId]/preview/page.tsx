import { notFound } from "next/navigation";
import { DocumentChrome } from "@/components/print/document-chrome";
import { DocumentPreviewBar } from "@/components/print/document-preview-bar";
import { InvoiceDocumentBody } from "@/components/print/invoice-document-body";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";
import { formatUniqueKey } from "@/lib/customer-unique-key";

export default async function CustomerInvoicePreviewPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        `*, businesses (
          name, logo_url, brand_color, address, contact_email, contact_phone,
          contact_whatsapp, document_template
        )`
      )
      .eq("id", invoiceId)
      .eq("customer_id", user.id)
      .in("status", ["issued", "paid", "void"])
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order"),
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("paid_at", { ascending: false }),
  ]);

  if (!invoice) notFound();
  const business = asJoined(invoice.businesses);
  if (!business) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const uniqueKeyLine = formatUniqueKey(
    invoice.customer_unique_key
      ? {
          field: "key",
          label: invoice.customer_unique_key_label || "Reference",
          value: invoice.customer_unique_key,
        }
      : null
  );

  return (
    <div className="mx-auto max-w-3xl bg-zinc-100 px-4 py-6 sm:px-8">
      <DocumentPreviewBar
        backHref={`/my-invoices/${invoiceId}`}
        backLabel="Back to invoice"
        pdfHref={`/api/invoices/${invoiceId}/pdf`}
      />
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <DocumentChrome business={business} template={business.document_template}>
          <InvoiceDocumentBody
            customerName={profile?.full_name ?? "Customer"}
            customerPhone={profile?.phone}
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
    </div>
  );
}
