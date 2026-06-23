"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";

export function BookingSignOutButton({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold text-booking-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Sign out</span>
        </button>
      </form>
    );
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-booking-surface py-3.5 text-sm font-semibold text-booking-muted transition-colors hover:border-white/20 hover:text-white"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </form>
  );
}
