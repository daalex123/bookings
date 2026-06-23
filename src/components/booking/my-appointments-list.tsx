"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { bookingPagePathBySlug } from "@/lib/booking";
import { useMyAppointments } from "@/hooks/use-my-appointments";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import type { Notification } from "@/types/database";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  completed: "bg-white/10 text-booking-muted",
  no_show: "bg-red-500/20 text-red-400",
};

export function MyAppointmentsList({
  userId,
  initialAppointments,
  isBooking,
  cancelAction,
  notifications = [],
}: {
  userId: string;
  initialAppointments: CustomerAppointmentItem[];
  isBooking: boolean;
  cancelAction: (formData: FormData) => Promise<ActionResult>;
  notifications?: Notification[];
}) {
  const { appointments } = useMyAppointments(userId, initialAppointments);

  return (
    <div className={cn("space-y-6", isBooking ? "px-5 pt-6" : "")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className={cn(
              "text-3xl font-bold",
              isBooking ? "text-white" : "text-zinc-900"
            )}
          >
            My appointments
          </h1>
          <p className={isBooking ? "text-booking-muted" : "text-zinc-600"}>
            View and manage your bookings
          </p>
        </div>
        <NotificationBell
          userId={userId}
          initialNotifications={notifications}
          variant={isBooking ? "booking" : "admin"}
        />
      </div>

      {appointments.length > 0 ? (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isBooking={isBooking}
              cancelAction={cancelAction}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-3xl py-12 text-center",
            isBooking
              ? "bg-booking-elevated text-booking-muted"
              : "border bg-white text-zinc-500"
          )}
        >
          No appointments yet. Book using a link shared by a business.
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appt,
  isBooking,
  cancelAction,
}: {
  appt: CustomerAppointmentItem;
  isBooking: boolean;
  cancelAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const { wrapFormAction } = useActionToast();
  const wrappedCancel = useMemo(
    () =>
      wrapFormAction(cancelAction, {
        loading: "Cancelling appointment…",
        success: "Appointment cancelled",
        error: "Could not cancel appointment",
      }),
    [cancelAction, wrapFormAction]
  );

  return (
    <article
      className={cn(
        "rounded-3xl p-5",
        isBooking
          ? "bg-booking-elevated"
          : "border border-zinc-200 bg-white shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{appt.service_name}</h2>
          <p
            className={cn(
              "mt-1 text-sm",
              isBooking ? "text-booking-muted" : "text-zinc-500"
            )}
          >
            {appt.business_name} · {format(new Date(appt.start_at), "PPP p")}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize",
            statusStyles[appt.status] ?? "bg-white/10 text-booking-muted"
          )}
        >
          {appt.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        {appt.business_slug && (
          <Link
            href={bookingPagePathBySlug(appt.business_slug)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium",
              isBooking
                ? "bg-booking-accent text-booking-accent-fg"
                : "border border-zinc-300"
            )}
          >
            Book again
          </Link>
        )}
        {appt.status !== "cancelled" &&
          appt.status !== "completed" &&
          new Date(appt.start_at) > new Date() && (
            <form action={wrappedCancel}>
              <input type="hidden" name="id" value={appt.id} />
              <SubmitButton
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium",
                  isBooking
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
                pendingLabel="Cancelling…"
              >
                Cancel
              </SubmitButton>
            </form>
          )}
      </div>
    </article>
  );
}
