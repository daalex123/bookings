import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/dashboard/admin-sidebar";
import { AdminTopbar } from "@/components/dashboard/admin-topbar";
import { getUserNotifications } from "@/lib/notifications/queries";
import { getCurrentUser, getProfileName } from "@/lib/supabase/auth";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [fullName, notifications] = await Promise.all([
    getProfileName(user.id),
    getUserNotifications(user.id),
  ]);

  const userName = fullName || user.email?.split("@")[0] || "User";
  const userEmail = user.email ?? "";

  return (
    <div className="admin-theme flex min-h-screen">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar userId={user.id} notifications={notifications} />
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
