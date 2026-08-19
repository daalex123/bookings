"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  applyChecklistToJob,
  removeJobChecklist,
  saveJobChecklist,
} from "@/lib/checklists";
import {
  groupResponsesBySection,
  type JobChecklistView,
} from "@/lib/checklist-types";
import { formatUniqueKey, type UniqueKeyRef } from "@/lib/customer-unique-key";
import { ChecklistDocActions } from "@/components/print/checklist-doc-actions";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25",
  A: "bg-sky-500/15 text-sky-800 ring-sky-500/25",
  C: "bg-teal-500/15 text-teal-800 ring-teal-500/25",
  R: "bg-amber-500/15 text-amber-800 ring-amber-500/25",
  X: "bg-red-500/15 text-red-800 ring-red-500/25",
  "N/A": "bg-zinc-500/15 text-zinc-700 ring-zinc-500/25",
};

export function JobChecklistPanel({
  businessId,
  jobId,
  jobStatus,
  checklists,
  templates,
  uniqueKey,
}: {
  businessId: string;
  jobId: string;
  jobStatus: string;
  checklists: JobChecklistView[];
  templates: { id: string; name: string }[];
  uniqueKey?: UniqueKeyRef | null;
}) {
  const canApply = jobStatus === "queued" || jobStatus === "in_progress";
  const canEdit = jobStatus !== "cancelled";
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const { runWithToast } = useActionToast();

  async function onApply() {
    if (!templateId) return;
    await runWithToast(
      () => applyChecklistToJob(jobId, businessId, templateId),
      { loading: "Applying template…", success: "Checklist added" }
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1e2235]">Checklists</h2>
          <p className="text-xs text-[#8b92a5]">
            Inspection and task forms for this job. Customers can view the filled form.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <ChecklistDocActions
            previewHref={`/dashboard/${businessId}/jobs/${jobId}/print`}
            pdfHref={`/api/jobs/${jobId}/checklists/pdf`}
          />
          {canApply && templates.length > 0 && (
            <>
              <div className="min-w-[180px] space-y-1">
                <Label>Apply template</Label>
                <AdminSelect
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </AdminSelect>
              </div>
              <Button type="button" size="sm" onClick={onApply}>
                Apply
              </Button>
            </>
          )}
        </div>
      </div>

      {checklists.length === 0 && (
        <p className="text-sm text-[#8b92a5]">
          No checklist on this job yet.
          {templates.length === 0
            ? " Create a template under Checklists first."
            : " Apply a template to start."}
        </p>
      )}

      <div className="space-y-6">
        {checklists.map((checklist) => (
            <JobChecklistEditor
            key={checklist.id}
            businessId={businessId}
            jobId={jobId}
            jobStatus={jobStatus}
            checklist={checklist}
            canEdit={canEdit}
            uniqueKey={uniqueKey}
          />
        ))}
      </div>
    </section>
  );
}

