"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, Link2, Pencil, Plus, X } from "lucide-react";
import { DeleteServiceButton } from "@/components/dashboard/delete-service-button";
import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { ServiceAddonForm, type ServiceAddonFormValues } from "@/components/dashboard/service-addon-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type ServiceExtraItem = {
  id: string;
  parent_service_id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_active: boolean;
  is_linked: boolean;
  sort_order: number;
};

export type LinkableService = {
  id: string;
  name: string;
  price: number;
};

export function ServiceExtrasEditor({
  parentServiceId,
  parentServiceName,
  businessId,
  currency,
  extras,
  linkableServices,
  saveAction,
  deleteAction,
  linkAction,
  unlinkAction,
  reorderAction,
}: {
  parentServiceId: string;
  parentServiceName: string;
  businessId: string;
  currency: string;
  extras: ServiceExtraItem[];
  linkableServices: LinkableService[];
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  linkAction: (formData: FormData) => Promise<ActionResult>;
  unlinkAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [mode, setMode] = useState<"idle" | "create" | "link">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [items, setItems] = useState(extras);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(extras);
  }, [extras]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [items]
  );

  const availableToLink = linkableServices.filter(
    (s) =>
      s.id !== parentServiceId &&
      !items.some((e) => e.is_linked && e.id === s.id)
  );

  async function persistReorder(next: ServiceExtraItem[]) {
    const formData = new FormData();
    formData.set("parentServiceId", parentServiceId);
    next.forEach((item, index) => {
      formData.append("orderedIds", item.id);
      formData.append("orderedKinds", item.is_linked ? "linked" : "addon");
    });
    setBusy(true);
    setError(null);
    const result = await reorderAction(formData);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(typeof result.error === "string" ? result.error : "Could not reorder");
      setItems(extras);
      return;
    }
    setItems(next.map((item, index) => ({ ...item, sort_order: index })));
  }

  function handleDragStart(id: string) {
    setDragId(id);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const current = [...sortedItems];
    const from = current.findIndex((i) => i.id === dragId);
    const to = current.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setItems(current);
    void persistReorder(current);
    setDragId(null);
  }

  async function handleLink() {
    if (!selectedLinkId) return;
    const formData = new FormData();
    formData.set("parentServiceId", parentServiceId);
    formData.set("childServiceId", selectedLinkId);
    setBusy(true);
    setError(null);
    const result = await linkAction(formData);
    setBusy(false);
    if (result && "error" in result && result.error) {
      setError(typeof result.error === "string" ? result.error : "Could not link service");
      return;
    }
    const linked = linkableServices.find((s) => s.id === selectedLinkId);
    if (linked) {
      setItems((prev) => [
        ...prev,
        {
          id: linked.id,
          parent_service_id: parentServiceId,
          name: linked.name,
          description: null,
          price: linked.price,
          image_url: null,
          is_active: true,
          is_linked: true,
          sort_order: prev.length,
        },
      ]);
    }
    setSelectedLinkId("");
    setMode("idle");
  }

  async function handleUnlink(childId: string) {
    const formData = new FormData();
    formData.set("parentServiceId", parentServiceId);
    formData.set("childServiceId", childId);
    setBusy(true);
    const result = await unlinkAction(formData);
    setBusy(false);
    if (result && "error" in result && result.error) return;
    setItems((prev) => prev.filter((i) => !(i.is_linked && i.id === childId)));
  }

  const editingAddon = sortedItems.find((e) => e.id === editingId && !e.is_linked);

  return (
    <div className="space-y-4 border-t border-[#1e2235]/8 pt-5 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1e2235]">Additional services</h3>
          <p className="mt-1 text-xs text-[#8b92a5]">
            Optional extras for {parentServiceName} — same appointment time slot
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setMode("create");
              setEditingId(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New extra
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={availableToLink.length === 0}
            onClick={() => {
              setMode("link");
              setEditingId(null);
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
            Link existing
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {sortedItems.length > 0 && (
        <div className="space-y-2">
          {sortedItems.map((extra) => (
            <div
              key={`${extra.is_linked ? "link" : "addon"}-${extra.id}`}
              draggable={!busy}
              onDragStart={() => handleDragStart(extra.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(extra.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-[#1e2235]/8 bg-white p-3",
                dragId === extra.id && "opacity-50"
              )}
            >
              <button
                type="button"
                className="mt-1 cursor-grab text-[#8b92a5] active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[#1e2235]">{extra.name}</p>
                  {extra.is_linked && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Linked
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      extra.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-[#f0f2f5] text-[#8b92a5]"
                    )}
                  >
                    {extra.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#8b92a5]">
                  {formatPrice(extra.price, currency)}
                </p>
                {extra.description && (
                  <p className="mt-1 text-sm text-[#8b92a5]">{extra.description}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                {!extra.is_linked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(extra.id);
                      setMode("idle");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {extra.is_linked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleUnlink(extra.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <DeleteServiceButton
                    action={deleteAction}
                    serviceId={extra.id}
                    serviceName={extra.name}
                    iconOnly
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === "create" && (
        <div className="rounded-xl border border-[#1e2235]/8 bg-[#f0f2f5]/40 p-4">
          <ServiceAddonForm
            action={saveAction}
            businessId={businessId}
            currency={currency}
            parentServiceId={parentServiceId}
            parentServiceName={parentServiceName}
            submitLabel="Add extra"
            onCancel={() => setMode("idle")}
            embedded
          />
        </div>
      )}

      {mode === "link" && (
        <div className="rounded-xl border border-[#1e2235]/8 bg-[#f0f2f5]/40 p-4">
          <Label htmlFor="link-existing-service">Choose a service to offer as an extra</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              id="link-existing-service"
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(e.target.value)}
              className="h-10 min-w-[200px] flex-1 rounded-xl border border-[#1e2235]/15 bg-white px-3 text-sm"
            >
              <option value="">Select service…</option>
              {availableToLink.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatPrice(s.price, currency)})
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={!selectedLinkId || busy}
              onClick={() => void handleLink()}
            >
              Link service
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {editingAddon && (
        <div className="rounded-xl border border-[#1e2235]/8 bg-[#f0f2f5]/40 p-4">
          <ServiceAddonForm
            action={saveAction}
            businessId={businessId}
            currency={currency}
            parentServiceId={parentServiceId}
            parentServiceName={parentServiceName}
            values={editingAddon as ServiceAddonFormValues}
            submitLabel="Save extra"
            onCancel={() => setEditingId(null)}
            embedded
          />
        </div>
      )}
    </div>
  );
}
