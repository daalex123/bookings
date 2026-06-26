"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "@/lib/admin-icons";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions";
import { useNotifications } from "@/hooks/use-notifications";
import {
  useNotificationsContext,
  useOptionalNotificationsContext,
} from "@/providers/notifications-provider";
import { cn } from "@/lib/utils";
import type { Notification, NotificationAudience } from "@/types/database";

function getNotificationHref(notification: Notification, variant: "admin" | "booking") {
  if (
    notification.type === "booking_confirmed" ||
    notification.type === "booking_cancelled"
  ) {
    if (variant === "booking") return "/my-appointments";
    if (notification.audience === "customer") return "/my-appointments";
  }
  if (variant === "booking") return "/my-appointments";
  return `/dashboard/${notification.business_id}/appointments`;
}

type NotificationBellState = {
  notifications: Notification[];
  unreadCount: number;
  markReadLocal: (notificationId: string) => void;
  markAllReadLocal: () => void;
};

function NotificationBellView({
  notifications,
  unreadCount,
  markReadLocal,
  markAllReadLocal,
  variant,
  appearance,
  businessId,
}: NotificationBellState & {
  variant: "admin" | "booking";
  appearance: "admin" | "booking";
  businessId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const isBookingVisual = appearance === "booking";
  const isBooking = variant === "booking";
  const badgeCount = unreadCount;

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleMarkRead(notification: Notification) {
    if (notification.read_at) return;
    markReadLocal(notification.id);
    startTransition(async () => {
      await markNotificationRead(notification.id);
    });
  }

  function handleMarkAllRead() {
    markAllReadLocal();
    startTransition(async () => {
      await markAllNotificationsRead(businessId, { customerOnly: isBooking });
    });
  }

  return (
    <div className="relative overflow-visible" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex items-center justify-center transition",
          isBookingVisual
            ? "rounded-2xl bg-booking-elevated p-3 text-booking-muted"
            : "h-11 w-11 rounded-full bg-white text-[#1e2235] shadow-sm hover:bg-[#fafbfc]"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {badgeCount > 0 && (
          <span
            className={cn(
              "absolute z-10 flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
              isBookingVisual
                ? "-right-1 -top-1 h-5 bg-booking-accent text-booking-accent-fg"
                : "-right-0.5 -top-0.5 h-5 bg-[#1e2235] text-white"
            )}
            data-testid="notification-unread-badge"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-2xl shadow-xl",
            isBookingVisual
              ? "border border-white/10 bg-[#161616]"
              : "border border-[#1e2235]/10 bg-white"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between border-b px-4 py-3",
              isBookingVisual ? "border-white/10" : "border-[#1e2235]/8"
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                isBookingVisual ? "text-white" : "text-[#1e2235]"
              )}
            >
              Notifications
            </p>
            {badgeCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={pending}
                className={cn(
                  "text-xs font-medium disabled:opacity-50",
                  isBookingVisual
                    ? "text-booking-muted hover:text-white"
                    : "text-[#8b92a5] hover:text-[#1e2235]"
                )}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const href = getNotificationHref(notification, variant);
                const unread = !notification.read_at;

                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => {
                      handleMarkRead(notification);
                      setOpen(false);
                    }}
                    className={cn(
                      "block border-b px-4 py-3 transition",
                      isBookingVisual
                        ? "border-white/8 hover:bg-white/5"
                        : "border-[#1e2235]/6 hover:bg-[#f8f9fb]",
                      unread &&
                        (isBookingVisual ? "bg-white/5" : "bg-[#f0f2f5]/60")
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {unread && (
                        <span
                          className={cn(
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            isBookingVisual ? "bg-booking-accent" : "bg-[#1e2235]"
                          )}
                        />
                      )}
                      <div className={cn("min-w-0 flex-1", !unread && "pl-4")}>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isBookingVisual ? "text-white" : "text-[#1e2235]"
                          )}
                        >
                          {notification.title}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-sm",
                            isBookingVisual ? "text-booking-muted" : "text-[#8b92a5]"
                          )}
                        >
                          {notification.body}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            isBookingVisual ? "text-booking-muted" : "text-[#8b92a5]"
                          )}
                        >
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p
                className={cn(
                  "px-4 py-8 text-center text-sm",
                  isBookingVisual ? "text-booking-muted" : "text-[#8b92a5]"
                )}
              >
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Admin bell that shares one realtime subscription via NotificationsProvider. */
export function ConnectedNotificationBell({
  appearance = "admin",
  businessId,
}: {
  appearance?: "admin" | "booking";
  businessId?: string;
}) {
  const { notifications, unreadCount, markReadLocal, markAllReadLocal } =
    useNotificationsContext();

  return (
    <NotificationBellView
      notifications={notifications}
      unreadCount={unreadCount}
      markReadLocal={markReadLocal}
      markAllReadLocal={markAllReadLocal}
      variant="admin"
      appearance={appearance}
      businessId={businessId}
    />
  );
}

export function NotificationBell({
  userId,
  initialNotifications,
  variant = "admin",
  appearance,
  businessId,
}: {
  userId: string;
  initialNotifications: Notification[];
  variant?: "admin" | "booking";
  appearance?: "admin" | "booking";
  businessId?: string;
}) {
  const shared = useOptionalNotificationsContext();
  const visual = appearance ?? variant;
  const isBooking = variant === "booking";

  const localState = useNotifications(userId, initialNotifications, {
    businessId,
    audience: (isBooking ? "customer" : "staff") satisfies NotificationAudience,
    enabled: !shared,
  });

  const state = shared ?? localState;

  return (
    <NotificationBellView
      notifications={state.notifications}
      unreadCount={state.unreadCount}
      markReadLocal={state.markReadLocal}
      markAllReadLocal={state.markAllReadLocal}
      variant={variant}
      appearance={visual}
      businessId={businessId}
    />
  );
}
