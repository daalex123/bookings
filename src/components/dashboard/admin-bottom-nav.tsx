"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNavIcons } from "@/lib/admin-icons";
import { cn } from "@/lib/utils";

const businessNav = [
  { href: "", label: "Home", icon: AdminNavIcons.overview },
  { href: "/services", label: "Services", icon: AdminNavIcons.services },
  { href: "/appointments", label: "Bookings", icon: AdminNavIcons.appointments },
  { href: "/customers", label: "Clients", icon: AdminNavIcons.customers },
  { href: "/settings", label: "Settings", icon: AdminNavIcons.settings },
] as const;

function getBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!match) return null;
  return match[1];
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const businessId = getBusinessId(pathname);
  const onBusinessRoute = Boolean(businessId);
  const base = businessId ? `/dashboard/${businessId}` : "/dashboard";

  const items = onBusinessRoute
    ? businessNav.map((item) => {
        const path = item.href ? `${base}${item.href}` : base;
        const active =
          item.href === ""
            ? pathname === base
            : pathname === path || pathname.startsWith(`${path}/`);
        return { ...item, href: path, active };
      })
    : [
        {
          href: "/dashboard",
          label: "Businesses",
          icon: AdminNavIcons.businesses,
          active: pathname === "/dashboard",
        },
      ];

  return (
    <nav className="booking-bottom-nav lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 text-[10px] transition-colors sm:text-xs"
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
                "truncate",
                active ? "text-booking-accent" : "text-booking-muted"
              )}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
