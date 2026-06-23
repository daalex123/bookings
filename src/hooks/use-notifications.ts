"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ensureRealtimeAuth,
  subscribePostgresChannel,
} from "@/lib/realtime/channel";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notification-sound";
import {
  isCustomerNotification,
} from "@/lib/notifications/constants";
import type { Notification } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

const MAX_NOTIFICATIONS = 15;

function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function upsertNotification(
  items: Notification[],
  next: Notification
): Notification[] {
  const without = items.filter((item) => item.id !== next.id);
  return sortNotifications([next, ...without]).slice(0, MAX_NOTIFICATIONS);
}

function mergeNotifications(
  current: Notification[],
  incoming: Notification[]
): Notification[] {
  const map = new Map<string, Notification>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return sortNotifications([...map.values()]).slice(0, MAX_NOTIFICATIONS);
}

function collectNewUnread(
  previous: Notification[],
  next: Notification[]
): Notification[] {
  const previousIds = new Set(previous.map((item) => item.id));
  return next.filter((item) => !previousIds.has(item.id) && !item.read_at);
}

export function useNotifications(
  userId: string,
  initialNotifications: Notification[],
  options?: { businessId?: string; customerOnly?: boolean }
) {
  const businessId = options?.businessId;
  const customerOnly = options?.customerOnly ?? Boolean(businessId);

  const filterNotification = useCallback(
    (notification: Notification) => {
      if (businessId && notification.business_id !== businessId) return false;
      if (customerOnly && !isCustomerNotification(notification)) return false;
      return true;
    },
    [businessId, customerOnly]
  );

  const initialFiltered = useMemo(
    () =>
      sortNotifications(initialNotifications)
        .filter(filterNotification)
        .slice(0, MAX_NOTIFICATIONS),
    [initialNotifications, filterNotification]
  );

  const itemsRef = useRef<Notification[]>(initialFiltered);
  const [items, setItems] = useState<Notification[]>(initialFiltered);
  const wasHiddenRef = useRef(false);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items]
  );

  const applyList = useCallback((next: Notification[], playSound: boolean) => {
    const sorted = sortNotifications(next).slice(0, MAX_NOTIFICATIONS);
    const previous = itemsRef.current;
    const freshUnread = collectNewUnread(previous, sorted);

    itemsRef.current = sorted;
    setItems(sorted);

    if (playSound && freshUnread.length > 0) {
      playNotificationSound();
    }
  }, []);

  const markReadLocal = useCallback((notificationId: string) => {
    const readAt = new Date().toISOString();
    const next = itemsRef.current.map((item) =>
      item.id === notificationId ? { ...item, read_at: readAt } : item
    );
    itemsRef.current = next;
    setItems(next);
  }, []);

  const markAllReadLocal = useCallback(() => {
    const readAt = new Date().toISOString();
    const next = itemsRef.current.map((item) =>
      item.read_at ? item : { ...item, read_at: readAt }
    );
    itemsRef.current = next;
    setItems(next);
  }, []);

  const syncNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        notifications?: Notification[];
      };

      if (!data.notifications) return;

      const scoped = data.notifications.filter(filterNotification);
      applyList(mergeNotifications(itemsRef.current, scoped), true);
    } catch {
      // Sync should not break the UI.
    }
  }, [applyList, filterNotification]);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        return;
      }
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        void syncNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    const handleInsertRow = (row: Notification) => {
      if (!row?.id || cancelled) return;
      if (itemsRef.current.some((item) => item.id === row.id)) return;
      if (!filterNotification(row)) return;
      applyList(upsertNotification(itemsRef.current, row), true);
    };

    const handleInsert = async (notificationId: string) => {
      if (itemsRef.current.some((item) => item.id === notificationId)) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data || cancelled) return;
      handleInsertRow(data as Notification);
    };

    const handleUpdateRow = (row: Notification) => {
      if (!row?.id || cancelled) return;
      if (!filterNotification(row)) return;
      const next = upsertNotification(itemsRef.current, row);
      itemsRef.current = next;
      setItems(next);
    };

    const connect = async () => {
      if (cancelled) return;

      const authed = await ensureRealtimeAuth(supabase);
      if (!authed || cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = await subscribePostgresChannel(
        supabase,
        `notifications:${userId}`,
        (next) =>
          next
            .on("broadcast", { event: "new_notification" }, (message) => {
              const id = (message.payload as { id?: string } | null)?.id;
              if (id) void handleInsert(id);
            })
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userId}`,
              },
              (payload) => {
                handleInsertRow(payload.new as Notification);
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${userId}`,
              },
              (payload) => {
                handleUpdateRow(payload.new as Notification);
              }
            ),
        (status, err) => {
          if (cancelled) return;

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[realtime:notifications]", status, err?.message);
            retryTimer = setTimeout(() => {
              void connect();
            }, 3000);
          }
        }
      );
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token || cancelled) return;
      void supabase.realtime.setAuth(session.access_token);
    });

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      authSubscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, businessId, applyList, syncNotifications, filterNotification]);

  return {
    notifications: items,
    unreadCount,
    markReadLocal,
    markAllReadLocal,
    refresh: syncNotifications,
  };
}
