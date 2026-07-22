import Link from "next/link";
import { getActiveBusinessPath, businessAuthPath } from "@/lib/business-context";
import {
  canAccessAdminDashboard,
  getCurrentUser,
  isSuperAdmin,
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
  const loginHref = activeBusinessPath
    ? `${businessAuthPath(activeBusinessPath, "login")}?redirect=${encodeURIComponent(activeBusinessPath)}`
    : "/login";
  const registerHref = activeBusinessPath
    ? `${businessAuthPath(activeBusinessPath, "register")}?redirect=${encodeURIComponent(activeBusinessPath)}`
    : "/register";

  const showDashboard = user ? await canAccessAdminDashboard(user.id) : false;
  const notifications = user ? await getUserNotifications(user.id) : [];
  const superAdmin = user ? await isSuperAdmin() : false;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={homeHref} className="text-lg font-bold tracking-tight text-zinc-100">
          BookNow
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          {!activeBusinessPath && (
            <Link
              href="/"
              className="hidden rounded-lg px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 sm:inline-block"
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
                className="rounded-lg px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <span className="hidden sm:inline">My appointments</span>
                <span className="sm:hidden">Bookings</span>
              </Link>
              {showDashboard && (
                <Link
                  href="/dashboard"
                  className="rounded-lg px-2.5 py-1.5 font-medium text-zinc-100 hover:bg-zinc-800"
                >
                  Dashboard
                </Link>
              )}
              {superAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-2.5 py-1.5 font-medium text-emerald-400 hover:bg-zinc-800 hover:text-emerald-300"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="hidden rounded-lg px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 md:inline-block"
              >
                Account
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="outline" size="sm" className="rounded-lg border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href={loginHref}>
                <Button variant="ghost" size="sm" className="rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                  Sign in
                </Button>
              </Link>
              <Link href={registerHref}>
                <Button size="sm" className="rounded-lg">Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
