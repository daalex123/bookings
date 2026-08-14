"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  INCOME_PERIOD_OPTIONS,
  type IncomePeriodDays,
} from "@/lib/business-income";
import { cn } from "@/lib/utils";

export function IncomePeriodTabs({
  businessId,
  activeDays,
}: {
  businessId: string;
  activeDays: IncomePeriodDays;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = pathname ?? `/dashboard/${businessId}/income`;

  return (
    <div className="flex flex-wrap gap-2">
      {INCOME_PERIOD_OPTIONS.map((days) => {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.set("days", String(days));
        const href = `${basePath}?${params.toString()}`;
        const active = activeDays === days;

        return (
          <Link
            key={days}
            href={href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-booking-accent text-booking-accent-fg"
                : "bg-[#f0f2f5] text-[#8b92a5] hover:text-[#1e2235]"
            )}
          >
            {days} days
          </Link>
        );
      })}
    </div>
  );
}
