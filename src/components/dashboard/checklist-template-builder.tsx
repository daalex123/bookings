"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "@/lib/admin-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  deleteChecklistTemplate,
  upsertChecklistTemplate,
} from "@/lib/checklists";
import {
  DEFAULT_STATUS_OPTIONS,
  type ChecklistHeaderField,
  type ChecklistItemPreset,
  type ChecklistStatusOption,
  type ChecklistTemplateDetail,
  type ChecklistTemplateItemInput,
  type ChecklistTemplateSectionInput,
} from "@/lib/checklist-types";
import type { JobChecklistItemType } from "@/types/database";

function newKey() {
  return Math.random().toString(36).slice(2);
}

type BuilderItem = ChecklistTemplateItemInput & { key: string };
type BuilderSection = { key: string; title: string; items: BuilderItem[] };

function emptyItem(preset?: Partial<ChecklistTemplateItemInput>): BuilderItem {
  return {
    key: newKey(),
    label: preset?.label ?? "",
    item_type: preset?.item_type ?? "status",
  };
}

function emptySection(): BuilderSection {
  return { key: newKey(), title: "", items: [emptyItem()] };
}

export function ChecklistTemplateBuilder({
  businessId,
  template,
  savedItems = [],
  sectionTitles = [],
}: {
  businessId: string;
  template?: ChecklistTemplateDetail | null;
  savedItems?: ChecklistItemPreset[];
  sectionTitles?: string[];
}) {
  const router = useRouter();
  const { runWithToast } = useActionToast();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [statusOptions, setStatusOptions] = useState<ChecklistStatusOption[]>(
    template?.status_options?.length
      ? template.status_options
      : DEFAULT_STATUS_OPTIONS
  );
  const [headerFields, setHeaderFields] = useState<
    (ChecklistHeaderField & { key: string })[]
  >(
    (template?.header_fields ?? []).map((field) => ({
      ...field,
      key: newKey(),
    }))
  );
  const [sections, setSections] = useState<BuilderSection[]>(
    template?.sections?.length
      ? template.sections.map((section) => ({
          key: newKey(),
          title: section.title,
          items: section.items.map((item) => ({
            key: newKey(),
            label: item.label,
            item_type: item.item_type,
          })),
        }))
      : [emptySection()]
  );
  const [savedPickBySection, setSavedPickBySection] = useState<
    Record<string, string>
  >({});

  const itemCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.items.length, 0),
    [sections]
  );

  const itemDatalistId = `checklist-item-presets-${businessId}`;
  const sectionDatalistId = `checklist-section-titles-${businessId}`;

  const savedSuggestions = useMemo(() => {
    const byLabel = new Map<string, ChecklistItemPreset>();
    for (const item of savedItems) {
      const key = item.label.trim().toLowerCase();
      if (!key || byLabel.has(key)) continue;
      byLabel.set(key, item);
    }
    return Array.from(byLabel.values());
  }, [savedItems]);

  function applySavedLabel(
    sectionKey: string,
    itemKey: string,
    label: string
  ) {
    const match = savedSuggestions.find(
      (item) => item.label.toLowerCase() === label.trim().toLowerCase()
    );
    setSections((prev) =>
      prev.map((row) =>
        row.key === sectionKey
          ? {
              ...row,
              items: row.items.map((it) =>
                it.key === itemKey
                  ? match
                    ? {
                        ...it,
                        label: match.label,
                        item_type: match.item_type,
                      }
                    : { ...it, label }
                  : it
              ),
            }
          : row
      )
    );
  }

  function addSavedItem(sectionKey: string) {
    const presetId = savedPickBySection[sectionKey];
    const preset = savedSuggestions.find((item) => item.id === presetId);
    if (!preset) return;
    setSections((prev) =>
      prev.map((row) =>
        row.key === sectionKey
          ? {
              ...row,
              items: [
                ...row.items,
                emptyItem({
                  label: preset.label,
                  item_type: preset.item_type,
                }),
              ],
            }
          : row
      )
    );
    setSavedPickBySection((prev) => ({ ...prev, [sectionKey]: "" }));
  }

  async function onSave() {
    const result = await runWithToast(
      () =>
        upsertChecklistTemplate(businessId, {
          id: template?.id,
          name,
          description,
          is_active: isActive,
          status_options: statusOptions,
          header_fields: headerFields.map(({ key: _k, ...rest }) => rest),
          sections: sections.map(
            (section): ChecklistTemplateSectionInput => ({
              title: section.title,
              items: section.items.map(({ key: _k, ...item }) => item),
            })
          ),
        }),
      {
        loading: "Saving template…",
        success: template ? "Template saved" : "Template created",
      }
    );
    if (result.success && result.result && typeof result.result === "object") {
      const id =
        "templateId" in result.result
          ? (result.result as { templateId: string }).templateId
          : template?.id;
      if (id && !template?.id) {
        router.push(`/dashboard/${businessId}/checklists/${id}`);
      }
    }
  }

  async function onDelete() {
    if (!template?.id) return;
    if (!window.confirm("Delete this checklist template?")) return;
    const result = await runWithToast(
      () => deleteChecklistTemplate(businessId, template.id),
      { loading: "Deleting…", success: "Template deleted" }
    );
    if (result.success) {
      router.push(`/dashboard/${businessId}/checklists`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={template ? "Edit checklist" : "New checklist"}
        description="Design the form staff fill on a job. Customers see the completed version."
      />

      <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
        <h2 className="text-sm font-semibold text-[#1e2235]">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Multipoint inspection"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Active — can be applied to jobs
          </label>
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes for staff"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1e2235]">Header fields</h2>
            <p className="text-xs text-[#8b92a5]">
              Extra details at the top of the form (vehicle no, mileage, oil grade).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setHeaderFields((prev) => [
                ...prev,
                {
                  key: newKey(),
                  id: `field_${newKey()}`,
                  label: "",
                  type: "text",
                },
              ])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add field
          </Button>
        </div>
        {headerFields.length === 0 && (
          <p className="text-sm text-[#8b92a5]">No header fields yet.</p>
        )}
        <div className="space-y-2">
          {headerFields.map((field) => (
            <div key={field.key} className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_auto]">
              <Input
                value={field.label}
                placeholder="Label"
                onChange={(e) =>
                  setHeaderFields((prev) =>
                    prev.map((row) =>
                      row.key === field.key ? { ...row, label: e.target.value } : row
                    )
                  )
                }
              />
              <AdminSelect
                value={field.type}
                onChange={(e) =>
                  setHeaderFields((prev) =>
                    prev.map((row) =>
                      row.key === field.key
                        ? { ...row, type: e.target.value as ChecklistHeaderField["type"] }
                        : row
                    )
                  )
                }
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </AdminSelect>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setHeaderFields((prev) => prev.filter((row) => row.key !== field.key))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#1e2235]">Status codes</h2>
          <p className="text-xs text-[#8b92a5]">
            Codes staff tap for each inspection item (A, ok, X, N/A, C, R).
          </p>
        </div>
        <div className="space-y-2">
          {statusOptions.map((option, index) => (
            <div key={`${option.code}-${index}`} className="grid gap-2 sm:grid-cols-[0.5fr_1.2fr_auto]">
              <Input
                value={option.code}
                placeholder="Code"
                onChange={(e) =>
                  setStatusOptions((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, code: e.target.value } : row
                    )
                  )
                }
              />
              <Input
                value={option.label}
                placeholder="Label"
                onChange={(e) =>
                  setStatusOptions((prev) =>
                    prev.map((row, i) =>
                      i === index ? { ...row, label: e.target.value } : row
                    )
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setStatusOptions((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setStatusOptions((prev) => [...prev, { code: "", label: "" }])
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add code
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1e2235]">
              Sections &amp; items
            </h2>
            <p className="text-xs text-[#8b92a5]">
              {sections.length} section{sections.length === 1 ? "" : "s"} · {itemCount}{" "}
              item{itemCount === 1 ? "" : "s"}. Previously used labels autocomplete as
              you type.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSections((prev) => [...prev, emptySection()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add section
          </Button>
        </div>

        <datalist id={itemDatalistId}>
          {savedSuggestions.map((item) => (
            <option
              key={item.id}
              value={item.label}
              label={`${item.item_type} · used ${item.use_count}×`}
            />
          ))}
        </datalist>
        <datalist id={sectionDatalistId}>
          {sectionTitles.map((title) => (
            <option key={title} value={title} />
          ))}
        </datalist>

        <div className="space-y-5">
          {sections.map((section) => (
            <div
              key={section.key}
              className="space-y-3 rounded-xl border border-[#1e2235]/8 p-4"
            >
              <div className="flex gap-2">
                <Input
                  value={section.title}
                  list={sectionDatalistId}
                  placeholder="Section title (e.g. Fluids & filters)"
                  autoComplete="off"
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((row) =>
                        row.key === section.key
                          ? { ...row, title: e.target.value }
                          : row
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSections((prev) => prev.filter((row) => row.key !== section.key))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_auto]"
                >
                  <Input
                    value={item.label}
                    list={itemDatalistId}
                    placeholder="Item (e.g. Engine oil level)"
                    autoComplete="off"
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((row) =>
                          row.key === section.key
                            ? {
                                ...row,
                                items: row.items.map((it) =>
                                  it.key === item.key
                                    ? { ...it, label: e.target.value }
                                    : it
                                ),
                              }
                            : row
                        )
                      )
                    }
                    onBlur={(e) =>
                      applySavedLabel(section.key, item.key, e.target.value)
                    }
                  />
                  <AdminSelect
                    value={item.item_type}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((row) =>
                          row.key === section.key
                            ? {
                                ...row,
                                items: row.items.map((it) =>
                                  it.key === item.key
                                    ? {
                                        ...it,
                                        item_type: e.target
                                          .value as JobChecklistItemType,
                                      }
                                    : it
                                ),
                              }
                            : row
                        )
                      )
                    }
                  >
                    <option value="status">Status</option>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                  </AdminSelect>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSections((prev) =>
                        prev.map((row) =>
                          row.key === section.key
                            ? {
                                ...row,
                                items: row.items.filter((it) => it.key !== item.key),
                              }
                            : row
                        )
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSections((prev) =>
                      prev.map((row) =>
                        row.key === section.key
                          ? { ...row, items: [...row.items, emptyItem()] }
                          : row
                      )
                    )
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
                {savedSuggestions.length > 0 && (
                  <>
                    <div className="min-w-[180px] flex-1 space-y-1">
                      <Label className="sr-only">Add saved item</Label>
                      <AdminSelect
                        value={savedPickBySection[section.key] ?? ""}
                        onChange={(e) =>
                          setSavedPickBySection((prev) => ({
                            ...prev,
                            [section.key]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Add saved item…</option>
                        {savedSuggestions.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </AdminSelect>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSavedItem(section.key)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave}>
          Save template
        </Button>
        {template?.id && (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
