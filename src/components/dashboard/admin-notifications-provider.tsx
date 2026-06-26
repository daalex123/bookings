"use client";

import { NotificationsProvider } from "@/providers/notifications-provider";
import { STAFF_NOTIFICATION_AUDIENCE } from "@/lib/notifications/constants";
import type { Notification } from "@/types/database";

export function AdminNotificationsProvider({
  userId,
  businessId,
  initialNotifications,
  children,
}: {
  userId: string;
  businessId?: string;
  initialNotifications: Notification[];
  children: React.ReactNode;
}) {
  return (
    <NotificationsProvider
      userId={userId}
      businessId={businessId}
      audience={STAFF_NOTIFICATION_AUDIENCE}
      initialNotifications={initialNotifications}
    >
      {children}
    </NotificationsProvider>
  );
}
