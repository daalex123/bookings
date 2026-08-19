"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSelect } from "@/components/dashboard/admin-select";
import {
    CATEGORY_CUSTOM_FIELDS,
    type CustomFieldConfig,
} from "@/lib/constants";

type FieldType = CustomFieldConfig["type"];

type BuilderField = {
    id: string;
    name: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    description?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
};

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_]/g, "")
        .replace(/[\s-]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function sanitizeField(raw: unknown, index: number): BuilderField | null {
    if (!raw || typeof raw !== "object") return null;

    const obj = raw as Record<string, unknown>;
    const type = obj.type;
    const allowedTypes: FieldType[] = [
        "text",
        "number",
        "email",
        "tel",
        "select",
        "textarea",
    ];

    if (typeof obj.name !== "string" || typeof obj.label !== "string") return null;
    if (typeof type !== "string" || !allowedTypes.includes(type as FieldType)) {
        return null;
    }

    const options = Array.isArray(obj.options)
        ? obj.options
            .map((opt) => {
                if (!opt || typeof opt !== "object") return null;
                const option = opt as Record<string, unknown>;
                if (typeof option.value !== "string" || typeof option.label !== "string") {
                    return null;
                }
                return { value: option.value, label: option.label };
            })
            .filter((v): v is { value: string; label: string } => v !== null)
        : undefined;

    return {
        id: `field-${index}-${obj.name}`,
        name: obj.name,
        label: obj.label,
        type: type as FieldType,
        placeholder: typeof obj.placeholder === "string" ? obj.placeholder : "",
        description: typeof obj.description === "string" ? obj.description : "",
        required: obj.required === true,
        options,
    };
}

function normalizeForSave(fields: BuilderField[]): CustomFieldConfig[] {
    return fields
        .map((field) => {
            const name = toSlug(field.name || field.label);
            if (!name || !field.label.trim()) return null;

            const normalized: CustomFieldConfig = {
                name,
                label: field.label.trim(),
                type: field.type,
                required: field.required === true,
            };

            if (field.placeholder?.trim()) normalized.placeholder = field.placeholder.trim();
            if (field.description?.trim()) normalized.description = field.description.trim();

            if (field.type === "select") {
                const options = (field.options ?? [])
                    .map((opt) => ({ value: opt.value.trim(), label: opt.label.trim() }))
                    .filter((opt) => opt.value.length > 0 && opt.label.length > 0);

                normalized.options = options;
            }

            return normalized;
        })
        .filter((f): f is CustomFieldConfig => f !== null);
}

function getCategoryDefaults(category: string): BuilderField[] {
    const defaults =
        CATEGORY_CUSTOM_FIELDS[category as keyof typeof CATEGORY_CUSTOM_FIELDS] ?? [];
    return defaults.map((f, idx) => ({
        id: `default-${idx}-${f.name}`,
        name: f.name,
        label: f.label,
        type: f.type,
        placeholder: f.placeholder ?? "",
        description: f.description ?? "",
        required: f.required === true,
        options: f.options ? [...f.options] : [],
    }));
}

export function BookingCustomFieldsBuilder({
    initialCategory,
    initialFields,
    initialUniqueKey = "",
}: {
    initialCategory: string;
    initialFields: unknown;
    initialUniqueKey?: string | null;
}) {
    const hasExplicitOverride = Array.isArray(initialFields);
    const parsedInitial = Array.isArray(initialFields)
        ? initialFields
            .map((f, idx) => sanitizeField(f, idx))
            .filter((f): f is BuilderField => f !== null)
        : [];

    const [fields, setFields] = useState<BuilderField[]>(
        hasExplicitOverride ? parsedInitial : getCategoryDefaults(initialCategory)
    );
    const [uniqueKey, setUniqueKey] = useState(() => {
        const names = (
            hasExplicitOverride ? parsedInitial : getCategoryDefaults(initialCategory)
        ).map((f) => f.name);
        if (initialUniqueKey && names.includes(initialUniqueKey)) return initialUniqueKey;
        return "";
    });

    const serializedValue = useMemo(
        () => JSON.stringify(normalizeForSave(fields)),
        [fields]
    );

    function addField(type: FieldType) {
        const next = fields.length + 1;
        setFields((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}-${next}`,
                name: `custom_field_${next}`,
                label: `Custom Field ${next}`,
                type,
                required: false,
                placeholder: "",
                description: "",
                options:
                    type === "select"
                        ? [{ value: "option_1", label: "Option 1" }]
                        : [],
            },
        ]);
    }

    function updateField(id: string, changes: Partial<BuilderField>) {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));
    }

    function removeField(id: string) {
        setFields((prev) => prev.filter((f) => f.id !== id));
    }

    function resetToCategoryDefaults() {
        const select = document.getElementById("industry_category") as HTMLSelectElement | null;
        const selectedCategory = select?.value || initialCategory;
        const next = getCategoryDefaults(selectedCategory);
        setFields(next);
        const names = next.map((f) => f.name);
        if (names.includes("vehicle_number")) setUniqueKey("vehicle_number");
        else if (names.includes("patient_id")) setUniqueKey("patient_id");
        else setUniqueKey("");
    }

    return (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/40 p-4">
            <input type="hidden" name="booking_custom_fields_json" value={serializedValue} />
            <input type="hidden" name="customer_unique_key_field" value={uniqueKey} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Label className="text-sm font-semibold text-zinc-800">
                        Booking custom fields
                    </Label>
                    <p className="text-xs text-zinc-500">
                        Add customer fields shown in the booking form. Mark one as the unique
                        key so it maps to the customer on checklists and invoices.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToCategoryDefaults}
                >
                    <RotateCcw className="h-4 w-4" />
                    Load category defaults
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addField("text")}>
                    <Plus className="h-4 w-4" /> Text field
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addField("select")}>
                    <Plus className="h-4 w-4" /> Select field
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addField("textarea")}>
                    <Plus className="h-4 w-4" /> Textarea field
                </Button>
            </div>

            <div className="space-y-3">
                {fields.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
                        No custom fields configured. Add one using buttons above.
                    </p>
                ) : (
                    fields.map((field, index) => (
                        <div key={field.id} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-zinc-800">Field {index + 1}</p>
                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 text-xs font-medium text-[#1e2235]">
                                        <input
                                            type="radio"
                                            name="unique_key_radio"
                                            checked={uniqueKey === field.name && field.name.length > 0}
                                            onChange={() => setUniqueKey(field.name)}
                                        />
                                        Unique key
                                    </label>
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeField(field.id)}
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </Button>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>Label</Label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        placeholder="Vehicle Number"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Field key</Label>
                                    <Input
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: toSlug(e.target.value) })}
                                        placeholder="vehicle_number"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>Type</Label>
                                    <AdminSelect
                                        value={field.type}
                                        onChange={(e) => {
                                            const nextType = e.target.value as FieldType;
                                            updateField(field.id, {
                                                type: nextType,
                                                options:
                                                    nextType === "select"
                                                        ? field.options && field.options.length > 0
                                                            ? field.options
                                                            : [{ value: "option_1", label: "Option 1" }]
                                                        : [],
                                            });
                                        }}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="email">Email</option>
                                        <option value="tel">Phone</option>
                                        <option value="textarea">Textarea</option>
                                        <option value="select">Select</option>
                                    </AdminSelect>
                                </div>
                                <div className="space-y-1">
                                    <Label>Required</Label>
                                    <label className="flex h-10 items-center gap-2 rounded-xl border border-[#1e2235]/10 bg-white px-3 py-2 text-sm text-[#1e2235]">
                                        <input
                                            type="checkbox"
                                            checked={field.required === true}
                                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        />
                                        Required field
                                    </label>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>Placeholder</Label>
                                    <Input
                                        value={field.placeholder ?? ""}
                                        onChange={(e) =>
                                            updateField(field.id, { placeholder: e.target.value })
                                        }
                                        placeholder="e.g., ABC-1234"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Description</Label>
                                    <Input
                                        value={field.description ?? ""}
                                        onChange={(e) =>
                                            updateField(field.id, { description: e.target.value })
                                        }
                                        placeholder="Shown below label"
                                    />
                                </div>
                            </div>

                            {field.type === "select" && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Select options</Label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const current = field.options ?? [];
                                                updateField(field.id, {
                                                    options: [
                                                        ...current,
                                                        {
                                                            value: `option_${current.length + 1}`,
                                                            label: `Option ${current.length + 1}`,
                                                        },
                                                    ],
                                                });
                                            }}
                                        >
                                            <Plus className="h-4 w-4" /> Add option
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {(field.options ?? []).map((opt, optionIndex) => (
                                            <div key={`${field.id}-opt-${optionIndex}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                                <Input
                                                    value={opt.value}
                                                    onChange={(e) => {
                                                        const next = [...(field.options ?? [])];
                                                        next[optionIndex] = {
                                                            ...next[optionIndex],
                                                            value: toSlug(e.target.value),
                                                        };
                                                        updateField(field.id, { options: next });
                                                    }}
                                                    placeholder="value"
                                                />
                                                <Input
                                                    value={opt.label}
                                                    onChange={(e) => {
                                                        const next = [...(field.options ?? [])];
                                                        next[optionIndex] = {
                                                            ...next[optionIndex],
                                                            label: e.target.value,
                                                        };
                                                        updateField(field.id, { options: next });
                                                    }}
                                                    placeholder="Label"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const next = (field.options ?? []).filter(
                                                            (_, i) => i !== optionIndex
                                                        );
                                                        updateField(field.id, { options: next });
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {fields.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-[#5c6378]">
                    <input
                        type="radio"
                        name="unique_key_radio"
                        checked={uniqueKey === ""}
                        onChange={() => setUniqueKey("")}
                    />
                    No unique key field
                </label>
            )}
        </div>
    );
}
