"use client";

import { ImageUploadField } from "@/components/dashboard/image-upload-field";
import {
  ServiceExtrasEditor,
  type LinkableService,
  type ServiceExtraItem,
} from "@/components/dashboard/service-extras-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export type ServiceFormValues = {
  id?: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  slot_interval_minutes: number;
  price: number;
  image_url?: string | null;
  is_active: boolean;
};

export function ServiceForm({
  action,
  businessId,
  currency,
  values,
  submitLabel,
  onCancel,
  className,
  extras,
  linkableServices,
  saveExtraAction,
  deleteExtraAction,
  linkExtraAction,
  unlinkExtraAction,
  reorderExtrasAction,
}: {
  action: (formData: FormData) => void | Promise<void>;
  businessId: string;
  currency: string;
  values?: Partial<ServiceFormValues>;
  submitLabel: string;
  onCancel?: () => void;
  className?: string;
  extras?: ServiceExtraItem[];
  linkableServices?: LinkableService[];
  saveExtraAction?: (formData: FormData) => Promise<ActionResult>;
  deleteExtraAction?: (formData: FormData) => Promise<ActionResult>;
  linkExtraAction?: (formData: FormData) => Promise<ActionResult>;
  unlinkExtraAction?: (formData: FormData) => Promise<ActionResult>;
  reorderExtrasAction?: (formData: FormData) => Promise<ActionResult>;
}) {
  const duration = values?.duration_minutes ?? 30;
  const interval = values?.slot_interval_minutes ?? duration;

  return (
    <form action={action} className={cn("grid gap-5 sm:grid-cols-2", className)}>
      {values?.id && <input type="hidden" name="id" value={values.id} />}

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `name-${values.id}` : "name-new"}>
          Service name
        </Label>
        <Input
          id={values?.id ? `name-${values.id}` : "name-new"}
          name="name"
          defaultValue={values?.name ?? ""}
          placeholder="e.g. Haircut"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `price-${values.id}` : "price-new"}>
          Price ({currency})
        </Label>
        <Input
          id={values?.id ? `price-${values.id}` : "price-new"}
          name="price"
          type="number"
          min={0}
          step="0.01"
          defaultValue={values?.price ?? 0}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `duration-${values.id}` : "duration-new"}>
          Duration (minutes)
        </Label>
        <Input
          id={values?.id ? `duration-${values.id}` : "duration-new"}
          name="duration_minutes"
          type="number"
          min={5}
          step={5}
          defaultValue={duration}
          required
        />
        <p className="text-xs text-[#8b92a5]">How long the appointment lasts</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={values?.id ? `interval-${values.id}` : "interval-new"}>
          Start interval (minutes)
        </Label>
        <Input
          id={values?.id ? `interval-${values.id}` : "interval-new"}
          name="slot_interval_minutes"
          type="number"
          min={5}
          step={5}
          defaultValue={interval}
          required
        />
        <p className="text-xs text-[#8b92a5]">
          Gap between bookable start times
        </p>
      </div>

      <ImageUploadField
        businessId={businessId}
        kind="service"
        name="image_url"
        label="Service image"
        defaultUrl={values?.image_url ?? ""}
        serviceId={values?.id}
        className="sm:col-span-2"
      />

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={values?.id ? `desc-${values.id}` : "desc-new"}>
          Description
        </Label>
        <Textarea
          id={values?.id ? `desc-${values.id}` : "desc-new"}
          name="description"
          defaultValue={values?.description ?? ""}
          rows={3}
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
          Active — visible on booking page
        </span>
      </label>

      {values?.id &&
        extras &&
        linkableServices &&
        saveExtraAction &&
        deleteExtraAction &&
        linkExtraAction &&
        unlinkExtraAction &&
        reorderExtrasAction && (
          <ServiceExtrasEditor
            parentServiceId={values.id}
            parentServiceName={values.name ?? "Service"}
            businessId={businessId}
            currency={currency}
            extras={extras}
            linkableServices={linkableServices}
            saveAction={saveExtraAction}
            deleteAction={deleteExtraAction}
            linkAction={linkExtraAction}
            unlinkAction={unlinkExtraAction}
            reorderAction={reorderExtrasAction}
          />
        )}

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
