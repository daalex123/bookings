"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AdminNavIcons } from "@/lib/admin-icons";
import { signOut } from "@/lib/actions";
import { cn } from "@/lib/utils";

const businessNav = [
  { href: "", label: "Overview", icon: AdminNavIcons.overview },
  { href: "/services", label: "Services", icon: AdminNavIcons.services },
  { href: "/appointments", label: "Appointments", icon: AdminNavIcons.appointments },
  { href: "/income", label: "Income", icon: AdminNavIcons.income },
  { href: "/customers", label: "Customers", icon: AdminNavIcons.customers },
  { href: "/staff", label: "Staff", icon: AdminNavIcons.staff },
  { href: "/settings", label: "Settings", icon: AdminNavIcons.settings },
] as const;

function getBusinessId(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (!match) return null;
  return match[1];
}

export function AdminSidebar({
  userName,
  userEmail,
  businessName,
  businessLogoUrl,
}: {
  userName: string;
  userEmail: string;
  businessName?: string | null;
  businessLogoUrl?: string | null;
}) {
  const pathname = usePathname();
  const businessId = getBusinessId(pathname);
  const onBusinessRoute = Boolean(businessId);
  const base = businessId ? `/dashboard/${businessId}` : "/dashboard";

  const brandTitle = onBusinessRoute && businessName ? businessName : "BookNow";
  const brandInitials = brandTitle
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col px-4 py-6 lg:px-5">
      {/* Brand header */}
      <div className="mb-8 flex items-center gap-3 px-2">
        {onBusinessRoute && businessLogoUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-2 ring-[var(--admin-accent)]/30 shadow-md">
            <Image
              src={businessLogoUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold shadow-lg"
            style={{ background: "var(--admin-gradient)", color: "#0c0c0e" }}
          >
            {brandInitials || "B"}
          </div>
        )}
        <div className="min-w-0">
          <span className="block truncate text-[1.05rem] font-bold tracking-tight text-[var(--admin-navy)]">
            {brandTitle}
          </span>
          {onBusinessRoute && businessName ? (
            <span className="block truncate text-[11px] font-medium text-[var(--admin-muted)]">
              Business admin
            </span>
          ) : null}
        </div>
      </div>

      {/* Section label */}
      <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-muted)]">
        {onBusinessRoute ? "Menu" : "Navigation"}
      </p>

      <nav className="flex flex-1 flex-col gap-0.5">
        {!onBusinessRoute ? (
          <Link
            href="/dashboard"
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.84rem] font-medium transition-all duration-200",
              pathname === "/dashboard"
                ? "admin-pill-active"
                : "admin-pill-idle"
            )}
          >
            <AdminNavIcons.businesses className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.75} />
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
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.84rem] font-medium transition-all duration-200",
                    active ? "admin-pill-active" : "admin-pill-idle"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}

            <div className="my-3 h-px bg-[var(--admin-border)]" />

            <Link
              href="/dashboard"
              className="group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.84rem] font-medium admin-pill-idle"
            >
              <AdminNavIcons.businesses className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.75} />
              All businesses
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-[var(--admin-border)] pt-5">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm"
            style={{ background: "var(--admin-gradient)", color: "#0c0c0e" }}
          >
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--admin-navy)]">
              {userName}
            </p>
            <p className="truncate text-[11px] text-[var(--admin-muted)]">{userEmail}</p>
          </div>
        </div>
        <form action={signOut} className="mt-2 px-2">
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-accent-bg)] hover:text-[var(--admin-accent)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-[264px] shrink-0 border-r border-[var(--admin-border)] bg-[var(--admin-surface)] lg:static lg:block">
        {sidebarContent}
      </aside>
    </>
  );
}
