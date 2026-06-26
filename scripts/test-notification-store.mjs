function sortNotifications(items) {
  return [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function upsertNotification(items, next) {
  const without = items.filter((item) => item.id !== next.id);
  return sortNotifications([next, ...without]).slice(0, 15);
}

function collectNewUnread(previous, next) {
  const previousIds = new Set(previous.map((item) => item.id));
  return next.filter((item) => !previousIds.has(item.id) && !item.read_at);
}

function buildListUpdate(previous, incoming) {
  const next = sortNotifications(incoming).slice(0, 15);
  const freshUnread = collectNewUnread(previous, next);
  return { next, freshUnread };
}

function countUnread(items) {
  return items.filter((item) => !item.read_at).length;
}

function createNotificationStore(initial) {
  let items = sortNotifications(initial).slice(0, 15);
  const listeners = new Set();

  const emit = () => listeners.forEach((listener) => listener());

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
  };
}

function notification(id) {
  return {
    id,
    read_at: null,
    created_at: `2026-06-26T12:00:0${id}Z`,
  };
}

const store = createNotificationStore([notification("1")]);

let lastUnread = countUnread(store.getSnapshot());
let unreadUpdates = 0;
store.subscribe(() => {
  const unread = countUnread(store.getSnapshot());
  if (unread !== lastUnread) {
    lastUnread = unread;
    unreadUpdates += 1;
  }
});

const realtimeUpdate = store.upsert(notification("2"));
if (realtimeUpdate.freshUnread.length !== 1) {
  throw new Error("expected one fresh unread notification");
}
if (lastUnread !== 2) {
  throw new Error(`expected unread count 2 after upsert, got ${lastUnread}`);
}
if (unreadUpdates !== 1) {
  throw new Error(`expected one unread update after upsert, got ${unreadUpdates}`);
}

// Old bug: stale server props reset store after sound played
store.replace([notification("1")]);
if (lastUnread !== 1) {
  throw new Error(
    `stale server reset should drop the new notification, got unread ${lastUnread}`
  );
}

// Fixed behavior: another realtime event is not wiped by server props
store.upsert(notification("3"));
if (lastUnread !== 2) {
  throw new Error(
    `expected unread count 2 after second upsert, got ${lastUnread}`
  );
}
if (!store.getSnapshot().some((item) => item.id === "3")) {
  throw new Error("expected notification 3 to remain in store");
}

console.log("notification-store regression tests passed");
