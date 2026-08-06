"use client";

import { Label } from "@/components/ui/label";
import { CATEGORY_CUSTOM_FIELDS, type CustomFieldConfig } from "@/lib/constants";

function isCustomFieldConfig(value: unknown): value is CustomFieldConfig {
    if (!value || typeof value !== "object") return false;
    const field = value as Record<string, unknown>;
    return (
        typeof field.name === "string" &&
        typeof field.label === "string" &&
        typeof field.type === "string"
    );
}

export function CustomBookingFields({
    industryCategory,
    customFields,
}: {
    industryCategory: string;
    customFields?: unknown;
}) {
    const categoryFields =
        CATEGORY_CUSTOM_FIELDS[industryCategory as keyof typeof CATEGORY_CUSTOM_FIELDS] || [];

    const overrideFields = Array.isArray(customFields)
        ? customFields.filter(isCustomFieldConfig)
        : [];

    const fields = overrideFields.length > 0 ? overrideFields : categoryFields;

    if (fields.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80">Additional Information</h3>
            {fields.map((field) => (
                <CustomField key={field.name} field={field} />
            ))}
        </div>
    );
}

function CustomField({ field }: { field: CustomFieldConfig }) {
    const baseClassName =
        "w-full rounded-2xl booking-glass-input px-4 py-3 text-base text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50";

    return (
        <div className="space-y-2">
            <Label htmlFor={field.name} className="text-sm text-white/80">
                {field.label}
                {field.required && <span className="ml-1 text-booking-accent">*</span>}
            </Label>
            {field.description && (
                <p className="text-xs text-booking-muted">{field.description}</p>
            )}

            {field.type === "textarea" ? (
                <textarea
                    id={field.name}
                    name={`custom_${field.name}`}
                    rows={3}
                    placeholder={field.placeholder}
                    required={field.required}
                    className={`${baseClassName} resize-none`}
                />
            ) : field.type === "select" && field.options ? (
                <select
                    id={field.name}
                    name={`custom_${field.name}`}
                    required={field.required}
                    className={baseClassName}
                >
                    <option value="">Select an option</option>
                    {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type={field.type}
                    id={field.name}
                    name={`custom_${field.name}`}
                    placeholder={field.placeholder}
                    required={field.required}
                    className={baseClassName}
                />
            )}
        </div>
    );
}
