import { format } from "date-fns";
import { Search } from "@/lib/admin-icons";
import { ConnectedNotificationBell } from "@/components/dashboard/notification-bell";
import type { Notification } from "@/types/database";

export function AdminTopbar({
  notifications: _notifications,
  userId: _userId,
  businessId,
}: {
  userId: string;
  notifications: Notification[];
  businessId?: string;
}) {
  const today = format(new Date(), "EEEE, do MMMM");

  return (
    <header className="sticky top-0 z-30 hidden border-b border-[var(--admin-border)] bg-white/60 backdrop-blur-xl lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" />
          <input
            type="search"
            placeholder="Search anything..."
            className="h-10 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] pl-10 pr-4 text-sm text-[var(--admin-navy)] shadow-sm transition-shadow placeholder:text-[var(--admin-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 focus:border-[var(--admin-accent)]/30"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-4">
        <p className="hidden text-sm font-medium text-[var(--admin-muted)] sm:block">
          {today}
        </p>
        <div className="h-5 w-px bg-[var(--admin-border)] hidden sm:block" />
        <ConnectedNotificationBell appearance="admin" businessId={businessId} />
      </div>
    </header>
  );
}
