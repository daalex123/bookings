import { updateProfile } from "@/lib/actions";
import { ProfileForm } from "@/components/account/profile-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function DashboardProfileSettings() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;

  async function saveProfile(formData: FormData) {
    "use server";
    return updateProfile(formData);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your photo, name, and contact details"
      />
      <div className="admin-card max-w-lg p-6">
        <ProfileForm
          action={saveProfile}
          variant="dashboard"
          defaultName={profile?.full_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          defaultDateOfBirth={profile?.date_of_birth ?? ""}
          defaultAvatarUrl={profile?.avatar_url ?? ""}
          email={user.email ?? ""}
        />
      </div>
    </div>
  );
}
