"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { JobChecklistItemType } from "@/types/database";
import {
  DEFAULT_STATUS_OPTIONS,
  parseHeaderFields,
  parseHeaderValues,
  parseStatusOptions,
  type ChecklistHeaderField,
  type ChecklistStatusOption,
  type ChecklistItemPreset,
  type ChecklistTemplateDetail,
  type ChecklistTemplateInput,
  type ChecklistTemplateListItem,
  type JobChecklistView,
} from "@/lib/checklist-types";

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

  if (!member) {
    const { data: isSuper } = await supabase.rpc("current_user_is_super_admin");
    if (!isSuper) {
      return { error: "Not authorized" as const, supabase, user };
    }
  }

  return { supabase, user, error: null as null };
}

function revalidateJobPaths(businessId: string, jobId?: string) {
  revalidatePath(`/dashboard/${businessId}/jobs`);
  if (jobId) revalidatePath(`/dashboard/${businessId}/jobs/${jobId}`);
  revalidatePath(`/dashboard/${businessId}/checklists`);
  revalidatePath("/my-appointments", "layout");
}

export async function listChecklistItemPresets(
  businessId: string,
  limit = 120
): Promise<ChecklistItemPreset[]> {
  const gate = await requireMember(businessId);
  if (gate.error) return [];
  const { supabase } = gate;

  const { data } = await supabase
    .from("checklist_item_presets")
    .select("id, label, item_type, use_count")
    .eq("business_id", businessId)
    .order("last_used_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    item_type: row.item_type,
    use_count: row.use_count,
  }));
}

export async function listChecklistSectionTitles(
  businessId: string
): Promise<string[]> {
  const gate = await requireMember(businessId);
  if (gate.error) return [];
  const { supabase } = gate;

  const { data: templates } = await supabase
    .from("job_checklist_templates")
    .select("id")
    .eq("business_id", businessId);
  if (!templates?.length) return [];

  const { data: sections } = await supabase
    .from("job_checklist_template_sections")
    .select("title")
    .in(
      "template_id",
      templates.map((t) => t.id)
    );

  const titles = new Set<string>();
  for (const section of sections ?? []) {
    const title = section.title.trim();
    if (title) titles.add(title);
  }
  return Array.from(titles).sort((a, b) => a.localeCompare(b));
}

async function rememberChecklistItemPresets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  sections: { title: string; items: { label: string; item_type: JobChecklistItemType }[] }[]
) {
  const now = new Date().toISOString();
  const seen = new Set<string>();

  for (const section of sections) {
    for (const item of section.items) {
      const label = item.label.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const { data: existing } = await supabase
        .from("checklist_item_presets")
        .select("id, use_count")
        .eq("business_id", businessId)
        .ilike("label", label)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("checklist_item_presets")
          .update({
            label,
            item_type: item.item_type,
            use_count: (existing.use_count ?? 1) + 1,
            last_used_at: now,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("checklist_item_presets").insert({
          business_id: businessId,
          label,
          item_type: item.item_type,
          use_count: 1,
          last_used_at: now,
        });
      }
    }
  }
}

function sanitizeTemplateInput(input: ChecklistTemplateInput): {
  name: string;
  description: string | null;
  is_active: boolean;
  status_options: ChecklistStatusOption[];
  header_fields: ChecklistHeaderField[];
  sections: { title: string; items: { label: string; item_type: JobChecklistItemType }[] }[];
} | { error: string } {
  const name = input.name?.trim() ?? "";
  if (name.length < 2) return { error: "Template name is required" };

  const status_options = parseStatusOptions(input.status_options);
  const header_fields = parseHeaderFields(input.header_fields);
  const sections = (input.sections ?? [])
    .map((section) => ({
      title: section.title.trim() || "Untitled",
      items: (section.items ?? [])
        .map((item) => ({
          label: item.label.trim(),
          item_type:
            item.item_type === "text" || item.item_type === "number"
              ? item.item_type
              : ("status" as const),
        }))
        .filter((item) => item.label.length > 0),
    }))
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return { error: "Add at least one section with a checklist item" };
  }

  return {
    name,
    description: input.description?.trim() || null,
    is_active: input.is_active !== false,
    status_options,
    header_fields,
    sections,
  };
}

