"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "@/lib/admin-icons";
import {
  createDraftInvoice,
  issueInvoice,
  recordInvoicePayment,
  upsertDraftInvoiceItems,
  voidInvoice,
  type InvoiceLineInput,
  type InvoiceLinePreset,
} from "@/lib/invoices";
import { useActionToast } from "@/hooks/use-action-toast";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPrice, cn } from "@/lib/utils";
import type { InvoicePaymentMethod, InvoiceStatus } from "@/types/database";

export type CatalogService = {
  id: string;
  name: string;
  price: number;
  cost_price: number;
};

export type CustomerOption = {
  id: string;
  label: string;
};

type ComposerLine = InvoiceLineInput & { key: string };

function newKey() {
  return Math.random().toString(36).slice(2);
}

function emptyLine(): ComposerLine {
  return {
    key: newKey(),
    description: "",
    quantity: 1,
    unit_price: 0,
    cost_price: 0,
    service_id: null,
  };
}

function calc(lines: ComposerLine[], discount: number) {
  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0
  );
  const discountAmount = Math.max(0, Math.min(discount, subtotal));
  return {
    subtotal,
    discountAmount,
    total: Math.max(0, subtotal - discountAmount),
  };
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-sm font-semibold text-[#1e2235]">{title}</h2>
      {description ? (
        <p className="text-xs text-[#8b92a5]">{description}</p>
      ) : null}
    </div>
  );
}

