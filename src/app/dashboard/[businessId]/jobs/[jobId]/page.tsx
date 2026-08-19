import { JobDetailPage } from "@/components/dashboard/job-detail-page";
import { getJobChecklists, listChecklistTemplates } from "@/lib/checklists";
import { resolveUniqueKey } from "@/lib/customer-unique-key";
import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function JobPage({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const { businessId, jobId } = await params;
  const supabase = await createClient();

  const [
    { data: job },
    { data: events },
    { data: members },
    checklists,
    templates,
    { data: business },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .maybeSingle(),
    supabase
      .from("job_events")
      .select("id, event_type, message, visibility, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_members")
      .select("id, staff_name, user_id, profiles ( full_name )")
      .eq("business_id", businessId),
    getJobChecklists(businessId, jobId),
    listChecklistTemplates(businessId),
    supabase
      .from("businesses")
      .select("customer_unique_key_field, booking_custom_fields")
      .eq("id", businessId)
      .maybeSingle(),
  ]);

  if (!job) notFound();

  const [{ data: appointment }, { data: invoices }, { data: services }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          `id, start_at, status, customer_id, custom_fields,
           services ( name ),
           profiles ( full_name )`
        )
        .eq("id", job.appointment_id)
        .single(),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total, currency")
        .eq("business_id", businessId)
        .or(`job_id.eq.${jobId},appointment_id.eq.${job.appointment_id}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("services")
        .select("id, name")
        .eq("business_id", businessId)
        .is("parent_service_id", null)
        .order("name"),
    ]);

  if (!appointment) notFound();

  const service = asJoined(appointment.services);
  const profile = asJoined(appointment.profiles);

  const staff =
    members?.map((m) => {
      const p = asJoined(m.profiles);
      const label = m.staff_name || p?.full_name || "Staff";
      return { id: m.id, label };
    }) ?? [];

  const assignedStaffName =
    staff.find((s) => s.id === job.assigned_member_id)?.label ?? null;

  // Keep the current assignee visible even if they fall out of the member query.
  if (
    job.assigned_member_id &&
    !staff.some((s) => s.id === job.assigned_member_id)
  ) {
    const { data: assigned } = await supabase
      .from("business_members")
      .select("id, staff_name, profiles ( full_name )")
      .eq("id", job.assigned_member_id)
      .maybeSingle();
    if (assigned) {
      const p = asJoined(assigned.profiles);
      staff.unshift({
        id: assigned.id,
        label: assigned.staff_name || p?.full_name || "Assigned staff",
      });
    }
  }

  const uniqueInvoices = [
    ...new Map((invoices ?? []).map((inv) => [inv.id, inv])).values(),
  ];

  return (
    <JobDetailPage
      businessId={businessId}
      job={job}
      appointment={{
        start_at: appointment.start_at,
        status: appointment.status,
        service_name: service?.name ?? "Service",
        customer_name: profile?.full_name ?? "Customer",
        unique_key: resolveUniqueKey(
          appointment.custom_fields,
          business?.customer_unique_key_field,
          business?.booking_custom_fields
        ),
      }}
      events={events ?? []}
      staff={staff}
      assignedStaffName={
        assignedStaffName ??
        staff.find((s) => s.id === job.assigned_member_id)?.label ??
        null
      }
      invoices={uniqueInvoices}
      checklists={checklists}
      templates={templates
        .filter((t) => t.is_active)
        .map((t) => ({ id: t.id, name: t.name }))}
      services={services ?? []}
    />
  );
}
