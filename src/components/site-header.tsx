import Link from "next/link";
import { getActiveBusinessPath } from "@/lib/business-context";
import {
  canAccessAdminDashboard,
  getCurrentUser,
} from "@/lib/supabase/auth";
import { getUserNotifications } from "@/lib/notifications/queries";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions";

export async function SiteHeader() {
  const [user, activeBusinessPath] = await Promise.all([
    getCurrentUser(),
    getActiveBusinessPath(),
  ]);

  const homeHref = activeBusinessPath ?? "/";
  const authRedirect = activeBusinessPath
    ? `?redirect=${encodeURIComponent(activeBusinessPath)}`
    : "";

  const showDashboard = user ? await canAccessAdminDashboard(user.id) : false;
  const notifications = user ? await getUserNotifications(user.id) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={homeHref} className="text-lg font-bold tracking-tight text-zinc-900">
          BookNow
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          {!activeBusinessPath && (
            <Link
              href="/"
              className="hidden rounded-lg px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 sm:inline-block"
            >
              Home
            </Link>
          )}
          {user ? (
            <>
              <NotificationBell
                userId={user.id}
                initialNotifications={notifications}
                variant="admin"
              />
              <Link
                href="/my-appointments"
                className="rounded-lg px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <span className="hidden sm:inline">My appointments</span>
                <span className="sm:hidden">Bookings</span>
              </Link>
              {showDashboard && (
                <Link
                  href="/dashboard"
                  className="rounded-lg px-2.5 py-1.5 font-medium text-zinc-900 hover:bg-zinc-100"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/account"
                className="hidden rounded-lg px-2.5 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:inline-block"
              >
                Account
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm" className="rounded-lg">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href={`/login${authRedirect}`}>
                <Button variant="ghost" size="sm" className="rounded-lg">
                  Sign in
                </Button>
              </Link>
              <Link href={`/register${authRedirect}`}>
                <Button size="sm" className="rounded-lg">Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
