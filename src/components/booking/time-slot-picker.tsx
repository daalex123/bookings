"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function TimeSlotPicker({
  slots,
  defaultTime = "",
}: {
  slots: string[];
  defaultTime?: string;
}) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (slots.length === 0) {
    return (
      <p className="mt-4 text-sm text-booking-muted">
        No slots available for this date.
      </p>
    );
  }

  const selectedDefault =
    defaultTime && slots.includes(defaultTime) ? defaultTime : "";

  // Mobile-first until we know viewport — avoids hidden required controls in the DOM
  const showSelect = isDesktop !== true;

  return (
    <div className="mt-6">
      <p className="mb-3 text-base font-medium">Available time</p>

      {showSelect ? (
        <select
          id="booking-time"
          name="time"
          required
          defaultValue={selectedDefault}
          className="w-full appearance-none rounded-2xl border-0 bg-booking-elevated px-4 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-booking-accent/50"
        >
          <option value="" disabled>
            Choose a time
          </option>
          {slots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-3">
          {slots.map((slot, index) => (
            <label
              key={slot}
              className={cn(
                "inline-flex min-h-[48px] min-w-[72px] cursor-pointer items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium",
                "bg-booking-elevated text-white",
                "has-[:checked]:bg-booking-accent has-[:checked]:text-booking-accent-fg"
              )}
            >
              <input
                type="radio"
                name="time"
                value={slot}
                defaultChecked={slot === selectedDefault}
                required={index === 0 && !selectedDefault}
                className="sr-only"
              />
              <span>{slot}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
