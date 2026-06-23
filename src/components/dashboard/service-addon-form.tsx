"use client";

import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export type ServiceAddonFormValues = {
  id?: string;
  parent_service_id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_active: boolean;
};

export function ServiceAddonForm({
  action,
  businessId,
  currency,
  parentServiceId,
  parentServiceName,
  values,
  submitLabel,
  onCancel,
  className,
  embedded = false,
}: {
  action: (formData: FormData) => void | Promise<void | ActionResult>;
  businessId: string;
  currency: string;
  parentServiceId: string;
  parentServiceName: string;
  values?: Partial<ServiceAddonFormValues>;
  submitLabel: string;
  onCancel?: () => void;
  className?: string;
  embedded?: boolean;
}) {
  async function handleSubmit(formData: FormData) {
    await action(formData);
  }

  return (
    <form action={handleSubmit} className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {values?.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="parent_service_id" value={parentServiceId} />

      {!embedded && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-[#8b92a5]">
            Additional service for {parentServiceName}
          </p>
          <p className="text-xs text-[#8b92a5]">
            Uses the same appointment duration and time slots as the primary service
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `addon-name-${values.id}` : "addon-name-new"}>
          Name
        </Label>
        <Input
          id={values?.id ? `addon-name-${values.id}` : "addon-name-new"}
          name="name"
          defaultValue={values?.name ?? ""}
          placeholder="e.g. Deep conditioning"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `addon-price-${values.id}` : "addon-price-new"}>
          Price ({currency})
        </Label>
        <Input
          id={values?.id ? `addon-price-${values.id}` : "addon-price-new"}
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={values?.price ?? 0}
          required
        />
      </div>

      <ImageUploadField
        businessId={businessId}
        kind="service"
        name="image_url"
        label="Image (optional)"
        defaultUrl={values?.image_url ?? ""}
        serviceId={values?.id}
        className="sm:col-span-2"
      />

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={values?.id ? `addon-desc-${values.id}` : "addon-desc-new"}>
          Description
        </Label>
        <Textarea
          id={values?.id ? `addon-desc-${values.id}` : "addon-desc-new"}
          name="description"
          defaultValue={values?.description ?? ""}
          rows={2}
          placeholder="Optional details shown to customers"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={values?.is_active ?? true}
          className="h-4 w-4 rounded border-[#1e2235]/20 text-[#1e2235] focus:ring-[#1e2235]/20"
        />
        <span className="text-sm font-medium text-[#1e2235]">
          Active — customers can add this when booking
        </span>
      </label>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton
          className="rounded-full"
          pendingLabel={
            submitLabel.toLowerCase().includes("create") ? "Creating…" : "Saving…"
          }
        >
          {submitLabel}
        </SubmitButton>
        {onCancel && (
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
