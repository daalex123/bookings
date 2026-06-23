"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { BookingSignOutButton } from "@/components/booking/booking-sign-out-button";
import type { Notification } from "@/types/database";

export function BookingWelcomeHeader({
  displayName,
  isGuest,
  loginHref,
  registerHref,
  logoUrl,
  businessName,
  businessId,
  userId,
  notifications = [],
}: {
  displayName: string;
  isGuest: boolean;
  loginHref: string;
  registerHref?: string;
  logoUrl?: string | null;
  businessName?: string;
  businessId?: string;
  userId?: string;
  notifications?: Notification[];
}) {
  const initials = (businessName ?? displayName)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="booking-header-pad flex items-center justify-between gap-3 px-5 pb-2">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-booking-elevated">
            <Image src={logoUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-booking-elevated text-sm font-bold">
            {initials || "?"}
          </div>
        )}
        <div>
          <p className="text-sm text-booking-muted">
            {isGuest ? "Welcome" : "Welcome back"}
          </p>
          <p className="font-semibold">
            {isGuest ? (
              <>
                Hey, guest ·{" "}
                <Link href={loginHref} className="text-booking-accent underline">
                  Sign in
                </Link>
                {registerHref ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={registerHref} className="text-booking-accent underline">
                      Register
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              `Hey, ${displayName.split(" ")[0]}`
            )}
          </p>
        </div>
      </div>
      {!isGuest ? (
        <div className="flex shrink-0 items-center gap-0.5">
          {userId ? (
            <NotificationBell
              userId={userId}
              initialNotifications={notifications}
              variant="booking"
              businessId={businessId}
            />
          ) : null}
          <BookingSignOutButton variant="compact" />
        </div>
      ) : null}
    </header>
  );
}
