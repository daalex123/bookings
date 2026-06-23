import { getActiveBusinessPath } from "@/lib/business-context";
import { BookingBottomNav } from "@/components/booking/booking-bottom-nav";

export async function BookingShell({ children }: { children: React.ReactNode }) {
  const homePath = (await getActiveBusinessPath()) ?? "/";

  return (
    <div className="booking-theme min-h-screen">
      <div className="mx-auto min-h-screen max-w-lg pb-24">{children}</div>
      <BookingBottomNav homePath={homePath} />
    </div>
  );
}
