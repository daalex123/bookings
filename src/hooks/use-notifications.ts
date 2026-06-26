"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
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
  isStaffNotification,
  resolveNotificationAudience,
} from "@/lib/notifications/constants";
import {
  countUnread,
  createNotificationStore,
  mergeNotifications,
  sortNotifications,
  type NotificationStore,
} from "@/lib/notifications/notification-store";
import type { Notification, NotificationAudience } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

const MAX_NOTIFICATIONS = 15;

export function useNotifications(
  userId: string,
  initialNotifications: Notification[],
  options?: {
    businessId?: string;
    audience?: NotificationAudience;
    /** @deprecated Use `audience: "customer"` instead. */
    customerOnly?: boolean;
    enabled?: boolean;
  }
) {
  const businessId = options?.businessId;
  const audience: NotificationAudience =
    options?.audience ??
    (options?.customerOnly ? "customer" : "staff");
  const enabled = options?.enabled ?? true;

  const filterNotification = useCallback(
    (notification: Notification) => {
      if (businessId && notification.business_id !== businessId) return false;
      if (audience === "customer") {
        return isCustomerNotification(notification);
      }
      return isStaffNotification(notification);
    },
    [businessId, audience]
  );

  const needsAudienceRefetch = useCallback(
    (notification: Partial<Notification>) => {
      if (resolveNotificationAudience(notification)) return false;
      return Boolean(notification.id);
    },
    []
  );

  const initialFiltered = useMemo(
    () =>
      sortNotifications(initialNotifications)
        .filter(filterNotification)
        .slice(0, MAX_NOTIFICATIONS),
    [initialNotifications, filterNotification]
  );

  const storeRef = useRef<{ userId: string; store: NotificationStore } | null>(
    null
  );
  if (!storeRef.current || storeRef.current.userId !== userId) {
    storeRef.current = {
      userId,
      store: createNotificationStore(initialFiltered),
    };
  }

  const store = storeRef.current.store;
  const wasHiddenRef = useRef(false);

  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener),
    [store]
  );
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);

  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const unreadCount = useMemo(() => countUnread(notifications), [notifications]);

  const applyList = useCallback(
    (next: Notification[], playSound: boolean) => {
      const { freshUnread } = store.replace(next);
      if (playSound && freshUnread.length > 0) {
        playNotificationSound();
      }
    },
    [store]
  );

  const applyNotification = useCallback(
    (notification: Notification, playSound: boolean) => {
      const { freshUnread } = store.upsert(notification);
      if (playSound && freshUnread.length > 0) {
        playNotificationSound();
      }
    },
    [store]
  );

  const markReadLocal = useCallback(
    (notificationId: string) => {
      store.markRead(notificationId);
    },
    [store]
  );

  const markAllReadLocal = useCallback(() => {
    store.markAllRead();
  }, [store]);

  const syncNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ audience });
      if (businessId) params.set("businessId", businessId);

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        notifications?: Notification[];
      };

      if (!data.notifications) return;

      const scoped = data.notifications.filter(filterNotification);
      applyList(mergeNotifications(store.getSnapshot(), scoped), true);
    } catch {
      // Sync should not break the UI.
    }
  }, [applyList, filterNotification, audience, businessId, store]);

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
    if (!enabled) return;

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
      if (store.getSnapshot().some((item) => item.id === row.id)) return;

      if (needsAudienceRefetch(row)) {
        void handleInsert(row.id);
        return;
      }

      if (!filterNotification(row)) return;
      applyNotification(row, true);
    };

    const handleInsert = async (notificationId: string) => {
      if (store.getSnapshot().some((item) => item.id === notificationId)) return;

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

      if (needsAudienceRefetch(row)) {
        void handleInsert(row.id);
        return;
      }

      if (!filterNotification(row)) return;
      applyNotification(row, false);
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
  }, [
    userId,
    applyNotification,
    syncNotifications,
    filterNotification,
    needsAudienceRefetch,
    enabled,
    store,
  ]);

  return {
    notifications,
    unreadCount,
    markReadLocal,
    markAllReadLocal,
    refresh: syncNotifications,
  };
}
