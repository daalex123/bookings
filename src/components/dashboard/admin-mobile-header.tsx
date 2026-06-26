import Image from "next/image";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { BookingSignOutButton } from "@/components/booking/booking-sign-out-button";
import type { Notification } from "@/types/database";

export function AdminMobileHeader({
  displayName,
  logoUrl,
  businessName,
  businessId,
  userId,
  notifications = [],
}: {
  displayName: string;
  logoUrl?: string | null;
  businessName?: string | null;
  businessId?: string;
  userId: string;
  notifications?: Notification[];
}) {
  const heading = businessName ?? "BookNow Admin";
  const initials = heading
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="booking-header-pad flex items-center justify-between gap-3 px-5 pb-2 lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-booking-elevated">
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-booking-elevated text-sm font-bold">
            {initials || "B"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-booking-muted">
            {businessName ? "Business admin" : "Admin dashboard"}
          </p>
          <p className="truncate font-semibold">
            Hey, {displayName.split(" ")[0]}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <NotificationBell
          userId={userId}
          initialNotifications={notifications}
          variant="booking"
          businessId={businessId}
        />
        <BookingSignOutButton variant="compact" />
      </div>
    </header>
  );
}