export async function listChecklistTemplates(
  businessId: string
): Promise<ChecklistTemplateListItem[]> {
  const gate = await requireMember(businessId);
  if (gate.error) return [];
  const { supabase } = gate;

  const { data: templates } = await supabase
    .from("job_checklist_templates")
    .select("id, name, description, is_active, updated_at")
    .eq("business_id", businessId)
    .order("name");

  if (!templates?.length) return [];

  const ids = templates.map((t) => t.id);
  const { data: sections } = await supabase
    .from("job_checklist_template_sections")
    .select("id, template_id")
    .in("template_id", ids);

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("job_checklist_template_items")
          .select("id, section_id")
          .in("section_id", sectionIds)
      : { data: [] };

  const sectionCount = new Map<string, number>();
  for (const section of sections ?? []) {
    sectionCount.set(section.template_id, (sectionCount.get(section.template_id) ?? 0) + 1);
  }
  const itemsBySection = new Map<string, number>();
  for (const item of items ?? []) {
    itemsBySection.set(item.section_id, (itemsBySection.get(item.section_id) ?? 0) + 1);
  }
  const itemCount = new Map<string, number>();
  for (const section of sections ?? []) {
    itemCount.set(
      section.template_id,
      (itemCount.get(section.template_id) ?? 0) + (itemsBySection.get(section.id) ?? 0)
    );
  }

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    is_active: t.is_active,
    updated_at: t.updated_at,
    section_count: sectionCount.get(t.id) ?? 0,
    item_count: itemCount.get(t.id) ?? 0,
  }));
}

export async function getChecklistTemplate(
  businessId: string,
  templateId: string
): Promise<ChecklistTemplateDetail | null> {
  const gate = await requireMember(businessId);
  if (gate.error) return null;
  const { supabase } = gate;

  const { data: template } = await supabase
    .from("job_checklist_templates")
    .select("*")
    .eq("id", templateId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!template) return null;

  const { data: sections } = await supabase
    .from("job_checklist_template_sections")
    .select("id, title, sort_order")
    .eq("template_id", templateId)
    .order("sort_order");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("job_checklist_template_items")
          .select("id, section_id, label, item_type, sort_order")
          .in("section_id", sectionIds)
          .order("sort_order")
      : { data: [] };

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    is_active: template.is_active,
    status_options: parseStatusOptions(template.status_options),
    header_fields: parseHeaderFields(template.header_fields),
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      items: (items ?? [])
        .filter((item) => item.section_id === section.id)
        .map((item) => ({
          id: item.id,
          label: item.label,
          item_type: item.item_type,
        })),
    })),
  };
}

