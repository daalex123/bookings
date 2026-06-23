import { format } from "date-fns";
import { Search } from "lucide-react";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { Notification } from "@/types/database";

export function AdminTopbar({
  userId,
  notifications,
}: {
  userId: string;
  notifications: Notification[];
}) {
  const today = format(new Date(), "EEEE, do MMMM");

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-[#1e2235]/8 bg-[#f0f2f5]/90 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-12 lg:pl-0">
        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b92a5]" />
          <input
            type="search"
            placeholder="Search..."
            className="h-11 w-full rounded-full border-0 bg-white pl-11 pr-4 text-sm text-[#1e2235] shadow-sm placeholder:text-[#8b92a5] focus:outline-none focus:ring-2 focus:ring-[#1e2235]/10"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        <p className="hidden text-sm font-medium text-[#8b92a5] sm:block">
          {today}
        </p>
        <NotificationBell
          userId={userId}
          initialNotifications={notifications}
        />
      </div>
    </header>
  );
}
