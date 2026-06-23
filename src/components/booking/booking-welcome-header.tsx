"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { Notification } from "@/types/database";

export function BookingWelcomeHeader({
  displayName,
  isGuest,
  loginHref,
  logoUrl,
  businessName,
  userId,
  notifications = [],
}: {
  displayName: string;
  isGuest: boolean;
  loginHref: string;
  logoUrl?: string | null;
  businessName?: string;
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
    <header className="flex items-center justify-between px-5 pt-6">
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
              </>
            ) : (
              `Hey, ${displayName.split(" ")[0]}`
            )}
          </p>
        </div>
      </div>
      {!isGuest && userId ? (
        <NotificationBell
          userId={userId}
          initialNotifications={notifications}
          variant="booking"
        />
      ) : (
        <div className="rounded-2xl bg-booking-elevated p-3 opacity-40" aria-hidden>
          <span className="block h-5 w-5" />
        </div>
      )}
    </header>
  );
}
