"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BookingBottomNav({ homePath }: { homePath: string }) {
  const pathname = usePathname();

  const items = [
    { href: homePath, label: "Home", icon: Home, match: (p: string) =>
        p === homePath || p.startsWith(`${homePath}/`) },
    { href: "/my-appointments", label: "Bookings", icon: CalendarDays, match: (p: string) =>
        p.startsWith("/my-appointments") },
    { href: "/account", label: "Profile", icon: User, match: (p: string) =>
        p.startsWith("/account") },
  ];

  return (
    <nav className="booking-bottom-nav">
      <div className="mx-auto flex max-w-lg items-center justify-around">
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
