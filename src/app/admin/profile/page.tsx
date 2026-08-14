import { updateProfile } from "@/lib/actions";
import { ProfileForm } from "@/components/account/profile-form";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database";

export default async function AdminProfilePage() {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Profile
        </h1>
        <p className="mt-2 text-zinc-400">
          Update your photo and account details
        </p>
      </div>

      <Card className="max-w-lg border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-zinc-100">Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            action={saveProfile}
            variant="platform"
            defaultName={profile?.full_name ?? ""}
            defaultPhone={profile?.phone ?? ""}
            defaultDateOfBirth={profile?.date_of_birth ?? ""}
            defaultAvatarUrl={profile?.avatar_url ?? ""}
            email={user.email ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
