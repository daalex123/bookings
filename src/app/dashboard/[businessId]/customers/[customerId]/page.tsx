import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { UserAvatar } from "@/components/account/user-avatar";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  formatJobNumber,
  invoicesMatchingJob,
  type LinkedInvoice,
} from "@/lib/job-invoices";
import { collectUniqueKeys, formatUniqueKey } from "@/lib/customer-unique-key";
import { createClient } from "@/lib/supabase/server";
import { asJoined, cn, formatPrice } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  queued: "bg-amber-500/15 text-amber-700",
  in_progress: "bg-sky-500/15 text-sky-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-zinc-500/15 text-zinc-600",
};

export default async function CustomerHistoryPage({
  params,
}: {
  params: Promise<{ businessId: string; customerId: string }>;
}) {
  const { businessId, customerId } = await params;
  const supabase = await createClient();

  const [{ data: jobs }, { data: business }, { data: appointmentProfile }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select(
          `id, job_number, status, created_at, started_at, completed_at,
           appointment_id, customer_id,
           next_service_name, next_service_due_on, next_service_visible,
           profiles ( id, full_name, phone, avatar_url ),
           appointments ( start_at, status, custom_fields, services ( name ) )`
        )
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("businesses")
        .select("currency, customer_unique_key_field, booking_custom_fields")
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("profiles ( id, full_name, phone, avatar_url )")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const jobList = jobs ?? [];
  const profile =
    asJoined(jobList[0]?.profiles) ?? asJoined(appointmentProfile?.profiles);

  if (!profile) notFound();
  const jobIds = jobList.map((job) => job.id);
  const appointmentIds = jobList.map((job) => job.appointment_id);

  let invoices: LinkedInvoice[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from("invoices")
      .select("id, job_id, appointment_id, invoice_number, status, total, currency")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .or(
        `job_id.in.(${jobIds.join(",")}),appointment_id.in.(${appointmentIds.join(",")})`
      )
      .order("created_at", { ascending: false });
    invoices = data ?? [];
  } else {
    const { data } = await supabase
      .from("invoices")
      .select("id, job_id, appointment_id, invoice_number, status, total, currency")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    invoices = data ?? [];
  }

  const name = profile.full_name ?? "Customer";
  const currency = business?.currency ?? "LKR";
  const uniqueKeys = collectUniqueKeys(
    jobList.map((job) => asJoined(job.appointments)),
    business?.customer_unique_key_field,
    business?.booking_custom_fields
  );
  const latestNext = jobList.find(
    (job) => job.next_service_name || job.next_service_due_on
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description="Full job and invoice history for this customer"
        action={
          <Link
            href={`/dashboard/${businessId}/customers`}
            className="text-sm font-medium text-[var(--admin-navy)] underline-offset-2 hover:underline"
          >
            All customers
          </Link>
        }
      />

      <section className="admin-card flex flex-wrap items-start gap-4 p-5">
        <UserAvatar name={name} src={profile.avatar_url} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1e2235]">{name}</p>
          <p className="text-sm text-[#8b92a5]">
            {[profile.phone].filter(Boolean).join(" · ") ||
              "No contact details"}
          </p>
          {uniqueKeys.length > 0 && (
            <p className="mt-1 text-sm font-medium text-[#1e2235]">
              {uniqueKeys.map((key) => formatUniqueKey(key)).join(" · ")}
            </p>
          )}
          <p className="mt-1 text-xs text-[#8b92a5]">
            {jobList.length} job{jobList.length === 1 ? "" : "s"}
          </p>
        </div>
        {latestNext?.next_service_name && (
          <div className="rounded-xl bg-[#f0f2f5]/80 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b92a5]">
              Next service
            </p>
            <p className="mt-1 font-medium text-[#1e2235]">
              {latestNext.next_service_name}
            </p>
            {latestNext.next_service_due_on && (
              <p className="text-xs text-[#8b92a5]">
                Due {format(new Date(latestNext.next_service_due_on), "PPP")}
              </p>
            )}
            <p className="mt-1 text-[11px] text-[#8b92a5]">
              {latestNext.next_service_visible
                ? "Visible to customer"
                : "Internal only"}
            </p>
          </div>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[#1e2235]/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#1e2235]/10 bg-[#f0f2f5]/60 text-xs uppercase tracking-wide text-[#8b92a5]">
            <tr>
              <th className="px-4 py-3 font-semibold">Job ID</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Invoices</th>
              <th className="px-4 py-3 font-semibold">Next service</th>
            </tr>
          </thead>
          <tbody>
            {jobList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#8b92a5]">
                  No jobs yet for this customer.
                </td>
              </tr>
            )}
            {jobList.map((job) => {
              const appointment = asJoined(job.appointments);
              const service = asJoined(appointment?.services);
              const jobInvoices = invoicesMatchingJob(invoices, job);
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
                      {formatJobNumber(job.job_number, job.id)}
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
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {appointment?.start_at
                      ? format(new Date(appointment.start_at), "PP · p")
                      : format(new Date(job.created_at), "PP")}
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
                            {formatPrice(
                              Number(invoice.total),
                              invoice.currency || currency
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {job.next_service_name ? (
                      <span>
                        {job.next_service_name}
                        {job.next_service_due_on
                          ? ` · ${format(new Date(job.next_service_due_on), "PP")}`
                          : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
