"use client";

import { useMemo, useState } from "react";
import type { PublicServiceAddon } from "@/lib/booking";
import { serviceShowsPrice } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AddonPicker({
  addons,
  serviceId,
  basePrice,
  showBasePrice,
  currency,
}: {
  addons: PublicServiceAddon[];
  serviceId: string;
  basePrice: number;
  showBasePrice: boolean;
  currency: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const availableAddons = useMemo(
    () => addons.filter((addon) => addon.parent_service_id === serviceId),
    [addons, serviceId]
  );

  const showAnyPricing =
    showBasePrice || availableAddons.some((addon) => serviceShowsPrice(addon));

  const totalPrice = useMemo(() => {
    let total = showBasePrice ? basePrice : 0;
    for (const addon of availableAddons) {
      if (selected.has(addon.id) && serviceShowsPrice(addon)) {
        total += addon.price;
      }
    }
    return total;
  }, [availableAddons, basePrice, selected, showBasePrice]);

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
        {showAnyPricing && (
          <p className="text-sm font-semibold text-white">
            Total {formatPrice(totalPrice, currency)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {availableAddons.map((addon) => {
          const checked = selected.has(addon.id);
          const showAddonPrice = serviceShowsPrice(addon);
          return (
            <label
              key={addon.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                checked
                  ? "border-booking-accent/60 bg-booking-accent/15 booking-glass"
                  : "border-transparent booking-glass-card"
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
              {showAddonPrice && (
                <span className="shrink-0 text-sm font-medium text-white">
                  +{formatPrice(addon.price, currency)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
