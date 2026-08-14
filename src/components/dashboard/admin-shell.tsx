import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminNotificationsProvider } from "@/components/dashboard/admin-notifications-provider";
import { AdminBottomNav } from "@/components/dashboard/admin-bottom-nav";
import { AdminMobileHeader } from "@/components/dashboard/admin-mobile-header";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { AdminTopbar } from "@/components/dashboard/admin-topbar";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";
import { AdminInstallAppBanner } from "@/components/pwa/admin-install-app-banner";
import { dashboardBusinessId } from "@/lib/admin-url";
import { getUserNotifications, STAFF_NOTIFICATION_AUDIENCE } from "@/lib/notifications/queries";
import { getCurrentUser, getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const businessId = dashboardBusinessId(pathname);

  const supabase = await createClient();

  const [profile, notifications, businessResult] = await Promise.all([
    getProfile(user.id),
    getUserNotifications(user.id, {
      businessId: businessId ?? undefined,
      audience: STAFF_NOTIFICATION_AUDIENCE,
    }),
    businessId
      ? supabase
        .from("businesses")
        .select("id, name, logo_url, brand_color, background_color")
        .eq("id", businessId)
        .single()
      : Promise.resolve({ data: null }),
  ]);

  const business = businessResult.data;
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const userEmail = user.email ?? "";
  const userAvatarUrl = profile?.avatar_url ?? null;

  return (
    <AdminNotificationsProvider
      userId={user.id}
      businessId={businessId ?? undefined}
      initialNotifications={notifications}
    >
      <div id="admin-app-shell" className="admin-app-shell admin-theme booking-theme flex min-h-dvh w-full flex-col lg:flex-row">
        {business ? <BusinessBrandTheme business={business} /> : null}
        <AdminSidebar
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          businessName={business?.name}
          businessLogoUrl={business?.logo_url}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AdminMobileHeader
            displayName={userName}
            logoUrl={business?.logo_url}
            businessName={business?.name}
            businessId={business?.id}
            profileHref={business ? `/dashboard/${business.id}/profile` : "/dashboard/profile"}
          />
          <AdminTopbar
            userId={user.id}
            notifications={notifications}
            businessId={businessId ?? undefined}
          />
          <main className="min-h-0 flex-1 overflow-auto px-4 py-4 booking-main-pad sm:px-6 lg:px-8 lg:py-8">
            <div className="w-full">{children}</div>
          </main>
        </div>
        <AdminBottomNav />
        <AdminInstallAppBanner />
      </div>
    </AdminNotificationsProvider>
  );
}
