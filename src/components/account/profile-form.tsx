"use client";

import { cn } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { ProfileImageUpload } from "@/components/account/profile-image-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  bookingInputClass,
  bookingLabelClass,
} from "@/components/booking/booking-form-field";
import type { ActionResult } from "@/lib/action-result";

export type ProfileFormVariant = "booking" | "dashboard" | "platform";

export function ProfileForm({
  action,
  variant,
  defaultName,
  defaultPhone,
  defaultDateOfBirth,
  defaultAvatarUrl,
  email,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  variant: ProfileFormVariant;
  defaultName: string;
  defaultPhone: string;
  defaultDateOfBirth?: string;
  defaultAvatarUrl?: string;
  email: string;
}) {
  const isBooking = variant === "booking";
  const isPlatform = variant === "platform";

  const inputClass = cn(
    isBooking
      ? bookingInputClass
      : isPlatform
        ? "w-full min-h-[48px] rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        : "w-full min-h-[48px] rounded-2xl border border-[#1e2235]/10 bg-white px-4 py-3 text-base text-[#1e2235] placeholder:text-[#8b92a5] shadow-none focus:border-[#1e2235]/30 focus:outline-none focus:ring-2 focus:ring-[#1e2235]/10 disabled:cursor-not-allowed disabled:opacity-60"
  );

  const labelClass = cn(
    isBooking
      ? bookingLabelClass
      : isPlatform
        ? "text-sm font-medium text-zinc-300"
        : "text-sm font-medium text-[#1e2235]"
  );

  const submitClass = cn(
    "w-full rounded-2xl py-3.5 text-sm font-semibold",
    isBooking
      ? "bg-booking-accent text-booking-accent-fg"
      : isPlatform
        ? "bg-zinc-100 text-zinc-950 hover:bg-white"
        : "bg-booking-accent text-booking-accent-fg"
  );

  return (
    <ActionForm
      action={action}
      messages={{
        loading: "Saving profile…",
        success: "Profile updated",
        error: "Could not update profile",
      }}
      className="space-y-5"
    >
      <ProfileImageUpload
        name="avatar_url"
        defaultUrl={defaultAvatarUrl}
        displayName={defaultName}
        variant={variant}
      />
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
        <label htmlFor="date_of_birth" className={labelClass}>
          Date of birth
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          autoComplete="bday"
          defaultValue={defaultDateOfBirth ?? ""}
          required
          max={new Date().toISOString().slice(0, 10)}
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
