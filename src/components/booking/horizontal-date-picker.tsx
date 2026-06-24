"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { todayInTimezone } from "@/lib/availability";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { useActionLoading } from "@/providers/action-loading-provider";
import { cn } from "@/lib/utils";

export function HorizontalDatePicker({
  flowPath,
  serviceId,
  selectedDate,
  timezone = DEFAULT_TIMEZONE,
}: {
  flowPath: string;
  serviceId: string;
  selectedDate: string;
  timezone?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { show, hide } = useActionLoading();

  const todayStr = todayInTimezone(timezone);
  const [year, month, day] = todayStr.split("-").map(Number);
  const dayStrings = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(year, month - 1, day), i), "yyyy-MM-dd")
  );
  const monthLabel = format(new Date(`${selectedDate}T12:00:00`), "MMMM yyyy");

  useEffect(() => {
    if (isPending) {
      show("Loading availability…");
      return () => hide();
    }
  }, [isPending, show, hide]);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{monthLabel}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {dayStrings.map((dateStr) => {
          const selected = dateStr === selectedDate;
          const labelDate = new Date(`${dateStr}T12:00:00`);
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPending}
              onClick={() => {
                if (selected || isPending) return;
                startTransition(() => {
                  router.push(
                    `${flowPath}?service=${serviceId}&date=${dateStr}`,
                    { scroll: false }
                  );
                });
              }}
              className={cn(
                "flex min-h-[56px] min-w-[56px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-3 transition-colors disabled:opacity-70",
                selected
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-booking-elevated text-white active:bg-booking-surface"
              )}
            >
              <span className="text-lg font-bold">{format(labelDate, "d")}</span>
              <span className="text-xs opacity-80">{format(labelDate, "EEE")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
