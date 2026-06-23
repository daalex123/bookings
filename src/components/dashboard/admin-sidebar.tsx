"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Menu,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";

const businessNav = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function getBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!match) return null;
  return match[1];
}

export function AdminSidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const businessId = getBusinessId(pathname);
  const onBusinessRoute = Boolean(businessId);
  const base = businessId ? `/dashboard/${businessId}` : "/dashboard";

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col px-4 py-6 lg:px-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e2235] text-sm font-bold text-white">
          B
        </div>
        <span className="text-lg font-bold tracking-tight text-[#1e2235]">
          BookNow
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {!onBusinessRoute ? (
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all",
              pathname === "/dashboard"
                ? "admin-pill-active shadow-sm"
                : "admin-pill-idle"
            )}
          >
            <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Businesses
          </Link>
        ) : (
          <>
            {businessNav.map((item) => {
              const path = item.href ? `${base}${item.href}` : base;
              const active =
                item.href === ""
                  ? pathname === base
                  : pathname === path || pathname.startsWith(`${path}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all",
                    active ? "admin-pill-active shadow-sm" : "admin-pill-idle"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium admin-pill-idle"
            >
              <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
              All businesses
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[#1e2235]/8 pt-5">
        <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eaf0] text-sm font-semibold text-[#1e2235]">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1e2235]">
              {userName}
            </p>
            <p className="truncate text-xs text-[#8b92a5]">{userEmail}</p>
          </div>
        </div>
        <form action={signOut} className="mt-2 px-2">
          <button
            type="submit"
            className="text-xs font-medium text-[#8b92a5] hover:text-[#1e2235]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-[#1e2235]" />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#1e2235]/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-[#f0f2f5] transition-transform duration-200 lg:static lg:z-auto lg:w-[260px] lg:shrink-0 lg:translate-x-0 lg:border-r lg:border-[#1e2235]/8",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 lg:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
