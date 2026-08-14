import { cancelMyAppointment } from "@/lib/actions";
import { getActiveBusinessContext } from "@/lib/business-context";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { getCurrentUser, userCanAccessBusiness } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { MyAppointmentsList } from "@/components/booking/my-appointments-list";
import { StaffAppointmentsView } from "@/components/booking/staff-appointments-view";
import { mapCustomerAppointment } from "@/lib/customer-appointments-client";
import { getUserNotifications, CUSTOMER_NOTIFICATION_AUDIENCE } from "@/lib/notifications/queries";
import { normalizeStoreAppointments } from "@/lib/store-appointments";

export default async function MyAppointmentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const activeBusiness = await getActiveBusinessContext();
  const isBooking = Boolean(activeBusiness);

  const isStoreStaff =
    activeBusiness != null &&
    (await userCanAccessBusiness(user.id, activeBusiness.businessId));

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, created_at, status, notes, business_id,
      businesses ( name, slug ),
      services ( name ),
      appointment_addons ( services ( name ) ),
      jobs ( status, job_number, next_service_visible, next_service_name, next_service_due_on, next_service_notes, invoices ( status, invoice_number ) )
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

  const storeAppointmentsPromise = isStoreStaff
    ? supabase
      .from("appointments")
      .select(
        `id, start_at, end_at, created_at, status, notes, custom_fields, service_id,
           services ( name ),
           profiles ( full_name, phone ),
           appointment_addons ( services ( name ) )`
      )
      .eq("business_id", activeBusiness!.businessId)
      .order("start_at", { ascending: true })
    : Promise.resolve({ data: null });

  const businessTimezonePromise = isStoreStaff
    ? supabase
      .from("businesses")
      .select("timezone")
      .eq("id", activeBusiness!.businessId)
      .single()
    : Promise.resolve({ data: null });

  const [
    { data: appointments },
    notifications,
    { data: storeAppointments },
    { data: business },
  ] = await Promise.all([
    appointmentsQuery,
    getUserNotifications(user.id, {
      businessId: activeBusiness?.businessId,
      audience: CUSTOMER_NOTIFICATION_AUDIENCE,
    }),
    storeAppointmentsPromise,
    businessTimezonePromise,
  ]);

  const personalAppointments = (appointments ?? []).map((appt) =>
    mapCustomerAppointment(appt)
  );

  async function cancelAppointment(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (!id) return { error: "Missing appointment id" };
    return cancelMyAppointment(id);
  }

  if (isStoreStaff && activeBusiness) {
    const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
    const storeRows = normalizeStoreAppointments(storeAppointments, timezone);

    return (
      <StaffAppointmentsView
        userId={user.id}
        businessId={activeBusiness.businessId}
        businessName={activeBusiness.businessName}
        timezone={timezone}
        storeAppointments={storeRows}
        personalAppointments={personalAppointments}
        cancelAction={cancelAppointment}
        notifications={notifications}
      />
    );
  }

  return (
    <MyAppointmentsList
      userId={user.id}
      initialAppointments={personalAppointments}
      isBooking={isBooking}
      businessId={activeBusiness?.businessId}
      cancelAction={cancelAppointment}
      notifications={notifications}
    />
  );
}
