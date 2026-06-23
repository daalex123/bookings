import Link from "next/link";
import { notFound } from "next/navigation";
import { signUp } from "@/lib/actions";
import { getPublicBusiness } from "@/lib/booking-data";
import { businessAuthPath } from "@/lib/business-context";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";
import {
  BookingFormField,
  bookingFormCardClass,
} from "@/components/booking/booking-form-field";
import { cn } from "@/lib/utils";

export async function BusinessRegisterView({
  bookingRef,
  basePath,
  searchParams,
}: {
  bookingRef: string;
  basePath: string;
  searchParams: { error?: string; redirect?: string };
}) {
  const ctx = await getPublicBusiness(bookingRef);
  if (!ctx) notFound();

  const { business } = ctx;
  const redirectTo = searchParams.redirect || basePath;
  const loginHref = `${businessAuthPath(basePath, "login")}?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <>
      <BusinessBrandTheme business={business} />
      <div className="px-5 pt-6 pb-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-booking-accent">{business.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Create account</h1>
          <p className="mt-1 text-sm text-white/60">
            Register to book appointments at this business
          </p>
        </div>

        <div className={bookingFormCardClass}>
          {searchParams.error && (
            <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/15 p-3 text-sm text-red-200">
              {searchParams.error}
            </p>
          )}

          <form action={signUp} className="space-y-5">
            <input type="hidden" name="redirect" value={redirectTo} />
            <BookingFormField
              label="Full name"
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder="Your full name"
              required
            />
            <BookingFormField
              label="Mobile number"
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+94 77 123 4567"
              required
            />
            <BookingFormField
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <BookingFormField
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            <button
              type="submit"
              className={cn(
                "w-full min-h-[48px] rounded-2xl py-3.5 text-sm font-semibold",
                "bg-booking-accent text-booking-accent-fg"
              )}
            >
              Register
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href={loginHref} className="font-medium text-booking-accent underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center">
          <Link href={basePath} className="text-sm text-white/50 underline">
            Back to {business.name}
          </Link>
        </p>
      </div>
    </>
  );
}
