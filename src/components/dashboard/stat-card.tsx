import Link from "next/link";
import type { LucideIcon } from "@/lib/admin-icons";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  className,
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  href?: string;
}) {
  const content = (
    <div className={cn("admin-card bg-booking-elevated p-6 lg:bg-[var(--admin-surface)] group/stat overflow-hidden relative", className)}>
      {/* Subtle gradient shimmer in background */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.04] lg:block hidden" style={{ background: "var(--admin-gradient)" }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-booking-muted lg:text-[var(--admin-muted)]">{label}</p>
          <p className="mt-2.5 text-[2rem] font-black tracking-tight text-white lg:text-[var(--admin-navy)] leading-none">
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 group-hover/stat:scale-110 group-hover/stat:shadow-indigo-500/40"
          style={{ background: "var(--admin-gradient)" }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}
