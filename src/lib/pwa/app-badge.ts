type BadgeNavigator = Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
};

/**
 * Sync unread count to installed PWA app icon badge when supported.
 * Silently no-ops on unsupported browsers/platforms.
 */
export async function syncAppIconBadge(unreadCount: number): Promise<void> {
    if (typeof window === "undefined") return;

    const nav = window.navigator as BadgeNavigator;
    const hasBadging =
        typeof nav.setAppBadge === "function" ||
        typeof nav.clearAppBadge === "function";

    if (!hasBadging) return;

    try {
        if (unreadCount > 0 && typeof nav.setAppBadge === "function") {
            await nav.setAppBadge(unreadCount);
            return;
        }

        if (typeof nav.clearAppBadge === "function") {
            await nav.clearAppBadge();
        }
    } catch {
        // Ignore badging failures to avoid affecting UI behavior.
    }
}
