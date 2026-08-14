"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus, JobEventVisibility } from "@/types/database";

async function requireMember(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase, user: null };

  const { data: member } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Super-admins may access without membership via RLS helper; still allow if no member row
  if (!member) {
    const { data: isSuper } = await supabase.rpc("current_user_is_super_admin");
    if (!isSuper) {
      return { error: "Not authorized" as const, supabase, user };
    }
  }

  return { supabase, user, error: null as null };
}

async function appendJobEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    jobId: string;
    businessId: string;
    actorUserId?: string | null;
    eventType: string;
    message: string;
    visibility?: JobEventVisibility;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("job_events").insert({
    job_id: params.jobId,
    business_id: params.businessId,
    actor_user_id: params.actorUserId ?? null,
    event_type: params.eventType,
    message: params.message,
    visibility: params.visibility ?? "public",
    metadata: params.metadata ?? {},
  });
  return error;
}

export async function ensureJobForAppointment(
  appointmentId: string,
  businessId: string,
  options?: { status?: JobStatus; actorUserId?: string | null }
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: existing } = await supabase
    .from("jobs")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existing) return { success: true as const, job: existing };

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("id, business_id, customer_id, status, service_id")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .single();

  if (apptError || !appointment) {
    return { error: apptError?.message ?? "Appointment not found" };
  }

  const status: JobStatus =
    options?.status ??
    (appointment.status === "completed"
      ? "completed"
      : appointment.status === "cancelled" || appointment.status === "no_show"
        ? "cancelled"
        : appointment.status === "confirmed"
          ? "queued"
          : "queued");

  const now = new Date().toISOString();
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      business_id: businessId,
      appointment_id: appointmentId,
      customer_id: appointment.customer_id,
      status,
      started_at: status === "in_progress" || status === "completed" ? now : null,
      completed_at: status === "completed" ? now : null,
    })
    .select("*")
    .single();

  if (error || !job) return { error: error?.message ?? "Failed to create job" };

  await appendJobEvent(supabase, {
    jobId: job.id,
    businessId,
    actorUserId: options?.actorUserId ?? user?.id,
    eventType: "created",
    message: "Job created for this appointment",
    visibility: "public",
  });

  const { applyDefaultChecklistForJob } = await import("@/lib/checklists");
  await applyDefaultChecklistForJob(job.id, businessId, appointment.service_id);

  return { success: true as const, job };
}

export async function startJob(jobId: string, businessId: string) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .single();

  if (fetchError || !job) return { error: fetchError?.message ?? "Job not found" };
  if (job.status === "completed" || job.status === "cancelled") {
    return { error: "Cannot start a finished job" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "in_progress",
      started_at: job.started_at ?? now,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  await appendJobEvent(supabase, {
    jobId,
    businessId,
    actorUserId: user?.id,
    eventType: "started",
    message: "Work started",
    visibility: "public",
  });

  revalidatePath(`/dashboard/${businessId}/appointments`);
  revalidatePath(`/dashboard/${businessId}/jobs`);
  revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath("/my-appointments");
  return { success: true };
}

export async function completeJob(jobId: string, businessId: string) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .single();

  if (fetchError || !job) return { error: fetchError?.message ?? "Job not found" };
  if (job.status === "cancelled") return { error: "Cannot complete a cancelled job" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "completed",
      started_at: job.started_at ?? now,
      completed_at: now,
    })
    .eq("id", jobId);

  if (error) return { error: error.message };

  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", job.appointment_id)
    .eq("business_id", businessId);

  await appendJobEvent(supabase, {
    jobId,
    businessId,
    actorUserId: user?.id,
    eventType: "completed",
    message: "Job completed",
    visibility: "public",
  });

  revalidatePath(`/dashboard/${businessId}/appointments`);
  revalidatePath(`/dashboard/${businessId}/jobs`);
  revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath("/my-appointments");
  return { success: true };
}

export async function assignJobStaff(
  jobId: string,
  businessId: string,
  memberId: string | null
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  let staffLabel: string | null = null;
  if (memberId) {
    const { data: member } = await supabase
      .from("business_members")
      .select("id, staff_name, profiles ( full_name )")
      .eq("id", memberId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!member) return { error: "Staff member not found" };
    const profile = Array.isArray(member.profiles)
      ? member.profiles[0]
      : member.profiles;
    staffLabel =
      member.staff_name ||
      (profile && typeof profile === "object" && "full_name" in profile
        ? (profile.full_name as string | null)
        : null) ||
      "Staff";
  }

  const { error } = await supabase
    .from("jobs")
    .update({ assigned_member_id: memberId })
    .eq("id", jobId)
    .eq("business_id", businessId);

  if (error) return { error: error.message };

  await appendJobEvent(supabase, {
    jobId,
    businessId,
    actorUserId: user?.id,
    eventType: "staff_assigned",
    message: memberId
      ? `Assigned to ${staffLabel}`
      : "Staff assignment cleared",
    visibility: "public",
    metadata: { member_id: memberId, staff_name: staffLabel },
  });

  revalidatePath(`/dashboard/${businessId}/jobs`);
  revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath(`/dashboard/${businessId}/appointments`);
  return { success: true };
}