export async function upsertChecklistTemplate(
  businessId: string,
  input: ChecklistTemplateInput
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase } = gate;

  const parsed = sanitizeTemplateInput(input);
  if ("error" in parsed) return { error: parsed.error };

  let templateId = input.id ?? null;

  if (templateId) {
    const { error } = await supabase
      .from("job_checklist_templates")
      .update({
        name: parsed.name,
        description: parsed.description,
        is_active: parsed.is_active,
        status_options: parsed.status_options,
        header_fields: parsed.header_fields,
      })
      .eq("id", templateId)
      .eq("business_id", businessId);
    if (error) return { error: error.message };

    await supabase
      .from("job_checklist_template_sections")
      .delete()
      .eq("template_id", templateId);
  } else {
    const { data: created, error } = await supabase
      .from("job_checklist_templates")
      .insert({
        business_id: businessId,
        name: parsed.name,
        description: parsed.description,
        is_active: parsed.is_active,
        status_options: parsed.status_options,
        header_fields: parsed.header_fields,
      })
      .select("id")
      .single();
    if (error || !created) return { error: error?.message ?? "Failed to create template" };
    templateId = created.id;
  }

  for (const [sectionIndex, section] of parsed.sections.entries()) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("job_checklist_template_sections")
      .insert({
        template_id: templateId,
        title: section.title,
        sort_order: sectionIndex,
      })
      .select("id")
      .single();
    if (sectionError || !sectionRow) {
      return { error: sectionError?.message ?? "Failed to save section" };
    }

    const rows = section.items.map((item, itemIndex) => ({
      section_id: sectionRow.id,
      label: item.label,
      item_type: item.item_type,
      sort_order: itemIndex,
    }));
    const { error: itemsError } = await supabase
      .from("job_checklist_template_items")
      .insert(rows);
    if (itemsError) return { error: itemsError.message };
  }

  if (!templateId) return { error: "Failed to save template" };

  await rememberChecklistItemPresets(supabase, businessId, parsed.sections);

  revalidatePath(`/dashboard/${businessId}/checklists`);
  revalidatePath(`/dashboard/${businessId}/checklists/${templateId}`);
  revalidatePath(`/dashboard/${businessId}/services`);
  return { success: true as const, templateId };
}

