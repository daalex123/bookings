import type { JobChecklistItemType } from "@/types/database";

export type ChecklistStatusOption = {
  code: string;
  label: string;
};

export type ChecklistHeaderField = {
  id: string;
  label: string;
  type: "text" | "number" | "date";
};

export type ChecklistTemplateItemInput = {
  label: string;
  item_type: JobChecklistItemType;
};

export type ChecklistTemplateSectionInput = {
  title: string;
  items: ChecklistTemplateItemInput[];
};

export type ChecklistTemplateInput = {
  id?: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  status_options: ChecklistStatusOption[];
  header_fields: ChecklistHeaderField[];
  sections: ChecklistTemplateSectionInput[];
};

export type ChecklistTemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  updated_at: string;
  section_count: number;
  item_count: number;
};

export type ChecklistItemPreset = {
  id: string;
  label: string;
  item_type: JobChecklistItemType;
  use_count: number;
};

export type ChecklistTemplateDetail = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  status_options: ChecklistStatusOption[];
  header_fields: ChecklistHeaderField[];
  sections: {
    id: string;
    title: string;
    items: { id: string; label: string; item_type: JobChecklistItemType }[];
  }[];
};

export type JobChecklistResponseView = {
  id: string;
  section_title: string;
  label: string;
  sort_order: number;
  item_type: JobChecklistItemType;
  value: string | null;
};

export type JobChecklistView = {
  id: string;
  title: string;
  template_id: string | null;
  status_options: ChecklistStatusOption[];
  header_fields: ChecklistHeaderField[];
  header_values: Record<string, string>;
  comments: string | null;
  responses: JobChecklistResponseView[];
};

export const DEFAULT_STATUS_OPTIONS: ChecklistStatusOption[] = [
  { code: "ok", label: "Checked" },
  { code: "A", label: "Adjusted" },
  { code: "C", label: "Clean" },
  { code: "R", label: "Replace" },
  { code: "X", label: "Problem" },
  { code: "N/A", label: "Not applicable" },
];

export function parseStatusOptions(value: unknown): ChecklistStatusOption[] {
  if (!Array.isArray(value)) return DEFAULT_STATUS_OPTIONS;
  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.code !== "string" || typeof row.label !== "string") return null;
      const code = row.code.trim();
      const label = row.label.trim();
      if (!code || !label) return null;
      return { code, label };
    })
    .filter((v): v is ChecklistStatusOption => v !== null);
  return parsed.length > 0 ? parsed : DEFAULT_STATUS_OPTIONS;
}

export function parseHeaderFields(value: unknown): ChecklistHeaderField[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      if (!label) return null;
      const type =
        row.type === "number" || row.type === "date" ? row.type : "text";
      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim()
          : `field_${index}`;
      return { id, label, type };
    })
    .filter((v): v is ChecklistHeaderField => v !== null);
}

export function parseHeaderValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "string") out[key] = val;
    else if (typeof val === "number") out[key] = String(val);
  }
  return out;
}

export function groupResponsesBySection(responses: JobChecklistResponseView[]) {
  const sections: { title: string; items: JobChecklistResponseView[] }[] = [];
  for (const response of responses) {
    const last = sections[sections.length - 1];
    if (last && last.title === response.section_title) {
      last.items.push(response);
    } else {
      sections.push({ title: response.section_title, items: [response] });
    }
  }
  return sections;
}