export async function addJobNote(
  jobId: string,
  businessId: string,
  note: string,
  visibility: JobEventVisibility = "public"
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const trimmed = note.trim();
  if (!trimmed) return { error: "Note is required" };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, public_notes, internal_notes")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .single();

  if (!job) return { error: "Job not found" };

  if (visibility === "public") {
    const next = [job.public_notes, trimmed].filter(Boolean).join("\n\n");
    await supabase.from("jobs").update({ public_notes: next }).eq("id", jobId);
  } else {
    const next = [job.internal_notes, trimmed].filter(Boolean).join("\n\n");
    await supabase.from("jobs").update({ internal_notes: next }).eq("id", jobId);
  }

  await appendJobEvent(supabase, {
    jobId,
    businessId,
    actorUserId: user?.id,
    eventType: "note_added",
    message: trimmed,
    visibility,
  });

  revalidatePath(`/dashboard/${businessId}/jobs`);
  revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath("/my-appointments");
  return { success: true };
}

export async function saveJobNextService(
  jobId: string,
  businessId: string,
  input: {
    nextServiceId: string | null;
    dueOn: string | null;
    notes: string | null;
    visibleToCustomer: boolean;
  }
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!job) return { error: "Job not found" };
  if (job.status === "cancelled") {
    return { error: "Cannot set next service on a cancelled job" };
  }

  let nextServiceId = input.nextServiceId;
  let serviceName: string | null = null;
  if (nextServiceId) {
    const { data: service } = await supabase
      .from("services")
      .select("id, name")
      .eq("id", nextServiceId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!service) return { error: "Service not found" };
    serviceName = service.name;
  } else {
    nextServiceId = null;
  }

  const dueOn = input.dueOn?.trim() || null;
  const notes = input.notes?.trim() || null;
  const visible = Boolean(nextServiceId) && input.visibleToCustomer;

  const { error } = await supabase
    .from("jobs")
    .update({
      next_service_id: nextServiceId,
      next_service_name: serviceName,
      next_service_due_on: dueOn,
      next_service_notes: notes,
      next_service_visible: visible,
    })
    .eq("id", jobId)
    .eq("business_id", businessId);
  if (error) return { error: error.message };

  const summary = nextServiceId
    ? `Next service: ${serviceName}${dueOn ? ` due ${dueOn}` : ""}`
    : "Next service recommendation cleared";

  await appendJobEvent(supabase, {
    jobId,
    businessId,
    actorUserId: user?.id,
    eventType: "next_service_set",
    message: summary,
    visibility: visible ? "public" : "internal",
  });

  revalidatePath(`/dashboard/${businessId}/jobs`);
  revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath(`/dashboard/${businessId}/customers`);
  revalidatePath("/my-appointments", "layout");
  return { success: true as const };
}

/** Sync job when appointment status changes from the existing Complete button. */
export async function syncJobFromAppointmentStatus(
  appointmentId: string,
  businessId: string,
  status: string,
  actorUserId?: string | null
) {
  if (status === "confirmed") {
    return ensureJobForAppointment(appointmentId, businessId, {
      status: "queued",
      actorUserId,
    });
  }

  if (status === "completed") {
    const ensured = await ensureJobForAppointment(appointmentId, businessId, {
      status: "completed",
      actorUserId,
    });
    if ("error" in ensured && ensured.error) return ensured;
    const job = "job" in ensured ? ensured.job : null;
    if (job && job.status !== "completed") {
      return completeJob(job.id, businessId);
    }
    return { success: true };
  }

  if (status === "cancelled" || status === "no_show") {
    const gate = await requireMember(businessId);
    if (gate.error) return { error: gate.error };
    const { supabase, user } = gate;

    const { data: job } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("appointment_id", appointmentId)
      .maybeSingle();

    if (!job) return { success: true };
    if (job.status === "completed" || job.status === "cancelled") {
      return { success: true };
    }

    await supabase
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", job.id);

    await appendJobEvent(supabase, {
      jobId: job.id,
      businessId,
      actorUserId: actorUserId ?? user?.id,
      eventType: "status_changed",
      message:
        status === "no_show"
          ? "Appointment marked as no-show; job cancelled"
          : "Appointment cancelled; job cancelled",
      visibility: "public",
    });
  }

  return { success: true };
}

export { appendJobEvent };
