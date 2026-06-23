import { headers } from "next/headers";
import {
  authPathForContext,
  businessAuthPath,
  isBusinessAuthPath,
  safeRedirectPath,
} from "@/lib/business-context";
import type { PublicBusiness } from "@/lib/booking";
import { getCurrentUser, getProfileName } from "@/lib/supabase/auth";
import { getUserNotifications } from "@/lib/notifications/queries";
import { BookingWelcomeHeader } from "@/components/booking/booking-welcome-header";

function isAuthPage(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    isBusinessAuthPath(pathname)
  );
}

export async function BookingAppHeader({
  business,
  homePath,
}: {
  business: PublicBusiness | null;
  homePath: string;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  if (isAuthPage(pathname)) return null;

  const user = await getCurrentUser();
  let displayName = "Guest";
  let notifications: Awaited<ReturnType<typeof getUserNotifications>> = [];

  if (user) {
    const [fullName, userNotifications] = await Promise.all([
      getProfileName(user.id),
      getUserNotifications(user.id, {
        businessId: business?.id,
        customerOnly: Boolean(business),
      }),
    ]);
    displayName = fullName || user.email?.split("@")[0] || "there";
    notifications = userNotifications;
  }

  const redirectTo = safeRedirectPath(pathname || homePath);
  const loginHref = business
    ? `${businessAuthPath(homePath, "login")}?redirect=${encodeURIComponent(redirectTo)}`
    : `${authPathForContext(homePath, "login")}?redirect=${encodeURIComponent(redirectTo)}`;
  const registerHref = business
    ? `${businessAuthPath(homePath, "register")}?redirect=${encodeURIComponent(redirectTo)}`
    : `${authPathForContext(homePath, "register")}?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <BookingWelcomeHeader
      displayName={displayName}
      isGuest={!user}
      loginHref={loginHref}
      registerHref={registerHref}
      logoUrl={business?.logo_url}
      businessName={business?.name}
      businessId={business?.id}
      userId={user?.id}
      notifications={notifications}
    />
  );
}
