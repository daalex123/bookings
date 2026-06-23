import { getActiveBusinessPath } from "@/lib/business-context";
import { BookingBottomNav } from "@/components/booking/booking-bottom-nav";

export async function BookingShell({ children }: { children: React.ReactNode }) {
  const homePath = (await getActiveBusinessPath()) ?? "/";

  return (
    <div className="booking-theme min-h-dvh">
      <div className="mx-auto min-h-dvh max-w-lg booking-main-pad">
        {children}
      </div>
      <BookingBottomNav homePath={homePath} />
    </div>
  );
}
