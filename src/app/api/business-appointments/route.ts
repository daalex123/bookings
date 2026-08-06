import { NextResponse } from "next/server";
import { fetchBusinessAppointments } from "@/lib/business-appointments-client";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { userCanAccessBusiness } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const allowed = await userCanAccessBusiness(user.id, businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("id", businessId)
    .maybeSingle();

  const timezone = business?.timezone ?? DEFAULT_TIMEZONE;
  const appointments = await fetchBusinessAppointments(
    supabase,
    businessId,
    timezone
  );

  return NextResponse.json(
    { appointments },
    { headers: { "Cache-Control": "no-store" } }
  );
}
