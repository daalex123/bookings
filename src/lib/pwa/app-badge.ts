type BadgeTarget = {
    setAppBadge?: (contents?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
};

function isStandaloneDisplay(): boolean {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    );
}

async function applyBadge(target: BadgeTarget, unreadCount: number): Promise<boolean> {
    const canSet = typeof target.setAppBadge === "function";
    const canClear = typeof target.clearAppBadge === "function";
    if (!canSet && !canClear) return false;

    if (unreadCount > 0 && canSet) {
        await target.setAppBadge!(unreadCount);
        return true;
    }

    if (canClear) {
        await target.clearAppBadge!();
        return true;
    }

    return false;
}

/**
 * Sync unread count to installed PWA app icon badge when supported.
 * Chrome mobile typically surfaces launcher badges only for installed standalone PWAs.
 */
export async function syncAppIconBadge(unreadCount: number): Promise<void> {
    if (typeof window === "undefined") return;
    if (!isStandaloneDisplay()) return;

    try {
        const navigatorTarget = window.navigator as BadgeTarget;
        if (await applyBadge(navigatorTarget, unreadCount)) return;

        // Some engines expose badging on the active service worker registration.
        if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await applyBadge(registration as unknown as BadgeTarget, unreadCount);
        }
    } catch {
        // Ignore badging failures to avoid affecting UI behavior.
    }
}
