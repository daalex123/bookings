"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Clock3, Users } from "lucide-react";
import { useActionLoading } from "@/providers/action-loading-provider";
import { serviceShowsPrice } from "@/lib/booking";
import { formatDuration, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ServiceTabPicker({
  services,
  flowPath,
  selectedServiceId,
  dateStr,
  currency,
}: {
  services: {
    id: string;
    name: string;
    description?: string | null;
    duration_minutes?: number;
    price?: number;
    show_price?: boolean;
    staff_names?: string[];
  }[];
  flowPath: string;
  selectedServiceId: string;
  dateStr: string;
  currency: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { show, hide } = useActionLoading();

  useEffect(() => {
    if (isPending) {
      show("Loading availability…");
      return () => hide();
    }
  }, [isPending, show, hide]);

  if (services.length === 0) return null;

  const singleService = services.length === 1;

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-booking-muted">
        {singleService ? "Service" : "Choose a service"}
      </p>
      <div
        className={cn(
          "pb-2",
          singleService ? "grid grid-cols-1" : "flex gap-3 overflow-x-auto"
        )}
      >
        {services.map((service) => {
          const selected = service.id === selectedServiceId;
          const staffCount = service.staff_names?.length ?? 0;
          const showPrice = service.price != null && serviceShowsPrice(service);

          return (
            <button
              key={service.id}
              type="button"
              disabled={isPending}
              onClick={() => {
                if (selected || isPending) return;
                startTransition(() => {
                  router.push(
                    `${flowPath}?service=${service.id}&date=${dateStr}`,
                    { scroll: false }
                  );
                });
              }}
              className={cn(
                "group relative min-h-36 shrink-0 rounded-3xl border px-4 py-4 text-left transition-all disabled:opacity-70",
                singleService ? "w-full" : "w-70",
                selected
                  ? "border-booking-accent/70 bg-linear-to-br from-booking-accent/30 via-booking-accent/15 to-booking-elevated text-white shadow-[0_12px_30px_rgba(245,197,24,0.24)]"
                  : "border-white/8 bg-linear-to-br from-booking-elevated to-[#18181b] text-white hover:-translate-y-0.5 hover:border-booking-accent/30 hover:shadow-[0_10px_24px_rgba(0,0,0,0.3)]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-1 text-base font-semibold tracking-tight">
                  {service.name}
                </p>
                {selected && (
                  <span className="shrink-0 rounded-full bg-booking-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-booking-accent-fg">
                    Selected
                  </span>
                )}
              </div>

              {service.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-booking-muted">
                  {service.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                {service.duration_minutes != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-zinc-200">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDuration(service.duration_minutes)}
                  </span>
                )}

                {staffCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-zinc-200">
                    <Users className="h-3.5 w-3.5" />
                    {staffCount} staff
                  </span>
                )}

                {showPrice && (
                  <span className="ml-auto text-sm font-semibold text-booking-accent-light group-hover:text-booking-accent">
                    {formatPrice(service.price ?? 0, currency)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
