import { cancelMyAppointment } from "@/lib/actions";
import { getActiveBusinessContext } from "@/lib/business-context";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { MyAppointmentsList } from "@/components/booking/my-appointments-list";
import { mapCustomerAppointment } from "@/lib/customer-appointments-client";
import { getUserNotifications } from "@/lib/notifications/queries";

export default async function MyAppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const activeBusiness = await getActiveBusinessContext();
  const isBooking = Boolean(activeBusiness);

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, created_at, status, notes, business_id,
      businesses ( name, slug ),
      services ( name ),
      appointment_addons ( services ( name ) )
    `
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (activeBusiness) {
    appointmentsQuery = appointmentsQuery.eq(
      "business_id",
      activeBusiness.businessId
    );
  }

  const [{ data: appointments }, notifications] = await Promise.all([
    appointmentsQuery,
    getUserNotifications(user.id, {
      businessId: activeBusiness?.businessId,
      customerOnly: Boolean(activeBusiness),
    }),
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
      businessId={activeBusiness?.businessId}
      cancelAction={cancelAppointment}
      notifications={notifications}
    />
  );
}
