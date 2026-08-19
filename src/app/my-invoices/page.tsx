import Link from "next/link";
import { format } from "date-fns";
import { getActiveBusinessContext } from "@/lib/business-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { asJoined, cn, formatPrice } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  issued: "bg-sky-500/15 text-sky-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  void: "bg-zinc-500/15 text-zinc-600",
};

export default async function MyInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { status } = await searchParams;
  const supabase = await createClient();
  const activeBusiness = await getActiveBusinessContext();
  const isBooking = Boolean(activeBusiness);

  let query = supabase
    .from("invoices")
    .select(
      `id, invoice_number, status, total, amount_paid, currency, issued_at, created_at,
       customer_unique_key, customer_unique_key_label,
       businesses ( name ),
       appointments ( services ( name ) )`
    )
    .eq("customer_id", user.id)
    .in("status", ["issued", "paid", "void"])
    .order("issued_at", { ascending: false });

  if (activeBusiness) {
    query = query.eq("business_id", activeBusiness.businessId);
  }

  if (status && ["issued", "paid", "void"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: invoices } = await query;

  const filters = [
    { id: "", label: "All" },
    { id: "issued", label: "Unpaid" },
    { id: "paid", label: "Paid" },
    { id: "void", label: "Void" },
  ] as const;

  return (
    <div
      className={cn(
        "w-full space-y-6",
        isBooking ? "px-5 pt-6 pb-8" : "mx-auto max-w-3xl px-5 py-8"
      )}
    >
      <div>
        <h1
          className={cn(
            "text-2xl font-bold",
            isBooking ? "text-white" : "text-zinc-900"
          )}
        >
          Invoices
        </h1>
        <p className={isBooking ? "text-booking-muted" : "text-zinc-600"}>
          Bills issued to you by businesses you book with.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = (status ?? "") === filter.id;
          const href = filter.id
            ? `/my-invoices?status=${filter.id}`
            : "/my-invoices";
          return (
            <Link
              key={filter.id || "all"}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-booking-accent text-booking-accent-fg"
                  : isBooking
                    ? "bg-white/10 text-white"
                    : "bg-zinc-100 text-zinc-700"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {(invoices ?? []).length === 0 ? (
        <div
          className={cn(
            "rounded-2xl px-5 py-10 text-center text-sm",
            isBooking
              ? "booking-glass-card text-booking-muted"
              : "border border-zinc-200 bg-white text-zinc-500"
          )}
        >
          No invoices yet. They appear here after a business issues one.
        </div>
      ) : (
        <ul className="space-y-3">
          {(invoices ?? []).map((invoice) => {
            const business = asJoined(invoice.businesses);
            const appointment = asJoined(invoice.appointments);
            const service = asJoined(appointment?.services);
            const balance =
              Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));

            return (
              <li key={invoice.id}>
                <Link
                  href={`/my-invoices/${invoice.id}`}
                  className={cn(
                    "block rounded-2xl p-4 transition-colors",
                    isBooking
                      ? "booking-glass-card hover:bg-white/10"
                      : "border border-zinc-200 bg-white hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-semibold",
                          isBooking ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {invoice.invoice_number ?? "Invoice"}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-sm",
                          isBooking ? "text-booking-muted" : "text-zinc-500"
                        )}
                      >
                        {business?.name ?? "Business"}
                        {service?.name ? ` · ${service.name}` : ""}
                      </p>
                      {invoice.customer_unique_key ? (
                        <p
                          className={cn(
                            "mt-0.5 truncate text-sm",
                            isBooking ? "text-white/80" : "text-zinc-700"
                          )}
                        >
                          {invoice.customer_unique_key_label
                            ? `${invoice.customer_unique_key_label}: `
                            : ""}
                          {invoice.customer_unique_key}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        STATUS_STYLE[invoice.status] ?? "bg-zinc-100 text-zinc-600"
                      )}
                    >
                      {invoice.status === "issued" ? "unpaid" : invoice.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p
                      className={cn(
                        "text-xs",
                        isBooking ? "text-booking-muted" : "text-zinc-500"
                      )}
                    >
                      {format(
                        new Date(invoice.issued_at ?? invoice.created_at),
                        "PP"
                      )}
                    </p>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-base font-semibold",
                          isBooking ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {formatPrice(Number(invoice.total), invoice.currency)}
                      </p>
                      {invoice.status === "issued" && balance > 0 && (
                        <p
                          className={cn(
                            "text-xs",
                            isBooking ? "text-booking-muted" : "text-zinc-500"
                          )}
                        >
                          Due {formatPrice(balance, invoice.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
