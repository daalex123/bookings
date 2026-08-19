"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DocumentChrome } from "@/components/print/document-chrome";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  parseDocumentTemplate,
  type DocumentBusiness,
  type DocumentTemplate,
} from "@/lib/document-template";

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-[#1e2235]/10 bg-white px-3 text-sm text-[#1e2235]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function DocumentTemplateDesigner({
  business,
  initialTemplate,
}: {
  business: DocumentBusiness;
  initialTemplate: unknown;
}) {
  const [template, setTemplate] = useState<DocumentTemplate>(
    parseDocumentTemplate(initialTemplate ?? DEFAULT_DOCUMENT_TEMPLATE)
  );

  const serialized = useMemo(() => JSON.stringify(template), [template]);

  function patch(changes: Partial<DocumentTemplate>) {
    setTemplate((prev) => ({ ...prev, ...changes }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <input type="hidden" name="document_template_json" value={serialized} />
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Header alignment</Label>
            <AdminSelect
              value={template.header_align}
              onChange={(e) =>
                patch({
                  header_align: e.target.value as DocumentTemplate["header_align"],
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Centered</option>
            </AdminSelect>
          </div>
          <div className="space-y-1">
            <Label>Footer alignment</Label>
            <AdminSelect
              value={template.footer_align}
              onChange={(e) =>
                patch({
                  footer_align: e.target.value as DocumentTemplate["footer_align"],
                })
              }
            >
              <option value="center">Centered</option>
              <option value="left">Left</option>
            </AdminSelect>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={template.show_logo}
            onChange={(show_logo) => patch({ show_logo })}
          >
            Show logo
          </Toggle>
          <Toggle
            checked={template.show_name}
            onChange={(show_name) => patch({ show_name })}
          >
            Show business name
          </Toggle>
          <Toggle
            checked={template.show_address}
            onChange={(show_address) => patch({ show_address })}
          >
            Show address
          </Toggle>
          <Toggle
            checked={template.show_contact}
            onChange={(show_contact) => patch({ show_contact })}
          >
            Show phone &amp; email
          </Toggle>
        </div>

        <div className="space-y-1">
          <Label htmlFor="header_text">Header note</Label>
          <Textarea
            id="header_text"
            rows={3}
            value={template.header_text}
            onChange={(e) => patch({ header_text: e.target.value })}
            placeholder="Optional tagline, registration number, or branch name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="footer_text">Footer note</Label>
          <Textarea
            id="footer_text"
            rows={4}
            value={template.footer_text}
            onChange={(e) => patch({ footer_text: e.target.value })}
            placeholder="Thank you text, bank details, or terms that should appear on invoices and checklists"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8b92a5]">
          Preview
        </p>
        <DocumentChrome business={business} template={template} preview>
          <div className="rounded-lg border border-dashed border-[#1e2235]/15 bg-[#f7f8fa] px-4 py-8 text-center text-sm text-[#8b92a5]">
            Invoice or checklist content will appear here.
          </div>
        </DocumentChrome>
      </div>
    </div>
  );
}
