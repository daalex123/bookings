"use client";

import { useMemo, useState } from "react";
import type { PublicServiceAddon } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AddonPicker({
  addons,
  serviceId,
  basePrice,
  currency,
}: {
  addons: PublicServiceAddon[];
  serviceId: string;
  basePrice: number;
  currency: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableAddons = useMemo(
    () => addons.filter((addon) => addon.parent_service_id === serviceId),
    [addons, serviceId]
  );

  const totalPrice = useMemo(() => {
    const addonTotal = availableAddons
      .filter((addon) => selected.has(addon.id))
      .reduce((sum, addon) => sum + addon.price, 0);
    return basePrice + addonTotal;
  }, [availableAddons, basePrice, selected]);

  if (availableAddons.length === 0) return null;

  function toggleAddon(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-booking-muted">
          Additional services
        </h2>
        <p className="text-sm font-semibold text-white">
          Total {formatPrice(totalPrice, currency)}
        </p>
      </div>

      <div className="space-y-2">
        {availableAddons.map((addon) => {
          const checked = selected.has(addon.id);
          return (
            <label
              key={addon.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                checked
                  ? "border-booking-accent/60 bg-booking-accent/10"
                  : "border-transparent bg-booking-elevated"
              )}
            >
              <input
                type="checkbox"
                name="addonServiceIds"
                value={addon.id}
                checked={checked}
                onChange={() => toggleAddon(addon.id)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-booking-bg text-booking-accent focus:ring-booking-accent/40"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-white">{addon.name}</span>
                {addon.description && (
                  <span className="mt-0.5 block text-sm text-booking-muted">
                    {addon.description}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-medium text-white">
                +{formatPrice(addon.price, currency)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