function JobChecklistEditor({
  businessId,
  jobId,
  jobStatus,
  checklist,
  canEdit,
  uniqueKey,
}: {
  businessId: string;
  jobId: string;
  jobStatus: string;
  checklist: JobChecklistView;
  canEdit: boolean;
  uniqueKey?: UniqueKeyRef | null;
}) {
  const { runWithToast } = useActionToast();
  const [headerValues, setHeaderValues] = useState(checklist.header_values);
  const [comments, setComments] = useState(checklist.comments ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      checklist.responses.map((row) => [row.id, row.value ?? ""])
    )
  );
  const sections = useMemo(
    () => groupResponsesBySection(checklist.responses),
    [checklist.responses]
  );
  const locked = jobStatus === "completed" || jobStatus === "cancelled";

  function payload(next?: {
    headerValues?: Record<string, string>;
    comments?: string;
    values?: Record<string, string>;
  }) {
    const nextHeaders = next?.headerValues ?? headerValues;
    const nextComments = next?.comments ?? comments;
    const nextValues = next?.values ?? values;
    return {
      header_values: nextHeaders,
      comments: nextComments,
      responses: checklist.responses.map((row) => ({
        id: row.id,
        value: nextValues[row.id] || null,
      })),
    };
  }

  async function onSave() {
    await runWithToast(
      () => saveJobChecklist(businessId, jobId, checklist.id, payload()),
      { loading: "Saving checklist…", success: "Checklist saved" }
    );
  }

  async function onBlurSave(next?: {
    headerValues?: Record<string, string>;
    comments?: string;
    values?: Record<string, string>;
  }) {
    if (!canEdit) return;
    await saveJobChecklist(businessId, jobId, checklist.id, {
      ...payload(next),
      silent: true,
    });
  }

  async function onRemove() {
    if (!window.confirm("Remove this checklist from the job?")) return;
    await runWithToast(
      () => removeJobChecklist(businessId, jobId, checklist.id),
      { loading: "Removing…", success: "Checklist removed" }
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#1e2235]/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[#1e2235]">{checklist.title}</h3>
          {formatUniqueKey(uniqueKey) ? (
            <p className="mt-1 text-sm font-medium text-[#1e2235]">
              {formatUniqueKey(uniqueKey)}
            </p>
          ) : null}
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#8b92a5]">
            {checklist.status_options.map((option) => (
              <span key={option.code}>
                <span className="font-semibold text-[#1e2235]">{option.code}</span>{" "}
                {option.label}
              </span>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChecklistDocActions
            previewHref={`/dashboard/${businessId}/jobs/${jobId}/print`}
            pdfHref={`/api/jobs/${jobId}/checklists/pdf`}
          />
          {canEdit && !locked && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove
            </Button>
          )}
        </div>
        <ChecklistDocActions
          previewHref={`/dashboard/${businessId}/jobs/${jobId}/print`}
          pdfHref={`/api/jobs/${jobId}/checklists/pdf`}
        />
      </div>

      {checklist.header_fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checklist.header_fields.map((field) => (
            <div key={field.id} className="space-y-1">
              <Label>{field.label}</Label>
              <Input
                type={field.type === "number" ? "number" : field.type}
                value={headerValues[field.id] ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  setHeaderValues((prev) => ({
                    ...prev,
                    [field.id]: e.target.value,
                  }))
                }
                onBlur={(e) => {
                  const next = {
                    ...headerValues,
                    [field.id]: e.target.value,
                  };
                  setHeaderValues(next);
                  void onBlurSave({ headerValues: next });
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#8b92a5]">
              {section.title}
            </h4>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-[#1e2235]/8 px-3 py-2"
                >
                  <p className="text-sm font-medium text-[#1e2235]">{item.label}</p>
                  {item.item_type === "status" ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {checklist.status_options.map((option) => {
                        const active = values[item.id] === option.code;
                        return (
                          <button
                            key={option.code}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              const next = {
                                ...values,
                                [item.id]:
                                  values[item.id] === option.code
                                    ? ""
                                    : option.code,
                              };
                              setValues(next);
                              void onBlurSave({ values: next });
                            }}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                              active
                                ? STATUS_CHIP[option.code] ??
                                    "bg-booking-accent/20 text-booking-accent-fg ring-booking-accent/30"
                                : "bg-transparent text-[#8b92a5] ring-[#1e2235]/10"
                            )}
                            title={option.label}
                          >
                            {option.code}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      className="mt-2 h-8"
                      type={item.item_type === "number" ? "number" : "text"}
                      value={values[item.id] ?? ""}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      onBlur={(e) => {
                        const next = { ...values, [item.id]: e.target.value };
                        setValues(next);
                        void onBlurSave({ values: next });
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>Comments</Label>
        <Textarea
          rows={3}
          value={comments}
          disabled={!canEdit}
          onChange={(e) => setComments(e.target.value)}
          onBlur={(e) => {
            const next = e.target.value;
            setComments(next);
            void onBlurSave({ comments: next });
          }}
          placeholder="Special comments"
        />
      </div>

      {canEdit && (
        <Button type="button" onClick={onSave}>
          Save checklist
        </Button>
      )}
    </div>
  );
}
