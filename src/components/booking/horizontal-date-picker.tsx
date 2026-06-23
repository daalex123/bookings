import Link from "next/link";
import { addDays, format } from "date-fns";
import { todayInTimezone } from "@/lib/availability";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
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
  const todayStr = todayInTimezone(timezone);
  const [year, month, day] = todayStr.split("-").map(Number);
  const dayStrings = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(year, month - 1, day), i), "yyyy-MM-dd")
  );
  const monthLabel = format(new Date(`${selectedDate}T12:00:00`), "MMMM yyyy");

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">{monthLabel}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {dayStrings.map((dateStr) => {
          const selected = dateStr === selectedDate;
          const href = `${flowPath}?service=${serviceId}&date=${dateStr}`;
          const labelDate = new Date(`${dateStr}T12:00:00`);
          return (
            <Link
              key={dateStr}
              href={href}
              scroll={false}
              className={cn(
                "flex min-h-[56px] min-w-[56px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-3 transition-colors",
                selected
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-booking-elevated text-white active:bg-booking-surface"
              )}
            >
              <span className="text-lg font-bold">{format(labelDate, "d")}</span>
              <span className="text-xs opacity-80">{format(labelDate, "EEE")}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
