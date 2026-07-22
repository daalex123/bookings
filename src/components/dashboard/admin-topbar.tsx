import { format } from "date-fns";
import { Search } from "@/lib/admin-icons";
import { ConnectedNotificationBell } from "@/components/dashboard/notification-bell";
import { AdminThemeToggle } from "@/components/dashboard/admin-theme-toggle";
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
    <header className="sticky top-0 z-30 hidden border-b border-(--admin-border) bg-(--admin-surface)/80 backdrop-blur-xl lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--admin-muted)" />
          <input
            type="search"
            placeholder="Search anything..."
            className="h-10 w-full rounded-xl border border-(--admin-border) bg-(--admin-elevated) pl-10 pr-4 text-sm text-(--admin-navy) shadow-sm transition-shadow placeholder:text-(--admin-muted) focus:outline-none focus:ring-2 focus:ring-(--admin-accent)/20 focus:border-(--admin-accent)/30"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-4">
        <AdminThemeToggle />
        <p className="hidden text-sm font-medium text-(--admin-muted) sm:block">
          {today}
        </p>
        <div className="h-5 w-px bg-(--admin-border) hidden sm:block" />
        <ConnectedNotificationBell appearance="admin" businessId={businessId} />
      </div>
    </header>
  );
}
