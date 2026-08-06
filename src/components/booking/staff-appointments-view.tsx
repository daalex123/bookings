"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppointmentsCalendar } from "@/components/dashboard/appointments-calendar";
import { MyAppointmentsList } from "@/components/booking/my-appointments-list";
import { useBusinessAppointments } from "@/hooks/use-business-appointments";
import type { ActionResult } from "@/lib/action-result";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import type { StoreAppointmentRow } from "@/lib/store-appointments";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";

type Tab = "store" | "mine";

export function StaffAppointmentsView({
  userId,
  businessId,
  businessName,
  timezone,
  storeAppointments: initialStoreAppointments,
  personalAppointments,
  cancelAction,
  notifications,
}: {
  userId: string;
  businessId: string;
  businessName: string;
  timezone: string;
  storeAppointments: StoreAppointmentRow[];
  personalAppointments: CustomerAppointmentItem[];
  cancelAction: (formData: FormData) => Promise<ActionResult>;
  notifications: Notification[];
}) {
  const { appointments: storeAppointments } = useBusinessAppointments(
    businessId,
    timezone,
    initialStoreAppointments
  );
  const [tab, setTab] = useState<Tab>("store");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();

  const openAppointment = (id: string) => {
    setActiveId(id);
    router.push(`/dashboard/${businessId}/appointments?id=${id}`);
  };

  return (
    <div className="space-y-6 px-5 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Bookings</h1>
          <p className="text-booking-muted">
            {businessName} · store schedule & your visits
          </p>
        </div>
        <Link
          href={`/dashboard/${businessId}/appointments`}
          className="shrink-0 rounded-full booking-glass-pill px-3 py-1.5 text-xs font-medium text-booking-muted hover:text-white"
        >
          Manage
        </Link>
      </div>

      <div className="flex rounded-full booking-glass-pill p-1">
        <button
          type="button"
          onClick={() => setTab("store")}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === "store"
              ? "bg-booking-accent text-booking-accent-fg"
              : "text-booking-muted hover:text-white"
          )}
        >
          Store calendar
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={cn(
            "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            tab === "mine"
              ? "bg-booking-accent text-booking-accent-fg"
              : "text-booking-muted hover:text-white"
          )}
        >
          My bookings
        </button>
      </div>

      {tab === "store" ? (
        <div className="pb-2">
          {storeAppointments.length === 0 ? (
            <div className="rounded-3xl booking-glass-card px-5 py-10 text-center text-sm text-booking-muted">
              No store appointments yet.
            </div>
          ) : (
            <AppointmentsCalendar
              variant="booking"
              fullBleed
              appointments={storeAppointments}
              timezone={timezone}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onSelectAppointment={openAppointment}
              highlightAppointmentId={activeId ?? undefined}
              focusDate={selectedDate}
              manageHref={(id) =>
                `/dashboard/${businessId}/appointments?id=${id}`
              }
            />
          )}
        </div>
      ) : (
        <MyAppointmentsList
          userId={userId}
          initialAppointments={personalAppointments}
          isBooking
          businessId={businessId}
          cancelAction={cancelAction}
          notifications={notifications}
          embedded
        />
      )}
    </div>
  );
}
