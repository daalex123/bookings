import { NextResponse } from "next/server";
import { mapCustomerAppointment } from "@/lib/customer-appointments-client";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, created_at, status, notes,
      businesses ( name, slug ),
      services ( name )
    `
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const appointments: CustomerAppointmentItem[] = (data ?? []).map((appt) =>
    mapCustomerAppointment(appt)
  );

  return NextResponse.json(
    { appointments },
    { headers: { "Cache-Control": "no-store" } }
  );
}
