import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { BookingShell } from "@/components/booking/booking-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookNow — Appointment Booking",
  description: "Book appointments with local businesses",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
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
