"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification, NotificationAudience } from "@/types/database";

type NotificationsContextValue = ReturnType<typeof useNotifications>;

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({
  userId,
  initialNotifications,
  businessId,
  audience,
  children,
}: {
  userId: string;
  initialNotifications: Notification[];
  businessId?: string;
  audience: NotificationAudience;
  children: ReactNode;
}) {
  const value = useNotifications(userId, initialNotifications, {
    businessId,
    audience,
  });

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error(
      "useNotificationsContext must be used within NotificationsProvider"
    );
  }
  return value;
}

export function useOptionalNotificationsContext(): NotificationsContextValue | null {
  return useContext(NotificationsContext);
}
