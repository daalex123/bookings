import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { BookingShell } from "@/components/booking/booking-shell";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import {
  PWA_DESCRIPTION,
  PWA_NAME,
  PWA_THEME_COLOR,
} from "@/lib/pwa/constants";
import { cn } from "@/lib/utils";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: PWA_THEME_COLOR,
};

export const metadata: Metadata = {
  title: `${PWA_NAME} — Appointment Booking`,
  description: PWA_DESCRIPTION,
  applicationName: PWA_NAME,
  manifest: "/manifest.webmanifest",
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: PWA_NAME,
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
