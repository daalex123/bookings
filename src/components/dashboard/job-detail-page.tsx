"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  addJobNote,
  assignJobStaff,
  completeJob,
  startJob,
} from "@/lib/jobs";
import { createDraftInvoice } from "@/lib/invoices";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { JobChecklistPanel } from "@/components/dashboard/job-checklist-panel";
import { JobNextServiceForm } from "@/components/dashboard/job-next-service-form";
import { formatPrice, cn } from "@/lib/utils";
import { formatJobNumber } from "@/lib/job-invoices";
import type { JobEventVisibility, JobStatus } from "@/types/database";
import type { JobChecklistView } from "@/lib/checklist-types";

type StaffOption = { id: string; label: string };

type JobDetailProps = {
  businessId: string;
  job: {
    id: string;
    status: JobStatus;
    public_notes: string | null;
    internal_notes: string | null;
    started_at: string | null;
    completed_at: string | null;
    assigned_member_id: string | null;
    appointment_id: string;
    customer_id: string;
    job_number: string | null;
    next_service_id: string | null;
    next_service_due_on: string | null;
    next_service_notes: string | null;
    next_service_visible: boolean;
  };
  appointment: {
    start_at: string;
    status: string;
    service_name: string;
    customer_name: string;
  };
  events: {
    id: string;
    event_type: string;
    message: string;
    visibility: JobEventVisibility;
    created_at: string;
  }[];
  staff: StaffOption[];
  assignedStaffName: string | null;
  invoices: {
    id: string;
    invoice_number: string | null;
    status: string;
    total: number;
    currency: string;
  }[];
  checklists: JobChecklistView[];
  templates: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

const JOB_STATUS_STYLE: Record<string, string> = {
  queued: "bg-amber-500/20 text-amber-700",
  in_progress: "bg-sky-500/20 text-sky-700",
  completed: "bg-emerald-500/20 text-emerald-700",
  cancelled: "bg-red-500/20 text-red-700",
};

export function JobDetailPage({
  businessId,
  job,
  appointment,
  events,
  staff,
  assignedStaffName,
  invoices,
  checklists,
  templates,
  services,
}: JobDetailProps) {
  const router = useRouter();
  const { wrapFormAction, wrapAction, runWithToast } = useActionToast();
  const assignedLabel =
    assignedStaffName ??
    staff.find((s) => s.id === job.assigned_member_id)?.label ??
    null;

  const onStart = wrapAction(
    () => startJob(job.id, businessId),
    { loading: "Starting job…", success: "Job started" }
  );
  const onComplete = wrapAction(
    () => completeJob(job.id, businessId),
    { loading: "Completing job…", success: "Job completed" }
  );
  const onAssign = wrapFormAction(
    async (formData) => {
      const memberId = formData.get("member_id")?.toString() || null;
      return assignJobStaff(job.id, businessId, memberId);
    },
    { loading: "Saving…", success: "Staff updated" }
  );
  const onNote = wrapFormAction(
    async (formData) => {
      const note = formData.get("note")?.toString() ?? "";
      const visibility = (formData.get("visibility")?.toString() ??
        "public") as JobEventVisibility;
      return addJobNote(job.id, businessId, note, visibility);
    },
    { loading: "Saving note…", success: "Note added" }
  );

  async function onCreateInvoice() {
    const result = await runWithToast(
      () =>
        createDraftInvoice({
          businessId,
          customerId: job.customer_id,
          appointmentId: job.appointment_id,
          jobId: job.id,
        }),
      { loading: "Creating invoice…", success: "Draft invoice created" }
    );
    if (result.success && result.result && "invoiceId" in (result.result as object)) {
      const invoiceId = (result.result as { invoiceId: string }).invoiceId;
      router.push(`/dashboard/${businessId}/billing/${invoiceId}`);
    } else if (
      result.result &&
      typeof result.result === "object" &&
      "invoiceId" in result.result
    ) {
      router.push(
        `/dashboard/${businessId}/billing/${(result.result as { invoiceId: string }).invoiceId}`
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={formatJobNumber(job.job_number, job.id)}
        description={`${appointment.service_name} · ${appointment.customer_name}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/${businessId}/customers/${job.customer_id}`}
              className="text-sm font-medium text-[var(--admin-navy)] underline-offset-2 hover:underline"
            >
              Customer history
            </Link>
            <Link
              href={`/dashboard/${businessId}/appointments?id=${job.appointment_id}&view=list`}
              className="text-sm font-medium text-[var(--admin-navy)] underline-offset-2 hover:underline"
            >
              View appointment
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                JOB_STATUS_STYLE[job.status] ?? "bg-zinc-100"
              )}
            >
              {job.status.replace("_", " ")}
            </span>
            <span className="text-sm text-[#8b92a5]">
              Appointment {format(new Date(appointment.start_at), "PPP · p")}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                assignedLabel
                  ? "bg-sky-500/15 text-sky-800"
                  : "bg-[#f0f2f5] text-[#8b92a5]"
              )}
            >
              {assignedLabel ? `Staff · ${assignedLabel}` : "Staff · Unassigned"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.status === "queued" && (
              <Button type="button" size="sm" onClick={onStart}>
                Start job
              </Button>
            )}
            {(job.status === "queued" || job.status === "in_progress") && (
              <Button type="button" size="sm" variant="outline" onClick={onComplete}>
                Complete job
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={onCreateInvoice}>
              Create invoice
            </Button>
          </div>

          <form
            key={job.assigned_member_id ?? "unassigned"}
            action={onAssign}
            className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="member_id">Assigned staff</Label>
              <AdminSelect
                id="member_id"
                name="member_id"
                defaultValue={job.assigned_member_id ?? ""}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </AdminSelect>
              <p className="text-xs text-[#8b92a5]">
                {assignedLabel
                  ? `Currently assigned to ${assignedLabel}`
                  : "No staff assigned yet"}
              </p>
            </div>
            <SubmitButton>Save</SubmitButton>
          </form>

          <form action={onNote} className="space-y-3 border-t border-[#1e2235]/8 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="note">Add note</Label>
              <Textarea id="note" name="note" rows={3} required />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" value="public" defaultChecked />
                Customer-visible
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="visibility" value="internal" />
                Internal only
              </label>
              <SubmitButton>Add note</SubmitButton>
            </div>
          </form>

          {(job.public_notes || job.internal_notes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {job.public_notes && (
                <div className="rounded-xl bg-[#f0f2f5]/80 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8b92a5]">
                    Public notes
                  </p>
                  <p className="whitespace-pre-wrap text-[#1e2235]">{job.public_notes}</p>
                </div>
              )}
              {job.internal_notes && (
                <div className="rounded-xl bg-[#f0f2f5]/80 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8b92a5]">
                    Internal notes
                  </p>
                  <p className="whitespace-pre-wrap text-[#1e2235]">{job.internal_notes}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#1e2235]/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#1e2235]">Timeline</h2>
            <ul className="space-y-3">
              {events.length === 0 && (
                <li className="text-sm text-[#8b92a5]">No events yet</li>
              )}
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-[#1e2235]/15 pl-3">
                  <p className="text-sm text-[#1e2235]">{event.message}</p>
                  <p className="mt-0.5 text-[11px] text-[#8b92a5]">
                    {format(new Date(event.created_at), "PP · p")}
                    {event.visibility === "internal" ? " · Internal" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#1e2235]/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-[#1e2235]">Invoices</h2>
            <ul className="space-y-2">
              {invoices.length === 0 && (
                <li className="text-sm text-[#8b92a5]">No invoices yet</li>
              )}
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/dashboard/${businessId}/billing/${inv.id}`}
                    className="flex items-center justify-between rounded-xl border border-[#1e2235]/8 px-3 py-2 text-sm hover:bg-[#f0f2f5]/60"
                  >
                    <span>
                      {inv.invoice_number ?? "Draft"} · {inv.status}
                    </span>
                    <span className="font-medium">
                      {formatPrice(Number(inv.total), inv.currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <JobNextServiceForm
            businessId={businessId}
            jobId={job.id}
            cancelled={job.status === "cancelled"}
            services={services}
            nextServiceId={job.next_service_id}
            nextServiceDueOn={job.next_service_due_on}
            nextServiceNotes={job.next_service_notes}
            nextServiceVisible={job.next_service_visible}
          />
        </aside>
      </div>

      <JobChecklistPanel
        businessId={businessId}
        jobId={job.id}
        jobStatus={job.status}
        checklists={checklists}
        templates={templates}
      />
    </div>
  );
}
