import { updateProfile } from "@/lib/actions";
import { ProfileForm } from "@/components/account/profile-form";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusinessPath } from "@/lib/business-context";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const activeBusiness = await getActiveBusinessPath();
  const isBooking = Boolean(activeBusiness);

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
    <div className={cn("w-full max-w-md lg:max-w-lg", isBooking ? "px-5 pt-6" : "mx-auto")}>
      <div className="mb-6">
        <h1
          className={cn(
            "text-2xl font-bold",
            isBooking ? "text-white" : "text-zinc-900"
          )}
        >
          Profile
        </h1>
        <p className={isBooking ? "text-booking-muted" : "text-zinc-600"}>
          Update your photo and account details
        </p>
      </div>

      <div
        className={cn(
          "rounded-3xl p-6",
          isBooking ? "booking-glass-card" : "border border-zinc-200 bg-white shadow-sm"
        )}
      >
        <ProfileForm
          action={saveProfile}
          variant={isBooking ? "booking" : "dashboard"}
          defaultName={profile?.full_name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          defaultDateOfBirth={profile?.date_of_birth ?? ""}
          defaultAvatarUrl={profile?.avatar_url ?? ""}
          email={user?.email ?? ""}
        />
      </div>
    </div>
  );
}
