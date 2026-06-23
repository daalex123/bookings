import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  dayBoundsInTimezone,
  generateTimeSlots,
  todayInTimezone,
} from "@/lib/availability";
import { getPublicBookedSlots, getPublicBusiness } from "@/lib/booking-data";
import { bookingFlowUrl } from "@/lib/booking";
import { getCurrentUser } from "@/lib/supabase/auth";
import { formatPrice } from "@/lib/utils";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";
import { BookingSuccessSound } from "@/components/booking/booking-success-sound";
import { HorizontalDatePicker } from "@/components/booking/horizontal-date-picker";
import { TimeSlotPicker } from "@/components/booking/time-slot-picker";
import { cn } from "@/lib/utils";

export async function ScheduleWizard({
  bookingRef,
  flowPath,
  backPath,
  searchParams,
}: {
  bookingRef: string;
  flowPath: string;
  backPath: string;
  searchParams: {
    service?: string;
    date?: string;
    success?: string;
    error?: string;
    time?: string;
  };
}) {
  const [user, ctx] = await Promise.all([
    getCurrentUser(),
    getPublicBusiness(bookingRef),
  ]);

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        bookingFlowUrl(backPath, {
          serviceId: searchParams.service,
          date: searchParams.date,
        })
      )}`
    );
  }

  if (!ctx) notFound();

  const { business, services, hours } = ctx;
  const timezone = business.timezone;
  const currency = business.currency;

  const selectedServiceId = searchParams.service || services[0]?.id;
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const dateStr = searchParams.date || todayInTimezone(timezone);
  const preservedTime = searchParams.time ?? "";

  let slots: string[] = [];
  if (selectedService) {
    const { start: dayStart, end: dayEnd } = dayBoundsInTimezone(
      dateStr,
      timezone
    );
    const appointments = await getPublicBookedSlots(
      bookingRef,
      dayStart,
      dayEnd
    );

    slots = generateTimeSlots(
      dateStr,
      selectedService.duration_minutes,
      selectedService.slot_interval_minutes ?? selectedService.duration_minutes,
      hours.map((h) => ({
        ...h,
        id: "",
        business_id: business.id,
        created_at: "",
        updated_at: "",
      })),
      appointments,
      timezone
    );
  }

  if (searchParams.success) {
    return (
      <>
        <BookingSuccessSound />
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-booking-accent/20 text-3xl">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-bold">Booking confirmed!</h1>
        <p className="mt-2 text-booking-muted">
          Your appointment at {business.name} has been requested.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/my-appointments"
            className="rounded-2xl bg-booking-accent py-3.5 text-center font-semibold text-booking-accent-fg"
          >
            View appointments
          </Link>
          <Link
            href={backPath}
            className="rounded-2xl bg-booking-elevated py-3.5 text-center font-medium"
          >
            Back to {business.name}
          </Link>
        </div>
      </div>
      </>
    );
  }

  const heroImage =
    selectedService?.image_url ?? business.cover_image_url ?? null;
  const heroStyle = heroImage
    ? {
        backgroundImage: `linear-gradient(to top, rgba(10,10,10,0.92), rgba(10,10,10,0.25)), url(${heroImage})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  return (
    <>
      <BusinessBrandTheme business={business} />
      <div className="relative min-h-screen">
        <div
          className={cn(
            "pointer-events-none h-56 w-full",
            !heroImage && "booking-hero-gradient"
          )}
          style={heroStyle}
        />

      <div className="relative z-10 -mt-16 rounded-t-[2rem] bg-booking-bg px-5 pt-6 pb-40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {selectedService?.name ?? business.name}
            </h1>
            <p className="mt-1 text-sm text-booking-muted">{business.name}</p>
            {selectedService && (
              <p className="mt-1 text-sm text-booking-muted">
                {formatPrice(selectedService.price, currency)} ·{" "}
                {selectedService.duration_minutes} min
              </p>
            )}
          </div>
          <Link
            href={backPath}
            className="shrink-0 rounded-full bg-booking-elevated px-3 py-1.5 text-xs text-booking-muted"
          >
            Back
          </Link>
        </div>

        {services.length > 1 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`${flowPath}?service=${s.id}&date=${dateStr}`}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  s.id === selectedServiceId
                    ? "bg-booking-accent text-booking-accent-fg"
                    : "bg-booking-elevated text-white"
                )}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {searchParams.error && (
          <p className="mt-4 rounded-2xl bg-red-500/20 px-4 py-3 text-sm text-red-300">
            {searchParams.error}
          </p>
        )}

        {selectedService && (
          <form
            method="POST"
            action="/api/booking/submit"
            className="relative z-10 mt-2"
          >
            <input type="hidden" name="bookingRef" value={bookingRef} />
            <input type="hidden" name="flowPath" value={flowPath} />
            <input type="hidden" name="serviceId" value={selectedService.id} />
            <input type="hidden" name="date" value={dateStr} />

            <HorizontalDatePicker
              flowPath={flowPath}
              serviceId={selectedService.id}
              selectedDate={dateStr}
              timezone={timezone}
            />

            <TimeSlotPicker slots={slots} defaultTime={preservedTime} />

            <div className="mt-6">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-booking-muted"
              >
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any special requests..."
                className="w-full resize-none rounded-2xl border-0 bg-booking-elevated px-4 py-3 text-base text-white placeholder:text-booking-muted focus:outline-none focus:ring-2 focus:ring-booking-accent/50"
              />
            </div>

            <div className="sticky bottom-20 z-30 mt-8 pb-4">
              <button
                type="submit"
                disabled={slots.length === 0}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-booking-accent px-4 py-4 text-base font-semibold text-booking-accent-fg shadow-lg shadow-black/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Book Now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  );
}
