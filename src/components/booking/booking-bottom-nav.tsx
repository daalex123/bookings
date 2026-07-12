"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function bookingNavItems(homePath: string) {
  return [
    {
      href: homePath,
      label: "Home",
      icon: Home,
      match: (p: string) => p === homePath || p.startsWith(`${homePath}/`),
    },
    {
      href: "/my-appointments",
      label: "Bookings",
      icon: CalendarDays,
      match: (p: string) => p.startsWith("/my-appointments"),
    },
    {
      href: "/account",
      label: "Profile",
      icon: User,
      match: (p: string) => p.startsWith("/account"),
    },
  ] as const;
}

export function BookingBottomNav({ homePath }: { homePath: string }) {
  const pathname = usePathname();
  const items = bookingNavItems(homePath);

  return (
    <nav className="booking-bottom-nav lg:hidden">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around lg:max-w-3xl xl:max-w-4xl">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-0 flex-col items-center gap-1 text-xs transition-colors"
            >
              <Icon
                aria-hidden
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-booking-accent" : "text-booking-muted"
                )}
                strokeWidth={active ? 2.25 : 2}
              />
              <span
                className={cn(
                  active ? "text-booking-accent" : "text-booking-muted"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BookingDesktopNav({ homePath }: { homePath: string }) {
  const pathname = usePathname();
  const items = bookingNavItems(homePath);

  return (
    <nav
      className="hidden items-center gap-1 rounded-full border border-white/10 bg-booking-elevated p-1 lg:flex"
      aria-label="Main navigation"
    >
      {items.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-booking-accent text-booking-accent-fg"
                : "text-booking-muted hover:text-white"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
