import Link from "next/link";
import { notFound } from "next/navigation";
import { signIn } from "@/lib/actions";
import { getPublicBusiness } from "@/lib/booking-data";
import { businessAuthPath } from "@/lib/business-context";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";
import {
  BookingFormField,
  bookingFormCardClass,
} from "@/components/booking/booking-form-field";
import { cn } from "@/lib/utils";

export async function BusinessLoginView({
  bookingRef,
  basePath,
  searchParams,
}: {
  bookingRef: string;
  basePath: string;
  searchParams: {
    redirect?: string;
    registered?: string;
    confirmEmail?: string;
    error?: string;
  };
}) {
  const ctx = await getPublicBusiness(bookingRef);
  if (!ctx) notFound();

  const { business } = ctx;
  const redirectTo = searchParams.redirect || basePath;
  const registerHref = `${businessAuthPath(basePath, "register")}?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <>
      <BusinessBrandTheme business={business} />
      <div className="px-5 pt-6 pb-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-booking-accent">{business.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-white/60">
            Access your appointments at this business
          </p>
        </div>

        <div className={bookingFormCardClass}>
          {searchParams.error && (
            <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/15 p-3 text-sm text-red-200">
              {searchParams.error}
            </p>
          )}
          {searchParams.confirmEmail && (
            <p className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/15 p-3 text-sm text-amber-100">
              Check your email to confirm your account, then sign in here.
            </p>
          )}
          {searchParams.registered && !searchParams.error && (
            <p className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/15 p-3 text-sm text-emerald-100">
              Account created. Please sign in.
            </p>
          )}

          <form action={signIn} className="space-y-5">
            <input type="hidden" name="redirect" value={redirectTo} />
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
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
            <button
              type="submit"
              className={cn(
                "w-full min-h-[48px] rounded-2xl py-3.5 text-sm font-semibold",
                "bg-booking-accent text-booking-accent-fg"
              )}
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/60">
            No account?{" "}
            <Link href={registerHref} className="font-medium text-booking-accent underline">
              Register
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
