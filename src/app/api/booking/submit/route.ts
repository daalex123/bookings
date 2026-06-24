import { after } from "next/server";
import { NextResponse } from "next/server";
import { createAppointment } from "@/lib/actions";
import { sendBookingNotifications } from "@/lib/notifications/send-booking-notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const bookingRef = formData.get("bookingRef")?.toString();
  const flowPath = formData.get("flowPath")?.toString();

  if (!bookingRef || !flowPath) {
    return NextResponse.json({ error: "Invalid booking request" }, { status: 400 });
  }

  const result = await createAppointment(bookingRef, formData, {
    skipNotifications: true,
  });

  if (result?.error) {
    const url = new URL(flowPath, request.url);
    url.searchParams.set(
      "error",
      typeof result.error === "string" ? result.error : "Booking failed"
    );
    const serviceId = formData.get("serviceId")?.toString();
    const date = formData.get("date")?.toString();
    const time = formData.get("time")?.toString();
    if (serviceId) url.searchParams.set("service", serviceId);
    if (date) url.searchParams.set("date", date);
    if (time) url.searchParams.set("time", time);
    return NextResponse.redirect(url, 303);
  }

  const appointmentId = result.appointmentId;
  if (appointmentId) {
    after(async () => {
      try {
        await sendBookingNotifications(appointmentId);
      } catch (err) {
        console.error("[notifications] Failed after booking redirect", err);
      }
    });
  }

  const successUrl = new URL(flowPath, request.url);
  successUrl.searchParams.set("success", "1");
  return NextResponse.redirect(successUrl, 303);
}
