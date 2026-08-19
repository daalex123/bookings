import type { CustomFieldConfig } from "@/lib/constants";

export type UniqueKeyRef = {
  field: string;
  label: string;
  value: string;
};

export function parseCustomFieldConfigs(value: unknown): CustomFieldConfig[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (typeof row.name !== "string" || typeof row.label !== "string") {
        return null;
      }
      return {
        name: row.name,
        label: row.label,
        type: (typeof row.type === "string" ? row.type : "text") as CustomFieldConfig["type"],
      };
    })
    .filter((v): v is CustomFieldConfig => v !== null);
}

export function uniqueKeyLabel(
  fields: unknown,
  fieldName: string | null | undefined
): string {
  if (!fieldName) return "Reference";
  const match = parseCustomFieldConfigs(fields).find((f) => f.name === fieldName);
  return match?.label?.trim() || fieldName.replace(/_/g, " ");
}

export function extractUniqueKeyValue(
  customFields: unknown,
  fieldName: string | null | undefined
): string | null {
  if (!fieldName || !customFields || typeof customFields !== "object") {
    return null;
  }
  const value = (customFields as Record<string, unknown>)[fieldName];
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export function resolveUniqueKey(
  customFields: unknown,
  fieldName: string | null | undefined,
  fieldConfigs: unknown
): UniqueKeyRef | null {
  const value = extractUniqueKeyValue(customFields, fieldName);
  if (!fieldName || !value) return null;
  return {
    field: fieldName,
    label: uniqueKeyLabel(fieldConfigs, fieldName),
    value,
  };
}

export function collectUniqueKeys(
  appointments: Array<{ custom_fields?: unknown } | null | undefined>,
  fieldName: string | null | undefined,
  fieldConfigs: unknown
): UniqueKeyRef[] {
  if (!fieldName) return [];
  const seen = new Set<string>();
  const out: UniqueKeyRef[] = [];
  for (const appt of appointments) {
    const key = resolveUniqueKey(appt?.custom_fields, fieldName, fieldConfigs);
    if (!key) continue;
    const token = key.value.toLowerCase();
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(key);
  }
  return out;
}

export function formatUniqueKey(key: UniqueKeyRef | null | undefined): string | null {
  if (!key?.value) return null;
  return `${key.label}: ${key.value}`;
}