export async function deleteChecklistTemplate(
  businessId: string,
  templateId: string
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase } = gate;

  const { error } = await supabase
    .from("job_checklist_templates")
    .delete()
    .eq("id", templateId)
    .eq("business_id", businessId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${businessId}/checklists`);
  revalidatePath(`/dashboard/${businessId}/services`);
  return { success: true as const };
}

export async function applyChecklistToJob(
  jobId: string,
  businessId: string,
  templateId: string
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
    return { error: "Cannot apply a checklist to a cancelled job" };
  }

  const { data: template } = await supabase
    .from("job_checklist_templates")
    .select("*")
    .eq("id", templateId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!template) return { error: "Template not found" };

  const { data: sections } = await supabase
    .from("job_checklist_template_sections")
    .select("id, title, sort_order")
    .eq("template_id", templateId)
    .order("sort_order");

  const sectionIds = (sections ?? []).map((s) => s.id);
  const { data: items } =
    sectionIds.length > 0
      ? await supabase
          .from("job_checklist_template_items")
          .select("id, section_id, label, item_type, sort_order")
          .in("section_id", sectionIds)
          .order("sort_order")
      : { data: [] };

  const { data: checklist, error } = await supabase
    .from("job_checklists")
    .insert({
      job_id: jobId,
      business_id: businessId,
      template_id: templateId,
      title: template.name,
      status_options: parseStatusOptions(template.status_options),
      header_fields: parseHeaderFields(template.header_fields),
      header_values: {},
    })
    .select("id")
    .single();

  if (error || !checklist) return { error: error?.message ?? "Failed to apply template" };

  const responses: {
    checklist_id: string;
    section_title: string;
    label: string;
    sort_order: number;
    item_type: JobChecklistItemType;
  }[] = [];
  let sort = 0;
  for (const section of sections ?? []) {
    const sectionItems = (items ?? [])
      .filter((item) => item.section_id === section.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const item of sectionItems) {
      responses.push({
        checklist_id: checklist.id,
        section_title: section.title,
        label: item.label,
        sort_order: sort++,
        item_type: item.item_type,
      });
    }
  }

  if (responses.length > 0) {
    const { error: responseError } = await supabase
      .from("job_checklist_responses")
      .insert(responses);
    if (responseError) return { error: responseError.message };
  }

  await supabase.from("job_events").insert({
    job_id: jobId,
    business_id: businessId,
    actor_user_id: user?.id ?? null,
    event_type: "checklist_applied",
    message: `Checklist “${template.name}” added`,
    visibility: "public",
  });

  revalidateJobPaths(businessId, jobId);
  return { success: true as const, checklistId: checklist.id };
}

export async function applyDefaultChecklistForJob(
  jobId: string,
  businessId: string,
  serviceId: string
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase } = gate;

  const { data: service } = await supabase
    .from("services")
    .select("default_checklist_template_id")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!service?.default_checklist_template_id) return { success: true as const };
  return applyChecklistToJob(jobId, businessId, service.default_checklist_template_id);
}

export async function removeJobChecklist(
  businessId: string,
  jobId: string,
  checklistId: string
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: job } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!job) return { error: "Job not found" };
  if (job.status === "completed" || job.status === "cancelled") {
    return { error: "Cannot remove a checklist from a finished job" };
  }

  const { data: checklist } = await supabase
    .from("job_checklists")
    .select("id, title")
    .eq("id", checklistId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!checklist) return { error: "Checklist not found" };

  const { error } = await supabase
    .from("job_checklists")
    .delete()
    .eq("id", checklistId);
  if (error) return { error: error.message };

  await supabase.from("job_events").insert({
    job_id: jobId,
    business_id: businessId,
    actor_user_id: user?.id ?? null,
    event_type: "checklist_removed",
    message: `Checklist “${checklist.title}” removed`,
    visibility: "internal",
  });

  revalidateJobPaths(businessId, jobId);
  return { success: true as const };
}

export async function saveJobChecklist(
  businessId: string,
  jobId: string,
  checklistId: string,
  payload: {
    header_values: Record<string, string>;
    comments: string;
    responses: { id: string; value: string | null }[];
    silent?: boolean;
  }
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: checklist } = await supabase
    .from("job_checklists")
    .select("id, title")
    .eq("id", checklistId)
    .eq("job_id", jobId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!checklist) return { error: "Checklist not found" };

  const { error: updateError } = await supabase
    .from("job_checklists")
    .update({
      header_values: payload.header_values,
      comments: payload.comments.trim() || null,
    })
    .eq("id", checklistId);
  if (updateError) return { error: updateError.message };

  for (const response of payload.responses) {
    const { error } = await supabase
      .from("job_checklist_responses")
      .update({ value: response.value?.trim() ? response.value.trim() : null })
      .eq("id", response.id)
      .eq("checklist_id", checklistId);
    if (error) return { error: error.message };
  }

  if (!payload.silent) {
    await supabase.from("job_events").insert({
      job_id: jobId,
      business_id: businessId,
      actor_user_id: user?.id ?? null,
      event_type: "checklist_updated",
      message: `Checklist “${checklist.title}” updated`,
      visibility: "public",
    });
  }

  revalidateJobPaths(businessId, jobId);
  return { success: true as const };
}

export async function getJobChecklists(
  businessId: string,
  jobId: string
): Promise<JobChecklistView[]> {
  const supabase = await createClient();
  const { data: checklists } = await supabase
    .from("job_checklists")
    .select("*")
    .eq("job_id", jobId)
    .eq("business_id", businessId)
    .order("created_at");

  if (!checklists?.length) return [];

  const ids = checklists.map((c) => c.id);
  const { data: responses } = await supabase
    .from("job_checklist_responses")
    .select("*")
    .in("checklist_id", ids)
    .order("sort_order");

  return checklists.map((checklist) => ({
    id: checklist.id,
    title: checklist.title,
    template_id: checklist.template_id,
    status_options: parseStatusOptions(checklist.status_options),
    header_fields: parseHeaderFields(checklist.header_fields),
    header_values: parseHeaderValues(checklist.header_values),
    comments: checklist.comments,
    responses: (responses ?? [])
      .filter((row) => row.checklist_id === checklist.id)
      .map((row) => ({
        id: row.id,
        section_title: row.section_title,
        label: row.label,
        sort_order: row.sort_order,
        item_type: row.item_type,
        value: row.value,
      })),
  }));
}
