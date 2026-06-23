import { getActiveBusinessPath } from "@/lib/business-context";
import { getPublicBusiness } from "@/lib/booking-data";
import { BookingBottomNav } from "@/components/booking/booking-bottom-nav";
import { BusinessBrandTheme } from "@/components/booking/business-brand-theme";

function bookingRefFromPath(path: string): string | null {
  const slugMatch = path.match(/^\/b\/([^/]+)/);
  if (slugMatch) return slugMatch[1];
  const tokenMatch = path.match(/^\/book\/([^/]+)/);
  if (tokenMatch) return tokenMatch[1];
  return null;
}

export async function BookingShell({ children }: { children: React.ReactNode }) {
  const homePath = (await getActiveBusinessPath()) ?? "/";
  const bookingRef = bookingRefFromPath(homePath);
  const ctx = bookingRef ? await getPublicBusiness(bookingRef) : null;

  return (
    <div className="booking-theme min-h-dvh">
      {ctx?.business && <BusinessBrandTheme business={ctx.business} />}
      <div className="mx-auto min-h-dvh max-w-lg booking-main-pad">
        {children}
      </div>
      <BookingBottomNav homePath={homePath} />
    </div>
  );
}
