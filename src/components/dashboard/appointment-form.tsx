"use client";

import { AdminSelect } from "@/components/dashboard/admin-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CustomerOption = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
};

export type ServiceOption = {
  id: string;
  name: string;
  duration_minutes: number;
  is_active: boolean;
};

export type AppointmentFormValues = {
  id?: string;
  service_id: string;
  date: string;
  time: string;
  status: string;
  notes?: string | null;
  customer_id?: string;
  customer_email?: string;
  customer_label?: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
] as const;

export function AppointmentForm({
  action,
  services,
  customers,
  values,
  submitLabel,
  onCancel,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  services: ServiceOption[];
  customers: CustomerOption[];
  values?: Partial<AppointmentFormValues>;
  submitLabel: string;
  onCancel?: () => void;
  className?: string;
}) {
  const isEdit = Boolean(values?.id);

  return (
    <form action={action} className={cn("grid gap-5 sm:grid-cols-2", className)}>
      {values?.id && <input type="hidden" name="id" value={values.id} />}

      {!isEdit && (
        <>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer_id">Customer</Label>
            <AdminSelect
              id="customer_id"
              name="customer_id"
              defaultValue={values?.customer_id ?? ""}
            >
              <option value="">New customer — enter email below</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name ?? "Customer"} · {customer.email}
                  {customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer_email">Customer email</Label>
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              defaultValue={values?.customer_email ?? ""}
              placeholder="required if not selected above"
            />
            <p className="text-xs text-[#8b92a5]">
              Customer must already have a BookNow account
            </p>
          </div>
        </>
      )}

      {isEdit && values?.customer_label && (
        <div className="space-y-1 sm:col-span-2">
          <Label>Customer</Label>
          <p className="rounded-xl border border-[#1e2235]/10 bg-[#f0f2f5]/50 px-3 py-2.5 text-sm text-[#1e2235]">
            {values.customer_label}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="service_id">Service</Label>
        <AdminSelect
          id="service_id"
          name="service_id"
          defaultValue={values?.service_id ?? ""}
          required
        >
          <option value="" disabled>
            Select a service
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} ({service.duration_minutes} min)
              {!service.is_active ? " — inactive" : ""}
            </option>
          ))}
        </AdminSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <AdminSelect
          id="status"
          name="status"
          defaultValue={values?.status ?? "confirmed"}
          required
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={values?.date ?? ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">Start time</Label>
        <Input
          id="time"
          name="time"
          type="time"
          defaultValue={values?.time ?? ""}
          required
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={values?.notes ?? ""}
          rows={3}
          placeholder="Internal notes or customer requests"
        />
      </div>

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
