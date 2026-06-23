"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/lib/action-result";

export function ProfileForm({
  action,
  isBooking,
  defaultName,
  defaultPhone,
  email,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  isBooking: boolean;
  defaultName: string;
  defaultPhone: string;
  email: string;
}) {
  const inputClass = cn(
    "w-full rounded-2xl border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-booking-accent/50",
    isBooking
      ? "bg-booking-elevated text-white placeholder:text-booking-muted"
      : "border border-zinc-300 bg-white"
  );

  const labelClass = cn(
    "text-sm font-medium",
    isBooking ? "text-booking-muted" : "text-zinc-700"
  );

  const submitClass = cn(
    "w-full rounded-2xl py-3.5 text-sm font-semibold",
    isBooking
      ? "bg-booking-accent text-booking-accent-fg"
      : "bg-zinc-900 text-white"
  );

  return (
    <ActionForm
      action={action}
      messages={{
        loading: "Saving profile…",
        success: "Profile updated",
        error: "Could not update profile",
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label htmlFor="full_name" className={labelClass}>
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          required
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="phone" className={labelClass}>
          Mobile number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+94 77 123 4567"
          defaultValue={defaultPhone}
          required
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label className={labelClass}>Email</label>
        <input
          value={email}
          disabled
          className={cn(inputClass, "opacity-60")}
        />
      </div>
      <SubmitButton className={submitClass} pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </ActionForm>
  );
}
