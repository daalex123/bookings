import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getActiveBusinessPath } from "@/lib/business-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { asJoined, cn, formatPrice } from "@/lib/utils";

export default async function MyInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const isBooking = Boolean(await getActiveBusinessPath());

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `id, invoice_number, status, currency, subtotal, discount_amount, total,
       amount_paid, notes, issued_at, created_at, appointment_id,
       businesses ( name, slug ),
       appointments ( start_at, services ( name ) ),
       invoice_items ( id, description, quantity, unit_price, sort_order ),
       invoice_payments ( id, amount, method, paid_at )`
    )
    .eq("id", invoiceId)
    .eq("customer_id", user.id)
    .in("status", ["issued", "paid", "void"])
    .maybeSingle();

  if (!invoice) notFound();

  const business = asJoined(invoice.businesses);
  const appointment = asJoined(invoice.appointments);
  const service = asJoined(appointment?.services);
  const items = [...(invoice.invoice_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const payments = [...(invoice.invoice_payments ?? [])].sort(
    (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
  );
  const balance = Math.max(
    0,
    Number(invoice.total) - Number(invoice.amount_paid)
  );

  return (
    <div
      className={cn(
        "w-full space-y-6",
        isBooking ? "px-5 pt-6 pb-8" : "mx-auto max-w-3xl px-5 py-8"
      )}
    >
      <div>
        <Link
          href="/my-invoices"
          className={cn(
            "text-sm underline-offset-2 hover:underline",
            isBooking ? "text-booking-muted" : "text-zinc-500"
          )}
        >
          Back to invoices
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className={cn(
                "text-2xl font-bold",
                isBooking ? "text-white" : "text-zinc-900"
              )}
            >
              {invoice.invoice_number ?? "Invoice"}
            </h1>
            <p className={isBooking ? "text-booking-muted" : "text-zinc-600"}>
              {business?.name ?? "Business"}
              {service?.name ? ` · ${service.name}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
              invoice.status === "paid"
                ? "bg-emerald-100 text-emerald-700"
                : invoice.status === "void"
                  ? "bg-zinc-100 text-zinc-600"
                  : "bg-sky-100 text-sky-700"
            )}
          >
            {invoice.status === "issued" ? "unpaid" : invoice.status}
          </span>
        </div>
      </div>

      <section
        className={cn(
          "rounded-2xl p-5",
          isBooking
            ? "booking-glass-card"
            : "border border-zinc-200 bg-white"
        )}
      >
        <h2
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            isBooking ? "text-booking-muted" : "text-zinc-500"
          )}
        >
          Details
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
              Issued
            </dt>
            <dd className={isBooking ? "text-white" : "text-zinc-900"}>
              {format(new Date(invoice.issued_at ?? invoice.created_at), "PPP")}
            </dd>
          </div>
          {appointment?.start_at && (
            <div className="flex justify-between gap-4">
              <dt className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
                Appointment
              </dt>
              <dd className={isBooking ? "text-white" : "text-zinc-900"}>
                {format(new Date(appointment.start_at), "PPP p")}
              </dd>
            </div>
          )}
          {invoice.appointment_id && (
            <div className="pt-1">
              <Link
                href={`/my-appointments/${invoice.appointment_id}`}
                className={cn(
                  "text-sm font-medium underline-offset-2 hover:underline",
                  isBooking ? "text-booking-accent" : "text-zinc-900"
                )}
              >
                View related appointment
              </Link>
            </div>
          )}
        </dl>
      </section>

      <section
        className={cn(
          "rounded-2xl p-5",
          isBooking
            ? "booking-glass-card"
            : "border border-zinc-200 bg-white"
        )}
      >
        <h2
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            isBooking ? "text-booking-muted" : "text-zinc-500"
          )}
        >
          Line items
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr
              className={cn(
                "text-left text-xs uppercase tracking-wide",
                isBooking ? "text-booking-muted" : "text-zinc-500"
              )}
            >
              <th className="pb-2 font-semibold">Description</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "border-t",
                  isBooking ? "border-white/10" : "border-zinc-100"
                )}
              >
                <td className={cn("py-2", isBooking ? "text-white" : "text-zinc-900")}>
                  <span>{item.description}</span>
                  {Number(item.quantity) !== 1 && (
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        isBooking ? "text-booking-muted" : "text-zinc-500"
                      )}
                    >
                      × {item.quantity}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    "py-2 text-right",
                    isBooking ? "text-white" : "text-zinc-900"
                  )}
                >
                  {formatPrice(
                    Number(item.quantity) * Number(item.unit_price),
                    invoice.currency
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          className={cn(
            "mt-4 space-y-1 border-t pt-3 text-sm",
            isBooking ? "border-white/10" : "border-zinc-100"
          )}
        >
          <div className="flex justify-between">
            <span className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
              Subtotal
            </span>
            <span className={isBooking ? "text-white" : undefined}>
              {formatPrice(Number(invoice.subtotal), invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
              Discount
            </span>
            <span className={isBooking ? "text-white" : undefined}>
              -{formatPrice(Number(invoice.discount_amount), invoice.currency)}
            </span>
          </div>
          <div
            className={cn(
              "flex justify-between font-semibold",
              isBooking ? "text-white" : "text-zinc-900"
            )}
          >
            <span>Total</span>
            <span>{formatPrice(Number(invoice.total), invoice.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
              Paid
            </span>
            <span className={isBooking ? "text-white" : undefined}>
              {formatPrice(Number(invoice.amount_paid), invoice.currency)}
            </span>
          </div>
          {invoice.status === "issued" && balance > 0 && (
            <div
              className={cn(
                "flex justify-between font-semibold",
                isBooking ? "text-booking-accent" : "text-sky-700"
              )}
            >
              <span>Amount due</span>
              <span>{formatPrice(balance, invoice.currency)}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <p
            className={cn(
              "mt-4 whitespace-pre-wrap rounded-xl p-3 text-sm",
              isBooking ? "bg-white/5 text-booking-muted" : "bg-zinc-50 text-zinc-600"
            )}
          >
            {invoice.notes}
          </p>
        )}
      </section>

      {payments.length > 0 && (
        <section
          className={cn(
            "rounded-2xl p-5",
            isBooking
              ? "booking-glass-card"
              : "border border-zinc-200 bg-white"
          )}
        >
          <h2
            className={cn(
              "text-sm font-semibold uppercase tracking-wide",
              isBooking ? "text-booking-muted" : "text-zinc-500"
            )}
          >
            Payments
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3">
                <span className={isBooking ? "text-booking-muted" : "text-zinc-500"}>
                  {format(new Date(payment.paid_at), "PP")} ·{" "}
                  {payment.method.replace("_", " ")}
                </span>
                <span className={isBooking ? "text-white" : "text-zinc-900"}>
                  {formatPrice(Number(payment.amount), invoice.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
