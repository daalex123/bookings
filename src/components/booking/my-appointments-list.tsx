"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { bookingPagePathBySlug } from "@/lib/booking";
import { useMyAppointments } from "@/hooks/use-my-appointments";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import {
  isHistoryAppointment,
  isUpcomingAppointment,
  type CustomerAppointmentItem,
} from "@/lib/customer-appointments";
import type { Notification } from "@/types/database";

const statusStyles: Record<string, { booking: string; light: string }> = {
  pending: {
    booking: "bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30",
    light: "bg-amber-100 text-amber-800",
  },
  confirmed: {
    booking: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/30",
    light: "bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    booking: "bg-red-400/20 text-red-200 ring-1 ring-red-300/30",
    light: "bg-red-100 text-red-800",
  },
  completed: {
    booking: "bg-white/15 text-white ring-1 ring-white/20",
    light: "bg-zinc-100 text-zinc-800",
  },
  no_show: {
    booking: "bg-red-400/20 text-red-200 ring-1 ring-red-300/30",
    light: "bg-red-100 text-red-800",
  },
};

type Tab = "upcoming" | "history";

export function MyAppointmentsList({
  userId,
  initialAppointments,
  isBooking,
  businessId,
  cancelAction,
  notifications = [],
  embedded = false,
}: {
  userId: string;
  initialAppointments: CustomerAppointmentItem[];
  isBooking: boolean;
  businessId?: string;
  cancelAction: (formData: FormData) => Promise<ActionResult>;
  notifications?: Notification[];
  embedded?: boolean;
}) {
  const { appointments } = useMyAppointments(
    userId,
    initialAppointments,
    businessId
  );
  const searchParams = useSearchParams();
  const highlightAppointmentId = searchParams.get("id") ?? undefined;
  const initialTab =
    (searchParams.get("tab") as Tab | null) === "history" ? "history" : "upcoming";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!highlightAppointmentId) return;
    const el = document.getElementById(`appointment-${highlightAppointmentId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightAppointmentId]);

  const upcoming = useMemo(
    () => appointments.filter(isUpcomingAppointment),
    [appointments]
  );
  const history = useMemo(
    () => appointments.filter(isHistoryAppointment),
    [appointments]
  );
  const visible = tab === "upcoming" ? upcoming : history;
  const recommended = useMemo(() => {
    return appointments
      .filter((appt) => appt.next_service_name)
      .sort((a, b) => {
        const aDue = a.next_service_due_on ?? "";
        const bDue = b.next_service_due_on ?? "";
        return aDue.localeCompare(bDue);
      })[0];
  }, [appointments]);

  return (
    <div className={cn("space-y-6", isBooking && !embedded ? "px-5 pt-6" : "")}>
      {!embedded && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className={cn(
                "text-3xl font-bold tracking-tight",
                isBooking ? "text-white" : "text-zinc-900"
              )}
            >
              My appointments
            </h1>
            <p
              className={cn(
                "mt-1 text-sm",
                isBooking ? "text-white/65" : "text-zinc-600"
              )}
            >
              Upcoming bookings and full visit history
            </p>
          </div>
          {!isBooking ? (
            <NotificationBell
              userId={userId}
              initialNotifications={notifications}
              variant="booking"
              businessId={businessId}
            />
          ) : null}
        </div>
      )}

      {recommended?.next_service_name && (
        <div
          className={cn(
            "rounded-3xl px-5 py-4",
            isBooking
              ? "booking-glass-card"
              : "border border-emerald-200 bg-emerald-50"
          )}
        >
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              isBooking ? "text-white/45" : "text-emerald-800/70"
            )}
          >
            Recommended next service
          </p>
          <p
            className={cn(
              "mt-1 text-base font-semibold",
              isBooking ? "text-white" : "text-emerald-950"
            )}
          >
            {recommended.next_service_name}
            {recommended.next_service_due_on
              ? ` · due ${format(new Date(`${recommended.next_service_due_on}T00:00:00`), "PPP")}`
              : ""}
          </p>
          {recommended.next_service_notes && (
            <p
              className={cn(
                "mt-1 text-sm",
                isBooking ? "text-white/70" : "text-emerald-900/80"
              )}
            >
              {recommended.next_service_notes}
            </p>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-2 gap-1 rounded-2xl p-1",
          isBooking ? "booking-glass-card" : "border border-zinc-200 bg-zinc-100"
        )}
      >
        {(
          [
            { id: "upcoming", label: "Upcoming", count: upcoming.length },
            { id: "history", label: "History", count: history.length },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              tab === item.id
                ? isBooking
                  ? "bg-booking-accent text-booking-accent-fg shadow-sm"
                  : "bg-white text-zinc-900 shadow-sm"
                : isBooking
                  ? "text-white/70 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            {item.label}
            <span
              className={cn(
                "ml-1.5 tabular-nums",
                tab === item.id
                  ? isBooking
                    ? "text-booking-accent-fg/70"
                    : "text-zinc-500"
                  : isBooking
                    ? "text-white/45"
                    : "text-zinc-400"
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {visible.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isBooking={isBooking}
              cancelAction={cancelAction}
              highlighted={appt.id === highlightAppointmentId}
              showHistoryHints={tab === "history"}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-3xl px-5 py-14 text-center",
            isBooking
              ? "booking-glass-card text-white/60"
              : "border border-zinc-200 bg-white text-zinc-500"
          )}
        >
          <p className="text-base font-medium">
            {tab === "upcoming"
              ? "No upcoming appointments"
              : "No history yet"}
          </p>
          <p className="mt-1 text-sm opacity-80">
            {tab === "upcoming"
              ? "Your next bookings will show up here."
              : "Past visits, jobs, and invoices will appear after your first appointment."}
          </p>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appt,
  isBooking,
  cancelAction,
  highlighted = false,
  showHistoryHints = false,
}: {
  appt: CustomerAppointmentItem;
  isBooking: boolean;
  cancelAction: (formData: FormData) => Promise<ActionResult>;
  highlighted?: boolean;
  showHistoryHints?: boolean;
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

  const statusStyle = statusStyles[appt.status] ?? {
    booking: "bg-white/15 text-white ring-1 ring-white/20",
    light: "bg-zinc-100 text-zinc-800",
  };

  return (
    <article
      id={`appointment-${appt.id}`}
      className={cn(
        "rounded-3xl p-5 transition-shadow",
        isBooking
          ? "booking-glass-card"
          : "border border-zinc-200 bg-white shadow-sm",
        highlighted &&
          (isBooking ? "ring-2 ring-booking-accent" : "ring-2 ring-zinc-900")
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight",
              isBooking ? "text-white" : "text-zinc-900"
            )}
          >
            {appt.service_name}
          </h2>
          {appt.addon_names.length > 0 && (
            <p
              className={cn(
                "mt-1 text-sm",
                isBooking ? "text-white/60" : "text-zinc-500"
              )}
            >
              + {appt.addon_names.join(", ")}
            </p>
          )}
          <p
            className={cn(
              "mt-2 text-sm",
              isBooking ? "text-white/75" : "text-zinc-600"
            )}
          >
            <span className="font-medium">{appt.business_name}</span>
            <span className={isBooking ? "text-white/40" : "text-zinc-300"}>
              {" · "}
            </span>
            {format(new Date(appt.start_at), "PPP · p")}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize",
            isBooking ? statusStyle.booking : statusStyle.light
          )}
        >
          {appt.status.replace("_", " ")}
        </span>
      </div>

      {showHistoryHints && (appt.job_status || appt.invoice_status) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {appt.job_status && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                isBooking
                  ? "bg-white/10 text-white/85 ring-1 ring-white/15"
                  : "bg-zinc-100 text-zinc-700"
              )}
            >
              Job · {appt.job_status.replace("_", " ")}
            </span>
          )}
          {appt.invoice_status && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                isBooking
                  ? "bg-booking-accent/20 text-booking-accent ring-1 ring-booking-accent/30"
                  : "bg-amber-50 text-amber-800"
              )}
            >
              Invoice · {appt.invoice_number ?? appt.invoice_status}
            </span>
          )}
          {appt.job_number && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                isBooking
                  ? "bg-white/10 text-white/85 ring-1 ring-white/15"
                  : "bg-zinc-100 text-zinc-700"
              )}
            >
              {appt.job_number}
            </span>
          )}
        </div>
      )}

      {showHistoryHints && appt.next_service_name && (
        <div
          className={cn(
            "mt-4 rounded-2xl px-4 py-3 text-sm",
            isBooking
              ? "bg-white/10 text-white/90 ring-1 ring-white/10"
              : "bg-emerald-50 text-emerald-900"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Next service
          </p>
          <p className="mt-1 font-medium">{appt.next_service_name}</p>
          {appt.next_service_due_on && (
            <p className="mt-0.5 text-xs opacity-80">
              Due {format(new Date(appt.next_service_due_on), "PPP")}
            </p>
          )}
          {appt.next_service_notes && (
            <p className="mt-1 text-sm opacity-80">{appt.next_service_notes}</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/my-appointments/${appt.id}`}
          className="rounded-xl bg-booking-accent px-4 py-2.5 text-sm font-semibold text-booking-accent-fg transition-colors hover:brightness-105"
        >
          View details
        </Link>
        {appt.business_slug && (
          <Link
            href={bookingPagePathBySlug(appt.business_slug)}
            className="rounded-xl bg-booking-accent px-4 py-2.5 text-sm font-semibold text-booking-accent-fg transition-colors hover:brightness-105"
          >
            Book again
          </Link>
        )}
        {appt.status !== "cancelled" &&
          appt.status !== "completed" &&
          new Date(appt.start_at) > new Date() && (
            <form action={wrappedCancel}>
              <FormPendingOverlay message="Cancelling appointment…" />
              <input type="hidden" name="id" value={appt.id} />
              <SubmitButton
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-semibold",
                  isBooking
                    ? "bg-red-500/25 text-red-200 hover:bg-red-500/35"
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
