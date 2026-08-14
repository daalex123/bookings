import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  formatJobNumber,
  invoicesMatchingJob,
  type LinkedInvoice,
} from "@/lib/job-invoices";
import { asJoined, cn, formatPrice } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-amber-500/15 text-amber-700",
  in_progress: "bg-sky-500/15 text-sky-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-zinc-500/15 text-zinc-600",
};

const STATUS_FILTERS = [
  { id: "", label: "All" },
  { id: "queued", label: "Queued" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export default async function JobsPage({
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
    .from("jobs")
    .select(
      `id, job_number, status, started_at, completed_at, created_at,
       appointment_id, customer_id,
       profiles ( full_name ),
       appointments ( start_at, services ( name ) )`
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (
    status &&
    ["queued", "in_progress", "completed", "cancelled"].includes(status)
  ) {
    query = query.eq("status", status);
  }

  const { data: jobs } = await query;
  const jobList = jobs ?? [];
  const jobIds = jobList.map((job) => job.id);
  const appointmentIds = jobList.map((job) => job.appointment_id);

  let invoices: LinkedInvoice[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("invoices")
      .select("id, job_id, appointment_id, invoice_number, status, total, currency")
      .eq("business_id", businessId)
      .or(
        `job_id.in.(${jobIds.join(",")}),appointment_id.in.(${appointmentIds.join(",")})`
      )
      .order("created_at", { ascending: false });
    invoices = data ?? [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Track work from booking through completion."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (status ?? "") === filter.id;
          const href = filter.id
            ? `/dashboard/${businessId}/jobs?status=${filter.id}`
            : `/dashboard/${businessId}/jobs`;
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

      <div className="overflow-x-auto rounded-2xl border border-[#1e2235]/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#1e2235]/10 bg-[#f0f2f5]/60 text-xs uppercase tracking-wide text-[#8b92a5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Job ID</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Invoices</th>
              <th className="px-4 py-3 font-semibold">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {jobList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#8b92a5]">
                  No jobs yet. Jobs appear when appointments are confirmed or
                  started.
                </td>
              </tr>
            )}
            {jobList.map((job) => {
              const profile = asJoined(job.profiles);
              const appointment = asJoined(job.appointments);
              const service = asJoined(appointment?.services);
              const jobInvoices = invoicesMatchingJob(invoices, job);
              const number = formatJobNumber(job.job_number, job.id);
              return (
                <tr
                  key={job.id}
                  className="border-b border-[#1e2235]/6 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${businessId}/jobs/${job.id}`}
                      className="font-mono text-xs font-semibold text-[var(--admin-navy)] hover:underline"
                    >
                      {number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${businessId}/customers/${job.customer_id}`}
                      className="font-medium text-[var(--admin-navy)] hover:underline"
                    >
                      {profile?.full_name ?? "Customer"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{service?.name ?? "Service"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                        STATUS_STYLE[job.status] ?? "bg-zinc-100"
                      )}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {jobInvoices.length === 0 ? (
                      <span className="text-[#8b92a5]">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {jobInvoices.map((invoice) => (
                          <Link
                            key={invoice.id}
                            href={`/dashboard/${businessId}/billing/${invoice.id}`}
                            className="text-xs font-medium text-[var(--admin-navy)] hover:underline"
                          >
                            {invoice.invoice_number ?? "Draft"} · {invoice.status}
                            {" · "}
                            {formatPrice(Number(invoice.total), invoice.currency)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {appointment?.start_at
                      ? format(new Date(appointment.start_at), "PP · p")
                      : "—"}
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
