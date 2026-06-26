import type { Notification } from "@/types/database";

export const MAX_NOTIFICATIONS = 15;

export function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function upsertNotification(
  items: Notification[],
  next: Notification
): Notification[] {
  const without = items.filter((item) => item.id !== next.id);
  return sortNotifications([next, ...without]).slice(0, MAX_NOTIFICATIONS);
}

export function mergeNotifications(
  current: Notification[],
  incoming: Notification[]
): Notification[] {
  const map = new Map<string, Notification>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return sortNotifications([...map.values()]).slice(0, MAX_NOTIFICATIONS);
}

export function collectNewUnread(
  previous: Notification[],
  next: Notification[]
): Notification[] {
  const previousIds = new Set(previous.map((item) => item.id));
  return next.filter((item) => !previousIds.has(item.id) && !item.read_at);
}

export function countUnread(items: Notification[]): number {
  return items.filter((item) => !item.read_at).length;
}

export type NotificationListUpdate = {
  next: Notification[];
  freshUnread: Notification[];
};

export function buildListUpdate(
  previous: Notification[],
  incoming: Notification[]
): NotificationListUpdate {
  const next = sortNotifications(incoming).slice(0, MAX_NOTIFICATIONS);
  const freshUnread = collectNewUnread(previous, next);
  return { next, freshUnread };
}

export type NotificationStoreListener = () => void;

export type NotificationStore = {
  getSnapshot: () => Notification[];
  subscribe: (listener: NotificationStoreListener) => () => void;
  replace: (next: Notification[]) => NotificationListUpdate;
  upsert: (notification: Notification) => NotificationListUpdate;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
};

export function createNotificationStore(
  initial: Notification[]
): NotificationStore {
  let items = sortNotifications(initial).slice(0, MAX_NOTIFICATIONS);
  const listeners = new Set<NotificationStoreListener>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => items,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace: (next) => {
      const update = buildListUpdate(items, next);
      items = update.next;
      emit();
      return update;
    },
    upsert: (notification) => {
      const update = buildListUpdate(
        items,
        upsertNotification(items, notification)
      );
      items = update.next;
      emit();
      return update;
    },
    markRead: (notificationId) => {
      const readAt = new Date().toISOString();
      items = items.map((item) =>
        item.id === notificationId ? { ...item, read_at: readAt } : item
      );
      emit();
    },
    markAllRead: () => {
      const readAt = new Date().toISOString();
      items = items.map((item) =>
        item.read_at ? item : { ...item, read_at: readAt }
      );
      emit();
    },
  };
}
