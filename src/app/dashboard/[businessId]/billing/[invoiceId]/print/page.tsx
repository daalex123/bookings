import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { asJoined, formatPrice } from "@/lib/utils";

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
          "name, logo_url, brand_color, currency, contact_email, contact_whatsapp"
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
  const brand = business.brand_color || "#1e2235";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/dashboard/${businessId}/billing/${invoiceId}`}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline"
        >
          Back to invoice
        </Link>
        <Link
          href={`/dashboard/${businessId}/billing/${invoiceId}/print`}
          className="rounded-full bg-booking-accent px-4 py-2 text-sm font-medium text-booking-accent-fg"
          // Users can use browser Print (Ctrl/Cmd+P) on this page
        >
          Ready to print — use Ctrl/Cmd+P
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ backgroundColor: brand }}
            >
              {business.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: brand }}>
              {business.name}
            </h1>
            <p className="text-sm text-zinc-500">
              {[business.contact_email, business.contact_whatsapp]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Invoice
          </p>
          <p className="text-xl font-bold text-zinc-900">
            {invoice.invoice_number ?? "DRAFT"}
          </p>
          <p className="text-sm capitalize text-zinc-500">{invoice.status}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bill to
          </p>
          <p className="font-medium text-zinc-900">
            {customer?.full_name ?? "Customer"}
          </p>
          {customer?.phone && (
            <p className="text-sm text-zinc-500">{customer.phone}</p>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-zinc-500">
            Issued{" "}
            {invoice.issued_at
              ? format(new Date(invoice.issued_at), "PP")
              : "—"}
          </p>
          {invoice.paid_at && (
            <p className="text-sm text-zinc-500">
              Paid {format(new Date(invoice.paid_at), "PP")}
            </p>
          )}
        </div>
      </div>

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-2 font-semibold">Description</th>
            <th className="py-2 font-semibold">Qty</th>
            <th className="py-2 font-semibold">Price</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item) => (
            <tr key={item.id} className="border-b border-zinc-100">
              <td className="py-3">{item.description}</td>
              <td className="py-3">{Number(item.quantity)}</td>
              <td className="py-3">
                {formatPrice(Number(item.unit_price), invoice.currency)}
              </td>
              <td className="py-3 text-right">
                {formatPrice(
                  Number(item.quantity) * Number(item.unit_price),
                  invoice.currency
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Subtotal</span>
          <span>{formatPrice(Number(invoice.subtotal), invoice.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Discount</span>
          <span>
            -{formatPrice(Number(invoice.discount_amount), invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(Number(invoice.total), invoice.currency)}</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span>Amount paid</span>
          <span>
            {formatPrice(Number(invoice.amount_paid), invoice.currency)}
          </span>
        </div>
      </div>

      {invoice.notes && (
        <p className="mt-8 whitespace-pre-wrap text-sm text-zinc-600">
          {invoice.notes}
        </p>
      )}

      {(payments ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Payments
          </h2>
          <ul className="space-y-1 text-sm">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {format(new Date(p.paid_at), "PP")} ·{" "}
                  {p.method.replace("_", " ")}
                </span>
                <span>{formatPrice(Number(p.amount), invoice.currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
