"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useActionLoading } from "@/providers/action-loading-provider";

export function BookingSubmitForm({
  className,
  slotsAvailable,
  children,
}: {
  className?: string;
  slotsAvailable: boolean;
  children: ReactNode;
}) {
  const { show } = useActionLoading();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    show("Confirming your booking…");

    try {
      const res = await fetch("/api/booking/submit", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      window.location.assign(res.url);
    } catch {
      window.location.reload();
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
      <div className="sticky bottom-20 z-30 mt-8 pb-4">
        <button
          type="submit"
          disabled={!slotsAvailable || submitting}
          aria-busy={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-booking-accent px-4 py-4 text-base font-semibold text-booking-accent-fg shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Booking…
            </>
          ) : (
            "Book Now"
          )}
        </button>
      </div>
    </form>
  );
}
