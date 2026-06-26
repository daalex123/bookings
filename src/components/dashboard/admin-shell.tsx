import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminBottomNav } from "@/components/dashboard/admin-bottom-nav";
import { AdminMobileHeader } from "@/components/dashboard/admin-mobile-header";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { AdminTopbar } from "@/components/dashboard/admin-topbar";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";
import { AdminInstallAppBanner } from "@/components/pwa/admin-install-app-banner";
import { getUserNotifications } from "@/lib/notifications/queries";
import { getCurrentUser, getProfileName } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

function businessIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const businessId = businessIdFromPath(pathname);

  const supabase = await createClient();

  const [fullName, notifications, businessResult] = await Promise.all([
    getProfileName(user.id),
    getUserNotifications(user.id, {
      businessId: businessId ?? undefined,
    }),
    businessId
      ? supabase
          .from("businesses")
          .select("id, name, logo_url, brand_color")
          .eq("id", businessId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const business = businessResult.data;
  const userName = fullName || user.email?.split("@")[0] || "User";
  const userEmail = user.email ?? "";

  return (
    <div className="admin-app-shell booking-theme min-h-dvh lg:flex">
      {business ? <BusinessBrandTheme business={business} /> : null}
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader
          displayName={userName}
          logoUrl={business?.logo_url}
          businessName={business?.name}
          businessId={business?.id}
          userId={user.id}
          notifications={notifications}
        />
        <AdminTopbar userId={user.id} notifications={notifications} />
        <main className="flex-1 overflow-auto px-5 py-4 booking-main-pad lg:px-8 lg:py-6 lg:pb-6">
          <div className="mx-auto max-w-lg lg:max-w-6xl">{children}</div>
        </main>
      </div>
      <AdminBottomNav />
      <AdminInstallAppBanner />
    </div>
  );
}
