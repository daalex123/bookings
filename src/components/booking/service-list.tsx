"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { bookingFlowUrl } from "@/lib/booking";
import type { PublicService } from "@/lib/booking";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "booking-card-gradient-1",
  "booking-card-gradient-2",
  "booking-card-gradient-3",
];

export function ServiceList({
  services,
  basePath,
  currency = "LKR",
}: {
  services: PublicService[];
  basePath: string;
  currency?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, query]);

  return (
    <div className="mt-8">
      <div className="px-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-booking-muted" />
          <input
            type="search"
            placeholder="Search services"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border-0 bg-booking-elevated py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
              activeFilter === "all"
                ? "bg-booking-accent text-booking-accent-fg"
                : "bg-booking-elevated text-white"
            )}
          >
            All
          </button>
          {services.slice(0, 4).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveFilter(s.id);
                setQuery(s.name);
              }}
              className={cn(
                "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeFilter === s.id
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-booking-elevated text-white"
              )}
            >
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between px-5">
        <h2 className="text-lg font-semibold">Our Services</h2>
        <span className="text-sm text-booking-muted">{filtered.length} available</span>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 flex gap-4 overflow-x-auto px-5 pb-2">
          {filtered.map((service, index) => (
            <Link
              key={service.id}
              href={bookingFlowUrl(basePath, { serviceId: service.id })}
              className="min-w-[260px] shrink-0"
            >
              <article
                className={cn(
                  "overflow-hidden rounded-3xl",
                  !service.image_url && CARD_GRADIENTS[index % CARD_GRADIENTS.length]
                )}
              >
                <div className="flex h-52 flex-col justify-between p-5">
                  {service.image_url ? (
                    <div className="relative h-28 overflow-hidden rounded-2xl bg-black/20">
                      <Image
                        src={service.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-28 rounded-2xl bg-black/20" />
                  )}
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{service.name}</p>
                      <p className="text-sm text-white/60">
                        {service.duration_minutes} min ·{" "}
                        {formatPrice(service.price, currency)}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-booking-accent text-booking-accent-fg">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-booking-muted">
          No services match your search.
        </p>
      )}
    </div>
  );
}