export function InvoiceComposer({
  businessId,
  currency,
  customers,
  catalog,
  savedItems = [],
  invoice,
  initialLines,
  mode,
}: {
  businessId: string;
  currency: string;
  customers: CustomerOption[];
  catalog: CatalogService[];
  savedItems?: InvoiceLinePreset[];
  mode: "new" | "edit";
  invoice?: {
    id: string;
    status: InvoiceStatus;
    customer_id: string;
    appointment_id: string | null;
    job_id: string | null;
    invoice_number: string | null;
    notes: string | null;
    discount_amount: number;
    amount_paid: number;
    total: number;
  };
  initialLines: InvoiceLineInput[];
}) {
  const router = useRouter();
  const { wrapFormAction, wrapAction, runWithToast } = useActionToast();
  const isDraft = mode === "new" || invoice?.status === "draft";
  const hasSavedInvoice = Boolean(invoice?.id);
  const [customerId, setCustomerId] = useState(
    invoice?.customer_id ?? customers[0]?.id ?? ""
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [discount, setDiscount] = useState(Number(invoice?.discount_amount ?? 0));
  const [lines, setLines] = useState<ComposerLine[]>(
    initialLines.length
      ? initialLines.map((line) => ({ ...line, key: newKey() }))
      : [emptyLine()]
  );
  const [catalogId, setCatalogId] = useState("");
  const [savedItemId, setSavedItemId] = useState("");
  const datalistId = `invoice-line-presets-${businessId}`;

  const totals = useMemo(() => calc(lines, discount), [lines, discount]);

  const savedSuggestions = useMemo(() => {
    const byDesc = new Map<string, InvoiceLinePreset>();
    for (const item of savedItems) {
      const key = item.description.trim().toLowerCase();
      if (!key || byDesc.has(key)) continue;
      byDesc.set(key, item);
    }
    return Array.from(byDesc.values());
  }, [savedItems]);

  function updateLine(key: string, patch: Partial<ComposerLine>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function applySavedDescription(key: string, description: string) {
    const match = savedSuggestions.find(
      (item) => item.description.toLowerCase() === description.trim().toLowerCase()
    );
    if (!match) {
      updateLine(key, { description });
      return;
    }
    updateLine(key, {
      description: match.description,
      unit_price: match.unit_price,
      cost_price: match.cost_price,
      service_id: match.service_id,
    });
  }

  function addFromCatalog() {
    const service = catalog.find((s) => s.id === catalogId);
    if (!service) return;
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        service_id: service.id,
        description: service.name,
        quantity: 1,
        unit_price: Number(service.price),
        cost_price: Number(service.cost_price),
      },
    ]);
    setCatalogId("");
  }

  function addFromSaved() {
    const item = savedSuggestions.find((s) => s.id === savedItemId);
    if (!item) return;
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        service_id: item.service_id,
        description: item.description,
        quantity: 1,
        unit_price: Number(item.unit_price),
        cost_price: Number(item.cost_price),
      },
    ]);
    setSavedItemId("");
  }

  async function saveDraft() {
    const payload = lines.map(({ key: _k, ...rest }, index) => ({
      ...rest,
      sort_order: index,
    }));

    if (mode === "new") {
      const result = await runWithToast(
        () =>
          createDraftInvoice({
            businessId,
            customerId,
            notes,
            discountAmount: discount,
            lines: payload,
            appointmentId: invoice?.appointment_id,
            jobId: invoice?.job_id,
          }),
        { loading: "Saving draft…", success: "Draft saved" }
      );
      if (result.success && result.result && typeof result.result === "object" && "invoiceId" in result.result) {
        router.push(
          `/dashboard/${businessId}/billing/${(result.result as { invoiceId: string }).invoiceId}`
        );
      }
      return;
    }

    if (!invoice) return;
    await runWithToast(
      () =>
        upsertDraftInvoiceItems(invoice.id, businessId, payload, {
          discountAmount: discount,
          notes,
          customerId,
        }),
      { loading: "Saving draft…", success: "Draft saved" }
    );
  }

  const onIssue = wrapAction(
    async () => {
      if (!invoice) return { error: "Save draft first" };
      // Persist latest lines before issue
      await upsertDraftInvoiceItems(
        invoice.id,
        businessId,
        lines.map(({ key: _k, ...rest }, index) => ({ ...rest, sort_order: index })),
        { discountAmount: discount, notes, customerId }
      );
      return issueInvoice(invoice.id, businessId);
    },
    { loading: "Issuing invoice…", success: "Invoice issued" }
  );

  const onVoid = wrapAction(
    async () => {
      if (!invoice) return { error: "Missing invoice" };
      return voidInvoice(invoice.id, businessId);
    },
    { loading: "Voiding…", success: "Invoice voided" }
  );

  const onPayment = wrapFormAction(
    async (formData) => {
      if (!invoice) return { error: "Missing invoice" };
      const amount = Number(formData.get("amount"));
      const method = (formData.get("method")?.toString() ??
        "cash") as InvoicePaymentMethod;
      const note = formData.get("note")?.toString() || null;
      return recordInvoicePayment({
        invoiceId: invoice.id,
        businessId,
        amount,
        method,
        note,
      });
    },
    { loading: "Recording payment…", success: "Payment recorded" }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          mode === "new"
            ? "New invoice"
            : invoice?.invoice_number ?? "Draft invoice"
        }
        description="Build line items dynamically, then issue a branded invoice."
        action={
          hasSavedInvoice ? (
            <Link
              href={`/dashboard/${businessId}/billing/${invoice!.id}/print`}
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              Print view
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <section className="space-y-6 rounded-2xl border border-[#1e2235]/10 bg-white p-5">
          <div className="space-y-3">
            <SectionTitle
              title="Invoice details"
              description="Who this invoice is for and its current status."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <AdminSelect
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={!isDraft}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </AdminSelect>
                {customers.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No customers yet. They appear after their first booking.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <p className="flex h-10 items-center text-sm capitalize text-[#1e2235]">
                  {invoice?.status ?? "new draft"}
                  {invoice?.invoice_number ? ` · ${invoice.invoice_number}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-[#1e2235]/8 pt-5">
            <SectionTitle
              title="Line items"
              description="Add from your service catalog or previously used items. Typing a description also suggests past lines."
            />

          {isDraft && (
            <div className="space-y-2 rounded-xl bg-[#f0f2f5]/70 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <Label>Add from catalog</Label>
                  <AdminSelect
                    value={catalogId}
                    onChange={(e) => setCatalogId(e.target.value)}
                  >
                    <option value="">Select a service</option>
                    {catalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatPrice(s.price, currency)}
                      </option>
                    ))}
                  </AdminSelect>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFromCatalog}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {savedSuggestions.length > 0 && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1 space-y-1.5">
                    <Label>Add from saved items</Label>
                    <AdminSelect
                      value={savedItemId}
                      onChange={(e) => setSavedItemId(e.target.value)}
                    >
                      <option value="">Previously used line</option>
                      {savedSuggestions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.description} ·{" "}
                          {formatPrice(item.unit_price, currency)}
                        </option>
                      ))}
                    </AdminSelect>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addFromSaved}>
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                Custom line
              </Button>
            </div>
          )}

          <datalist id={datalistId}>
            {savedSuggestions.map((item) => (
              <option
                key={item.id}
                value={item.description}
                label={`${formatPrice(item.unit_price, currency)} · used ${item.use_count}×`}
              />
            ))}
          </datalist>

          <div
            className="hidden gap-2 px-3 text-xs font-medium uppercase tracking-wide text-[#8b92a5] sm:grid sm:grid-cols-[1.4fr_0.5fr_0.7fr_auto]"
            aria-hidden
          >
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span />
          </div>

          <div className="space-y-3">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-xl border border-[#1e2235]/8 p-3 sm:grid-cols-[1.4fr_0.5fr_0.7fr_auto]"
              >
                <div className="space-y-1 sm:space-y-0">
                  <Label className="sm:sr-only">Description</Label>
                  <Input
                    value={line.description}
                    disabled={!isDraft}
                    list={datalistId}
                    onChange={(e) =>
                      updateLine(line.key, { description: e.target.value })
                    }
                    onBlur={(e) =>
                      applySavedDescription(line.key, e.target.value)
                    }
                    placeholder="Description"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1 sm:space-y-0">
                  <Label className="sm:sr-only">Qty</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={line.quantity}
                    disabled={!isDraft}
                    onChange={(e) =>
                      updateLine(line.key, { quantity: Number(e.target.value) })
                    }
                    placeholder="Qty"
                  />
                </div>
                <div className="space-y-1 sm:space-y-0">
                  <Label className="sm:sr-only">Unit price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    disabled={!isDraft}
                    onChange={(e) =>
                      updateLine(line.key, { unit_price: Number(e.target.value) })
                    }
                    placeholder="Unit price"
                  />
                </div>
                {isDraft && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          </div>

          <div className="space-y-3 border-t border-[#1e2235]/8 pt-5">
            <SectionTitle title="Adjustments & notes" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Discount</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  disabled={!isDraft}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  disabled={!isDraft}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {isDraft && (
            <div className="flex flex-wrap gap-2 border-t border-[#1e2235]/8 pt-5">
              <Button type="button" onClick={saveDraft} disabled={!customerId}>
                Save draft
              </Button>
              {invoice && hasSavedInvoice && (
                <Button type="button" variant="outline" onClick={onIssue}>
                  Issue invoice
                </Button>
              )}
            </div>
          )}

          {invoice &&
            hasSavedInvoice &&
            invoice.status !== "void" &&
            invoice.status !== "paid" && (
            <Button type="button" variant="destructive" size="sm" onClick={onVoid}>
              Void invoice
            </Button>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#1e2235]/10 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold">Totals</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#8b92a5]">Subtotal</dt>
                <dd>{formatPrice(totals.subtotal, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8b92a5]">Discount</dt>
                <dd>-{formatPrice(totals.discountAmount, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#1e2235]/10 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(totals.total, currency)}</dd>
              </div>
              {hasSavedInvoice && invoice && (
                <div className="flex justify-between text-[#8b92a5]">
                  <dt>Paid</dt>
                  <dd>{formatPrice(Number(invoice.amount_paid), currency)}</dd>
                </div>
              )}
            </dl>
          </section>

          {hasSavedInvoice &&
            invoice &&
            (invoice.status === "issued" || invoice.status === "paid") && (
            <section className="rounded-2xl border border-[#1e2235]/10 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">Record payment</h2>
              <form action={onPayment} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min={0.01}
                    step="0.01"
                    defaultValue={Math.max(
                      0,
                      Number(invoice.total) - Number(invoice.amount_paid)
                    )}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="method">Method</Label>
                  <AdminSelect id="method" name="method" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="other">Other</option>
                  </AdminSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="note">Note</Label>
                  <Input id="note" name="note" />
                </div>
                <SubmitButton>Record payment</SubmitButton>
              </form>
            </section>
          )}

          <p
            className={cn(
              "text-xs text-[#8b92a5]",
              !isDraft && "rounded-xl bg-[#f0f2f5]/80 p-3"
            )}
          >
            {isDraft
              ? "Totals update as you edit. Issue locks the line items and assigns an invoice number."
              : "Issued invoices are locked. Record payments or void if needed."}
          </p>
        </aside>
      </div>
    </div>
  );
}
