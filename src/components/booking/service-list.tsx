"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, User } from "lucide-react";
import { bookingFlowUrl } from "@/lib/booking";
import type { PublicService } from "@/lib/booking";
import { serviceShowsPrice } from "@/lib/booking";
import { formatPrice, formatDuration, cn } from "@/lib/utils";

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
            className="w-full rounded-2xl booking-glass-input py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
              activeFilter === "all"
                ? "bg-booking-accent text-booking-accent-fg shadow-[0_4px_20px_color-mix(in_srgb,var(--color-booking-accent)_40%,transparent)]"
                : "booking-glass-pill text-white"
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
                  ? "bg-booking-accent text-booking-accent-fg shadow-[0_4px_20px_color-mix(in_srgb,var(--color-booking-accent)_40%,transparent)]"
                  : "booking-glass-pill text-white"
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
        <>
          <div className="mt-4 grid gap-4 px-5 md:hidden">
            {filtered.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={index}
                basePath={basePath}
                currency={currency}
                className="w-full"
              />
            ))}
          </div>
          <div className="mt-4 hidden gap-4 px-5 md:grid md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                index={index}
                basePath={basePath}
                currency={currency}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="px-5 py-8 text-center text-booking-muted">
          No services match your search.
        </p>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  index,
  basePath,
  currency,
  className,
}: {
  service: PublicService;
  index: number;
  basePath: string;
  currency: string;
  className?: string;
}) {
  return (
    <Link
      href={bookingFlowUrl(basePath, { serviceId: service.id })}
      className={className}
    >
      <article
        className={cn(
          "h-full overflow-hidden rounded-3xl booking-glass-card transition-all hover:-translate-y-0.5 hover:border-booking-accent/45 hover:shadow-[0_20px_36px_rgba(0,0,0,0.38)]",
          !service.image_url && CARD_GRADIENTS[index % CARD_GRADIENTS.length]
        )}
      >
        <div className="flex min-h-76 flex-col justify-between p-5 md:min-h-56">
          {service.image_url ? (
            <div className="relative h-36 overflow-hidden rounded-2xl booking-glass md:h-28">
              <Image
                src={service.image_url}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="h-36 rounded-2xl booking-glass md:h-28" />
          )}
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xl font-bold tracking-tight md:text-lg">{service.name}</p>
              {service.description && (
                <p className="mt-1 line-clamp-2 text-sm text-white/65 md:line-clamp-1">
                  {service.description}
                </p>
              )}
              <p className="mt-1 text-sm text-white/70">
                {formatDuration(service.duration_minutes)}
                {serviceShowsPrice(service) &&
                  ` · ${formatPrice(service.price, currency)}`}
              </p>
              {service.staff_names?.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0 text-booking-accent" />
                  <p className="truncate text-sm font-medium text-white/80">
                    {service.staff_names.join(", ")}
                  </p>
                </div>
              )}
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-booking-accent text-booking-accent-fg md:h-10 md:w-10">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
