"use client";

import { useMemo, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Search,
  User,
} from "lucide-react";
import {
  AppointmentForm,
  type CustomerOption,
  type ServiceOption,
} from "@/components/dashboard/appointment-form";
import { DeleteAppointmentButton } from "@/components/dashboard/delete-appointment-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusActionForm } from "@/components/dashboard/status-action-form";
import { useActionToast } from "@/hooks/use-action-toast";
import { hasActionError, type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppointmentRow = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  service_id: string;
  service_name: string;
  addon_names: string[];
  customer_name: string;
  customer_phone: string | null;
  customer_label: string;
  date: string;
  time: string;
};

type StatusFilter =
  | "all"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type TimeFilter = "all" | "upcoming" | "today" | "past";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-teal-50 text-teal-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  completed: "bg-[#f0f2f5] text-[#8b92a5]",
  no_show: "bg-red-50 text-red-600",
};

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no_show", label: "No show" },
];

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "Any time" },
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "past", label: "Past" },
];

export function AppointmentsPanel({
  appointments,
  services,
  customers,
  timezone,
  saveAction,
  deleteAction,
  statusAction,
}: {
  appointments: AppointmentRow[];
  services: ServiceOption[];
  customers: CustomerOption[];
  timezone: string;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  statusAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const { wrapFormAction } = useActionToast();

  const handleSave = useMemo(
    () =>
      wrapFormAction(
        async (formData) => {
          const isCreate = !formData.get("id")?.toString();
          const result = await saveAction(formData);
          if (hasActionError(result)) return result;
          return {
            success: true,
            message: isCreate
              ? "Appointment created"
              : "Appointment updated",
          };
        },
        {
          loading: "Saving appointment…",
          success: "Appointment saved",
          error: "Could not save appointment",
        },
        () => {
          setShowAddForm(false);
          setEditingId(null);
        }
      ),
    [saveAction, wrapFormAction]
  );

  const todayCount = appointments.filter(
    (a) =>
      isToday(new Date(a.start_at)) && !["cancelled"].includes(a.status)
  ).length;
  const pendingCount = appointments.filter((a) => a.status === "pending").length;
  const upcomingCount = appointments.filter(
    (a) =>
      !isPast(new Date(a.end_at)) && !["cancelled", "completed"].includes(a.status)
  ).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = appointments.filter((appt) => {
      if (statusFilter !== "all" && appt.status !== statusFilter) return false;

      const start = new Date(appt.start_at);
      const end = new Date(appt.end_at);
      if (timeFilter === "today" && !isToday(start)) return false;
      if (timeFilter === "upcoming" && (isPast(end) || ["cancelled", "completed"].includes(appt.status))) {
        return false;
      }
      if (timeFilter === "past" && !isPast(end)) return false;

      if (!q) return true;
      return (
        appt.customer_name.toLowerCase().includes(q) ||
        appt.service_name.toLowerCase().includes(q) ||
        (appt.customer_phone?.includes(q) ?? false) ||
        (appt.notes?.toLowerCase().includes(q) ?? false)
      );
    });

    return rows.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [appointments, query, statusFilter, timeFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Create, edit, and manage all bookings for this business"
        action={
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setShowAddForm((open) => !open);
              setEditingId(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? "Close" : "New appointment"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={todayCount} icon={CalendarDays} />
        <StatCard label="Pending" value={pendingCount} icon={Clock} />
        <StatCard label="Upcoming" value={upcomingCount} icon={User} />
      </div>

      {showAddForm && (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[#1e2235]/8 px-6 py-5">
            <h2 className="text-lg font-bold text-[#1e2235]">New appointment</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Book on behalf of a customer · times use {timezone}
            </p>
          </div>
          <div className="p-6">
            <AppointmentForm
              action={handleSave}
              services={services}
              customers={customers}
              submitLabel="Create appointment"
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="border-b border-[#1e2235]/8 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1e2235]">All appointments</h2>
              <p className="mt-1 text-sm text-[#8b92a5]">
                {filtered.length} of {appointments.length} shown
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b92a5]" />
              <input
                type="search"
                placeholder="Search customer, service, notes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-[#1e2235]/10 bg-[#f0f2f5]/60 pl-10 pr-4 text-sm text-[#1e2235] placeholder:text-[#8b92a5] focus:border-[#1e2235]/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e2235]/10"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TIME_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeFilter(item.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  timeFilter === item.id
                    ? "bg-[#1e2235] text-white"
                    : "bg-[#f0f2f5] text-[#8b92a5] hover:text-[#1e2235]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === item.id
                    ? "bg-[#1e2235]/10 text-[#1e2235]"
                    : "bg-transparent text-[#8b92a5] hover:text-[#1e2235]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-[#1e2235]/6">
            {filtered.map((appt) => {
              const isEditing = editingId === appt.id;
              const canQuickAction = !["cancelled", "completed"].includes(appt.status);

              return (
                <div key={appt.id} className="px-4 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#1e2235]">
                          {appt.service_name}
                        </h3>
                        {appt.addon_names.length > 0 && (
                          <span className="text-sm text-[#8b92a5]">
                            + {appt.addon_names.join(", ")}
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLE[appt.status] ??
                              "bg-[#f0f2f5] text-[#8b92a5]"
                          )}
                        >
                          {appt.status.replace("_", " ")}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-[#1e2235]">
                        {appt.customer_name}
                        {appt.customer_phone ? ` · ${appt.customer_phone}` : ""}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8b92a5]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {format(new Date(appt.start_at), "PPP · p")}
                        </span>
                        <span>
                          Ends {format(new Date(appt.end_at), "p")}
                        </span>
                      </div>

                      {appt.notes && !isEditing && (
                        <p className="mt-2 line-clamp-2 text-sm text-[#8b92a5]">
                          {appt.notes}
                        </p>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex flex-wrap gap-2 lg:shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setEditingId(appt.id);
                            setShowAddForm(false);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <DeleteAppointmentButton
                          action={deleteAction}
                          appointmentId={appt.id}
                          label={`${appt.customer_name} on ${format(new Date(appt.start_at), "PP")}`}
                        />
                      </div>
                    )}
                  </div>

                  {canQuickAction && !isEditing && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {appt.status === "pending" && (
                        <StatusActionForm
                          action={statusAction}
                          appointmentId={appt.id}
                          status="confirmed"
                        >
                          Confirm
                        </StatusActionForm>
                      )}
                      <StatusActionForm
                        action={statusAction}
                        appointmentId={appt.id}
                        status="completed"
                        buttonProps={{ variant: "outline" }}
                      >
                        Complete
                      </StatusActionForm>
                      <StatusActionForm
                        action={statusAction}
                        appointmentId={appt.id}
                        status="no_show"
                        buttonProps={{ variant: "outline" }}
                      >
                        No show
                      </StatusActionForm>
                      <StatusActionForm
                        action={statusAction}
                        appointmentId={appt.id}
                        status="cancelled"
                        buttonProps={{ variant: "destructive" }}
                      >
                        Cancel
                      </StatusActionForm>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-5 rounded-2xl border border-[#1e2235]/8 bg-[#f0f2f5]/40 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1e2235]">
                          Edit appointment
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 text-sm text-[#8b92a5] hover:text-[#1e2235]"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Collapse
                        </button>
                      </div>
                      <AppointmentForm
                        action={handleSave}
                        services={services}
                        customers={customers}
                        values={{
                          id: appt.id,
                          service_id: appt.service_id,
                          date: appt.date,
                          time: appt.time,
                          status: appt.status,
                          notes: appt.notes,
                          customer_label: appt.customer_label,
                        }}
                        submitLabel="Save changes"
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : appointments.length > 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#8b92a5]">
            No appointments match your search or filters.
          </p>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f2f5] text-[#1e2235]">
              <CalendarDays className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="mt-4 font-semibold text-[#1e2235]">No appointments yet</p>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Create one manually or share your booking link with customers.
            </p>
            <Button
              type="button"
              className="mt-5 rounded-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" />
              Create appointment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
