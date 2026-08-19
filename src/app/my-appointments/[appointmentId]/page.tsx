import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { cancelMyAppointment } from "@/lib/actions";
import { bookingPagePathBySlug } from "@/lib/booking";
import { getActiveBusinessPath } from "@/lib/business-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { asJoined, formatPrice, cn } from "@/lib/utils";
import { mapAddonNames } from "@/lib/appointment-addons";
import { JobChecklistReadOnly } from "@/components/booking/job-checklist-readonly";
import { getJobChecklists } from "@/lib/checklists";
import { ChecklistDocActions } from "@/components/print/checklist-doc-actions";

export default async function AppointmentHistoryDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const isBooking = Boolean(await getActiveBusinessPath());

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, status, notes, customer_id, business_id,
      service_price, service_cost_price,
      businesses ( name, slug, currency, brand_color ),
      services ( name ),
      appointment_addons ( price, services ( name ) ),
      jobs (
        id, status, public_notes, started_at, completed_at, assigned_member_id,
        job_number, next_service_name, next_service_due_on, next_service_notes, next_service_visible,
        job_events ( id, event_type, message, visibility, created_at ),
        invoices (
          id, invoice_number, status, currency, subtotal, discount_amount, total, amount_paid, notes, issued_at,
          invoice_items ( id, description, quantity, unit_price, sort_order ),
          invoice_payments ( id, amount, method, paid_at )
        )
      )
    `
    )
    .eq("id", appointmentId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!appointment) notFound();

  const business = asJoined(appointment.businesses);
  const service = asJoined(appointment.services);
  const job = asJoined(appointment.jobs);
  const events = (job?.job_events ?? [])
    .filter((e: { visibility: string }) => e.visibility === "public")
    .sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const invoices = Array.isArray(job?.invoices)
    ? job.invoices.filter((i: { status: string }) =>
        ["issued", "paid", "void"].includes(i.status)
      )
    : job?.invoices
      ? [job.invoices].filter((i: { status: string }) =>
          ["issued", "paid", "void"].includes(i.status)
        )
      : [];

  let staffName: string | null = null;
  if (job?.assigned_member_id) {
    const { data: member } = await supabase
      .from("business_members")
      .select("staff_name, profiles ( full_name )")
      .eq("id", job.assigned_member_id)
      .maybeSingle();
    const profile = asJoined(member?.profiles);
    staffName = member?.staff_name || profile?.full_name || null;
  }

  async function cancelAppointment(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (!id) return { error: "Missing appointment id" };
    return cancelMyAppointment(id);
  }

  const currency = business?.currency ?? "LKR";
  const addonNames = mapAddonNames(appointment.appointment_addons);
  const checklists =
    job?.id && appointment.business_id
      ? await getJobChecklists(appointment.business_id, job.id)
      : [];

  return (
    <div
      className={cn(
        "w-full space-y-5",
        isBooking ? "px-5 pt-6 pb-8" : "mx-auto max-w-3xl px-5 py-8"
      )}
    >
      <div>
        <Link
          href="/my-appointments?tab=history"
          className={cn(
            "text-sm font-medium underline-offset-2 hover:underline",
            isBooking ? "text-white/60 hover:text-white" : "text-zinc-500"
          )}
        >
          Back to appointments
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className={cn(
                "text-3xl font-bold tracking-tight",
                isBooking ? "text-white" : "text-zinc-900"
              )}
            >
              {service?.name ?? "Appointment"}
            </h1>
            <p
              className={cn(
                "mt-1 text-sm",
                isBooking ? "text-white/70" : "text-zinc-600"
              )}
            >
              {business?.name} · {format(new Date(appointment.start_at), "PPP · p")}
            </p>
          </div>
          <StatusPill status={appointment.status} isBooking={isBooking} />
        </div>
      </div>

      <Section isBooking={isBooking} title="Appointment">
        <MetaRow
          isBooking={isBooking}
          label="Ends"
          value={format(new Date(appointment.end_at), "p")}
        />
        {addonNames.length > 0 && (
          <MetaRow isBooking={isBooking} label="Add-ons" value={addonNames.join(", ")} />
        )}
        {appointment.notes && (
          <div className="pt-1">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                isBooking ? "text-white/45" : "text-zinc-500"
              )}
            >
              Notes
            </p>
            <p
              className={cn(
                "mt-1 whitespace-pre-wrap text-sm leading-relaxed",
                isBooking ? "text-white/85" : "text-zinc-800"
              )}
            >
              {appointment.notes}
            </p>
          </div>
        )}
      </Section>

      {job && (
        <Section isBooking={isBooking} title="Job history">
          <div className="grid gap-2 sm:grid-cols-2">
            <MetaRow
              isBooking={isBooking}
              label="Status"
              value={job.status.replace("_", " ")}
              capitalize
            />
            {staffName && (
              <MetaRow isBooking={isBooking} label="Staff" value={staffName} />
            )}
            {job.started_at && (
              <MetaRow
                isBooking={isBooking}
                label="Started"
                value={format(new Date(job.started_at), "PPP · p")}
              />
            )}
            {job.completed_at && (
              <MetaRow
                isBooking={isBooking}
                label="Completed"
                value={format(new Date(job.completed_at), "PPP · p")}
              />
            )}
            {job.job_number && (
              <MetaRow isBooking={isBooking} label="Job ID" value={job.job_number} />
            )}
          </div>

          {job.next_service_visible && job.next_service_name && (
            <div
              className={cn(
                "mt-4 rounded-2xl px-4 py-3",
                isBooking
                  ? "bg-white/10 ring-1 ring-white/10"
                  : "bg-emerald-50"
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  isBooking ? "text-white/45" : "text-emerald-800/70"
                )}
              >
                Next service
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-medium",
                  isBooking ? "text-white" : "text-emerald-950"
                )}
              >
                {job.next_service_name}
                {job.next_service_due_on
                  ? ` · due ${format(new Date(job.next_service_due_on), "PPP")}`
                  : ""}
              </p>
              {job.next_service_notes && (
                <p
                  className={cn(
                    "mt-1 text-sm",
                    isBooking ? "text-white/75" : "text-emerald-900/80"
                  )}
                >
                  {job.next_service_notes}
                </p>
              )}
            </div>
          )}

          {job.public_notes && (
            <p
              className={cn(
                "mt-4 whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                isBooking
                  ? "bg-white/10 text-white/85 ring-1 ring-white/10"
                  : "bg-zinc-50 text-zinc-700"
              )}
            >
              {job.public_notes}
            </p>
          )}
        </Section>
      )}

      {job && (
        <Section
          isBooking={isBooking}
          title="Checklist"
          action={
            <ChecklistDocActions
              previewHref={`/my-appointments/${appointmentId}/checklist`}
              pdfHref={`/api/jobs/${job.id}/checklists/pdf`}
              variant={isBooking ? "booking" : "admin"}
            />
          }
        >
          {checklists.length > 0 ? (
            <JobChecklistReadOnly
              checklists={checklists}
              isBooking={isBooking}
              embedded
            />
          ) : (
            <p
              className={cn(
                "text-sm",
                isBooking ? "text-white/55" : "text-zinc-500"
              )}
            >
              No checklist has been filled for this visit yet. You can still
              preview the document once staff apply a form.
            </p>
          )}
        </Section>
      )}

      {invoices.map(
        (invoice: {
          id: string;
          invoice_number: string | null;
          status: string;
          currency: string;
          subtotal: number;
          discount_amount: number;
          total: number;
          amount_paid: number;
          notes: string | null;
          invoice_items: {
            id: string;
            description: string;
            quantity: number;
            unit_price: number;
            sort_order?: number;
          }[];
        }) => (
          <Section
            key={invoice.id}
            isBooking={isBooking}
            title="Invoice"
            action={
              <StatusPill status={invoice.status} isBooking={isBooking} />
            }
          >
            <Link
              href={`/my-invoices/${invoice.id}`}
              className={cn(
                "inline-flex text-lg font-semibold underline-offset-2 hover:underline",
                isBooking ? "text-booking-accent" : "text-zinc-900"
              )}
            >
              {invoice.invoice_number ?? "Invoice"}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/my-invoices/${invoice.id}/preview`}
                className={cn(
                  "text-sm font-medium underline-offset-2 hover:underline",
                  isBooking ? "text-white/80" : "text-zinc-700"
                )}
              >
                Preview
              </Link>
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                download
                className={cn(
                  "text-sm font-medium underline-offset-2 hover:underline",
                  isBooking ? "text-booking-accent" : "text-zinc-900"
                )}
              >
                Download PDF
              </a>
            </div>

            <ul className="mt-4 space-y-2">
              {[...(invoice.invoice_items ?? [])]
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-sm",
                      isBooking ? "bg-white/5" : "bg-zinc-50"
                    )}
                  >
                    <span className={isBooking ? "text-white/90" : "text-zinc-800"}>
                      {item.description}
                      {Number(item.quantity) !== 1 && (
                        <span
                          className={cn(
                            "ml-2 text-xs",
                            isBooking ? "text-white/45" : "text-zinc-500"
                          )}
                        >
                          × {item.quantity}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-medium tabular-nums",
                        isBooking ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {formatPrice(
                        Number(item.quantity) * Number(item.unit_price),
                        invoice.currency || currency
                      )}
                    </span>
                  </li>
                ))}
            </ul>

            <div
              className={cn(
                "mt-4 space-y-1.5 border-t pt-3 text-sm",
                isBooking ? "border-white/10" : "border-zinc-100"
              )}
            >
              <TotalsRow
                isBooking={isBooking}
                label="Subtotal"
                value={formatPrice(
                  Number(invoice.subtotal),
                  invoice.currency || currency
                )}
              />
              <TotalsRow
                isBooking={isBooking}
                label="Discount"
                value={`-${formatPrice(
                  Number(invoice.discount_amount),
                  invoice.currency || currency
                )}`}
              />
              <TotalsRow
                isBooking={isBooking}
                label="Total"
                value={formatPrice(
                  Number(invoice.total),
                  invoice.currency || currency
                )}
                strong
              />
              <TotalsRow
                isBooking={isBooking}
                label="Paid"
                value={formatPrice(
                  Number(invoice.amount_paid),
                  invoice.currency || currency
                )}
              />
            </div>
          </Section>
        )
      )}

      {job && (
        <Section isBooking={isBooking} title="Timeline">
          {events.length > 0 ? (
            <ol className="relative space-y-0">
              {events.map(
                (
                  event: { id: string; message: string; created_at: string },
                  index: number
                ) => (
                  <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
                    <div className="relative flex w-4 shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          "mt-1.5 h-2.5 w-2.5 rounded-full",
                          index === 0
                            ? "bg-booking-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-booking-accent)_22%,transparent)]"
                            : isBooking
                              ? "bg-white/35"
                              : "bg-zinc-300"
                        )}
                      />
                      {index < events.length - 1 && (
                        <span
                          className={cn(
                            "mt-1 w-px flex-1",
                            isBooking ? "bg-white/15" : "bg-zinc-200"
                          )}
                        />
                      )}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={cn(
                          "text-sm font-medium leading-snug",
                          isBooking ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {event.message}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isBooking ? "text-white/50" : "text-zinc-500"
                        )}
                      >
                        {format(new Date(event.created_at), "PP · p")}
                      </p>
                    </div>
                  </li>
                )
              )}
            </ol>
          ) : (
            <p
              className={cn(
                "text-sm",
                isBooking ? "text-white/55" : "text-zinc-500"
              )}
            >
              No timeline events yet.
            </p>
          )}
        </Section>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {business?.slug && (
          <Link
            href={bookingPagePathBySlug(business.slug)}
            className="rounded-xl bg-booking-accent px-4 py-2.5 text-sm font-semibold text-booking-accent-fg transition-colors hover:brightness-105"
          >
            Book again
          </Link>
        )}
        {appointment.status !== "cancelled" &&
          appointment.status !== "completed" &&
          new Date(appointment.start_at) > new Date() && (
            <form
              action={async (formData) => {
                "use server";
                await cancelAppointment(formData);
              }}
            >
              <input type="hidden" name="id" value={appointment.id} />
              <button
                type="submit"
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold",
                  isBooking
                    ? "bg-red-500/25 text-red-200 hover:bg-red-500/35"
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
              >
                Cancel appointment
              </button>
            </form>
          )}
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
  isBooking,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  isBooking: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl p-5",
        isBooking
          ? "booking-glass-card"
          : "border border-zinc-200 bg-white shadow-sm"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className={cn(
            "text-sm font-semibold tracking-wide",
            isBooking ? "text-white/55" : "text-zinc-500"
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function MetaRow({
  label,
  value,
  isBooking,
  capitalize = false,
}: {
  label: string;
  value: string;
  isBooking: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className={isBooking ? "text-white/50" : "text-zinc-500"}>{label}</dt>
      <dd
        className={cn(
          "text-right font-medium",
          capitalize && "capitalize",
          isBooking ? "text-white" : "text-zinc-900"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  isBooking,
  strong = false,
}: {
  label: string;
  value: string;
  isBooking: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        strong && "pt-1 text-base font-semibold"
      )}
    >
      <span
        className={cn(
          strong
            ? isBooking
              ? "text-white"
              : "text-zinc-900"
            : isBooking
              ? "text-white/55"
              : "text-zinc-500"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          strong
            ? isBooking
              ? "text-white"
              : "text-zinc-900"
            : isBooking
              ? "text-white/85"
              : "text-zinc-800"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({
  status,
  isBooking,
}: {
  status: string;
  isBooking: boolean;
}) {
  const styles: Record<string, { booking: string; light: string }> = {
    pending: {
      booking: "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30",
      light: "bg-amber-100 text-amber-800",
    },
    confirmed: {
      booking: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30",
      light: "bg-emerald-100 text-emerald-800",
    },
    cancelled: {
      booking: "bg-red-400/20 text-red-200 ring-1 ring-red-300/30",
      light: "bg-red-100 text-red-800",
    },
    completed: {
      booking: "bg-white/15 text-white ring-1 ring-white/25",
      light: "bg-zinc-100 text-zinc-800",
    },
    no_show: {
      booking: "bg-red-400/20 text-red-200 ring-1 ring-red-300/30",
      light: "bg-red-100 text-red-800",
    },
    paid: {
      booking: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30",
      light: "bg-emerald-100 text-emerald-800",
    },
    issued: {
      booking: "bg-sky-400/20 text-sky-200 ring-1 ring-sky-300/30",
      light: "bg-sky-100 text-sky-800",
    },
    void: {
      booking: "bg-white/10 text-white/70 ring-1 ring-white/15",
      light: "bg-zinc-100 text-zinc-600",
    },
  };

  const style = styles[status] ?? {
    booking: "bg-white/15 text-white ring-1 ring-white/20",
    light: "bg-zinc-100 text-zinc-800",
  };

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize",
        isBooking ? style.booking : style.light
      )}
    >
      {status === "issued" ? "unpaid" : status.replace("_", " ")}
    </span>
  );
}
