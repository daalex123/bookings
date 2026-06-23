import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { BookingShell } from "@/components/booking/booking-shell";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "BookNow — Appointment Booking",
  description: "Book appointments with local businesses",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BookNow",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isBooking = headersList.get("x-booking-route") === "1";
  const isDashboard = headersList.get("x-dashboard-route") === "1";

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-dvh antialiased",
          isBooking && "bg-booking-bg text-white"
        )}
      >
        {isBooking ? (
          <BookingShell>{children}</BookingShell>
        ) : isDashboard ? (
          children
        ) : (
          <>
            <SiteHeader />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </>
        )}
        <Toaster />
      </body>
    </html>
  );
}
