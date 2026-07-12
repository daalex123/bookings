import type { IncomeDailyPoint } from "@/lib/business-income";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function IncomeChart({
  daily,
  currency,
  className,
}: {
  daily: IncomeDailyPoint[];
  currency: string;
  className?: string;
}) {
  const maxAmount = Math.max(...daily.map((point) => point.amount), 1);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "overflow-x-auto pb-2",
          daily.length > 21 && "-mx-1 px-1"
        )}
      >
        <div
          className="flex h-44 items-end gap-2 sm:h-52 sm:gap-3"
          style={
            daily.length > 21
              ? { minWidth: `${daily.length * 28}px` }
              : undefined
          }
        >
        {daily.map((point) => {
          const height = point.amount > 0 ? Math.max((point.amount / maxAmount) * 100, 8) : 0;
          return (
            <div
              key={point.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-[10px] font-medium text-[#8b92a5] sm:text-xs">
                {point.amount > 0 ? formatPrice(point.amount, currency) : ""}
              </span>
              <div className="flex h-32 w-full items-end sm:h-40">
                <div
                  className={cn(
                    "w-full rounded-t-xl transition-colors",
                    point.amount > 0
                      ? "bg-booking-accent"
                      : "bg-[#1e2235]/8"
                  )}
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${formatPrice(point.amount, currency)}`}
                />
              </div>
              <span className="truncate text-[10px] text-[#8b92a5] sm:text-xs">
                {point.label}
              </span>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
