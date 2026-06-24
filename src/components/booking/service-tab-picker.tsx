"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useActionLoading } from "@/providers/action-loading-provider";
import { cn } from "@/lib/utils";

export function ServiceTabPicker({
  services,
  flowPath,
  selectedServiceId,
  dateStr,
}: {
  services: { id: string; name: string }[];
  flowPath: string;
  selectedServiceId: string;
  dateStr: string;
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

  if (services.length <= 1) return null;

  return (
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {services.map((service) => {
        const selected = service.id === selectedServiceId;
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
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70",
              selected
                ? "bg-booking-accent text-booking-accent-fg"
                : "bg-booking-elevated text-white"
            )}
          >
            {service.name}
          </button>
        );
      })}
    </div>
  );
}
