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
    <div className={cn("admin-card p-6 group/stat overflow-hidden relative", className)}>
      {/* Subtle glow in corner */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-[0.06] hidden lg:block" style={{ background: "var(--admin-gradient)" }} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--admin-muted)]">{label}</p>
          <p className="mt-2.5 text-[2rem] font-black tracking-tight text-[var(--admin-navy)] leading-none">
            {value}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 group-hover/stat:scale-110"
          style={{ background: "var(--admin-gradient)", color: "#0c0c0e", boxShadow: "0 4px 16px rgba(245, 166, 35, 0.25)" }}
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
