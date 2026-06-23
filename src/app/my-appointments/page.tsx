import { cancelMyAppointment } from "@/lib/actions";
import { getActiveBusinessPath } from "@/lib/business-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { MyAppointmentsList } from "@/components/booking/my-appointments-list";
import { mapCustomerAppointment } from "@/lib/customer-appointments-client";
import { getUserNotifications } from "@/lib/notifications/queries";

export default async function MyAppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const activeBusiness = await getActiveBusinessPath();
  const isBooking = Boolean(activeBusiness);

  const [{ data: appointments }, notifications] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `
      id, start_at, end_at, created_at, status, notes,
      businesses ( name, slug ),
      services ( name ),
      appointment_addons ( services ( name ) )
    `
      )
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    getUserNotifications(user.id),
  ]);

  const initialAppointments = (appointments ?? []).map((appt) =>
    mapCustomerAppointment(appt)
  );

  async function cancelAppointment(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (!id) return { error: "Missing appointment id" };
    return cancelMyAppointment(id);
  }

  return (
    <MyAppointmentsList
      userId={user.id}
      initialAppointments={initialAppointments}
      isBooking={isBooking}
      cancelAction={cancelAppointment}
      notifications={notifications}
    />
  );
}
