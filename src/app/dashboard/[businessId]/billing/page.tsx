import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { asJoined, formatPrice, cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-500/15 text-amber-700",
  issued: "bg-sky-500/15 text-sky-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  void: "bg-zinc-500/15 text-zinc-600",
};

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { businessId } = await params;
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select(
      `id, invoice_number, status, total, amount_paid, currency, created_at, issued_at,
       profiles ( full_name )`
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (status && ["draft", "issued", "paid", "void"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: invoices } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Create and issue invoices, then record offline payments."
        action={
          <Button asChild>
            <Link href={`/dashboard/${businessId}/billing/new`}>New invoice</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {[
          { id: "", label: "All" },
          { id: "draft", label: "Draft" },
          { id: "issued", label: "Issued" },
          { id: "paid", label: "Paid" },
          { id: "void", label: "Void" },
        ].map((filter) => {
          const active = (status ?? "") === filter.id;
          const href = filter.id
            ? `/dashboard/${businessId}/billing?status=${filter.id}`
            : `/dashboard/${businessId}/billing`;
          return (
            <Link
              key={filter.id || "all"}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                active
                  ? "bg-[var(--admin-accent)] text-[var(--admin-accent-fg,#0a0a0a)]"
                  : "bg-[#f0f2f5] text-[#1e2235]"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1e2235]/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#1e2235]/10 bg-[#f0f2f5]/60 text-xs uppercase tracking-wide text-[#8b92a5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#8b92a5]">
                  No invoices yet. Create one from Billing or from a job.
                </td>
              </tr>
            )}
            {(invoices ?? []).map((inv) => {
              const profile = asJoined(inv.profiles);
              return (
                <tr key={inv.id} className="border-b border-[#1e2235]/6 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${businessId}/billing/${inv.id}`}
                      className="font-medium text-[var(--admin-navy)] hover:underline"
                    >
                      {inv.invoice_number ?? "Draft"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{profile?.full_name ?? "Customer"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                        STATUS_STYLE[inv.status] ?? "bg-zinc-100"
                      )}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatPrice(Number(inv.total), inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {format(new Date(inv.issued_at ?? inv.created_at), "PP")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
