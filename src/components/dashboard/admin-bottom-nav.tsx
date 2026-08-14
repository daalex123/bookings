"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNavIcons } from "@/lib/admin-icons";
import { dashboardBusinessId } from "@/lib/admin-url";
import { cn } from "@/lib/utils";

/** Primary mobile nav — full sidebar remains on desktop. */
const businessNavMobile = [
  { href: "", label: "Home", icon: AdminNavIcons.overview },
  { href: "/appointments", label: "Bookings", icon: AdminNavIcons.appointments },
  { href: "/billing", label: "Billing", icon: AdminNavIcons.billing },
  { href: "/customers", label: "Clients", icon: AdminNavIcons.customers },
  { href: "/settings", label: "Settings", icon: AdminNavIcons.settings },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();
  const businessId = dashboardBusinessId(pathname);
  const onBusinessRoute = Boolean(businessId);
  const base = businessId ? `/dashboard/${businessId}` : "/dashboard";

  const items = onBusinessRoute
    ? businessNavMobile.map((item) => {
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
        {
          href: "/dashboard/profile",
          label: "Profile",
          icon: AdminNavIcons.profile,
          active: pathname === "/dashboard/profile",
        },
      ];

  return (
    <nav className="booking-bottom-nav lg:hidden">
      <div className="flex w-full items-stretch justify-around gap-1 px-2">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-0.5 text-[11px] transition-colors"
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
                "max-w-full truncate",
                active ? "font-medium text-booking-accent" : "text-booking-muted"
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
