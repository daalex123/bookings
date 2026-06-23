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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-booking-surface/95 px-6 py-3 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 text-xs transition-colors",
                active ? "text-booking-accent" : "text-booking-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "fill-booking-accent/20")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
