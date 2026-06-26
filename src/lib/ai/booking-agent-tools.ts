import {
  dayBoundsInTimezone,
  DAY_NAMES,
  generateTimeSlots,
  slotToTimestamps,
  todayInTimezone,
} from "@/lib/availability";
import type { PublicBusinessContext } from "@/lib/booking";
import { getPublicBookedSlots } from "@/lib/booking-data";
import { formatInTimeZone } from "date-fns-tz";
import { mapCustomerAppointment } from "@/lib/customer-appointments-client";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import { sendBookingNotifications } from "@/lib/notifications/send-booking-notifications";
import { notifyAppointmentStatus } from "@/lib/notifications/send-status-notifications";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, utcToLocalParts } from "@/lib/utils";
import type { NimTool } from "@/lib/ai/nim-client";

export const BOOKING_AGENT_TOOLS: NimTool[] = [
  {
    type: "function",
    function: {
      name: "list_my_appointments",
      description:
        "List the signed-in customer's appointments at this business. Use when they ask to see, review, or manage their bookings.",
      parameters: {
        type: "object",
        properties: {
          upcoming_only: {
            type: "boolean",
            description:
              "If true, only return future appointments that are not cancelled or completed",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description:
        "List available appointment time slots for a service on a specific date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: {
          service_id: {
            type: "string",
            description: "UUID of the service to check",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format",
          },
        },
        required: ["service_id", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book an appointment after the customer confirms service, date, and time. Only call when all details are agreed.",
      parameters: {
        type: "object",
        properties: {
          service_id: { type: "string", description: "UUID of the service" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Start time in HH:mm (24h)" },
          notes: {
            type: "string",
            description: "Optional customer notes or special requests",
          },
          addon_service_ids: {
            type: "array",
            items: { type: "string" },
            description: "Optional add-on service UUIDs",
          },
        },
        required: ["service_id", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description:
        "Cancel a confirmed appointment. Use the service, date (YYYY-MM-DD), and time (HH:mm) from list_my_appointments _cancel_with field.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "Service name exactly as returned by list_my_appointments",
          },
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD from _cancel_with",
          },
          time: {
            type: "string",
            description: "Time in HH:mm (24h) from _cancel_with",
          },
        },
        required: ["service", "date", "time"],
      },
    },
  },
];

export function buildBookingAgentSystemPrompt(
  ctx: PublicBusinessContext
): string {
  const { business, services, addons, hours } = ctx;
  const today = todayInTimezone(business.timezone);
  const currency = business.currency;

  const serviceLines = services.map(
    (s) =>
      `- id: ${s.id} | ${s.name} | ${formatPrice(s.price, currency)} | ${s.duration_minutes} min${
        s.description ? ` | ${s.description}` : ""
      }`
  );

  const addonLines = addons.map(
    (a) =>
      `- id: ${a.id} | for service ${a.parent_service_id} | ${a.name} | ${formatPrice(a.price, currency)}`
  );

  const hourLines = hours.map(
    (h) =>
      `- ${DAY_NAMES[h.day_of_week]}: ${
        h.is_closed ? "closed" : `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`
      }`
  );

  return `You are a friendly booking assistant for "${business.name}".
Help customers choose a service, find an available time, book appointments, view their bookings, and cancel upcoming appointments.

Business timezone: ${business.timezone}
Today's date (${business.timezone}): ${today}
Currency: ${currency}

Services (use exact service_id values):
${serviceLines.length ? serviceLines.join("\n") : "(no services)"}

Add-ons (optional extras):
${addonLines.length ? addonLines.join("\n") : "(none)"}

Opening hours:
${hourLines.join("\n")}

Rules:
- Be concise, warm, and helpful. Use short paragraphs or bullet lists for times.
- When the customer asks to see their bookings, call list_my_appointments.
- Present each booking using its summary and details (service, date, time, status, add-ons, notes). Never show appointment_id, _cancel_with, service_id, or any UUID to the customer.
- When they want to cancel, list appointments first if needed, then confirm which booking by its details (e.g. "your Haircut on Friday at 2:30 PM") before calling cancel_appointment using _cancel_with from that booking.
- When the customer asks about availability, call check_availability with the correct service_id and date.
- Suggest nearby dates if a day has no slots.
- Before booking, summarize service, date, time, and price; ask for explicit confirmation.
- Only call book_appointment after the customer confirms.
- If a tool returns an error, explain it plainly and offer alternatives.
- Do not invent service IDs, appointment IDs, times, or prices — use tools and the lists above.
- Format times in 12-hour style for the customer (e.g. 2:30 PM) but pass HH:mm to tools.`;
}

async function getSlotsForService(
  bookingRef: string,
  ctx: PublicBusinessContext,
  serviceId: string,
  dateStr: string
): Promise<{ serviceName: string; slots: string[]; error?: string }> {
  const service = ctx.services.find((s) => s.id === serviceId);
  if (!service) {
    return { serviceName: "", slots: [], error: "Service not found" };
  }

  const { start, end } = dayBoundsInTimezone(dateStr, ctx.business.timezone);
  const appointments = await getPublicBookedSlots(bookingRef, start, end);

  const slots = generateTimeSlots(
    dateStr,
    service.duration_minutes,
    service.slot_interval_minutes ?? service.duration_minutes,
    ctx.hours.map((h) => ({
      ...h,
      id: "",
      business_id: ctx.business.id,
      created_at: "",
      updated_at: "",
    })),
    appointments,
    ctx.business.timezone
  );

  return { serviceName: service.name, slots };
}

export type AgentToolResult = {
  content: string;
  booking?: { appointmentId: string };
  cancelled?: { appointmentId: string };
};

type AppointmentJoinRow = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  businesses: { name: string; slug: string } | { name: string; slug: string }[] | null;
  services: { name: string } | { name: string }[] | null;
  appointment_addons?:
    | { services: { name: string } | { name: string }[] | null }[]
    | null;
};

function isCancellable(status: string, startAt: string): boolean {
  return (
    status !== "cancelled" &&
    status !== "completed" &&
    new Date(startAt) > new Date()
  );
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function formatAppointmentDetails(
  appt: CustomerAppointmentItem,
  timezone: string
) {
  const dateDisplay = formatInTimeZone(
    new Date(appt.start_at),
    timezone,
    "EEEE, MMMM d, yyyy"
  );
  const timeDisplay = formatInTimeZone(
    new Date(appt.start_at),
    timezone,
    "h:mm a"
  );
  const endTimeDisplay = formatInTimeZone(
    new Date(appt.end_at),
    timezone,
    "h:mm a"
  );
  const statusLabel = formatStatusLabel(appt.status);
  const addons =
    appt.addon_names.length > 0 ? appt.addon_names.join(", ") : null;
  const summaryParts = [
    appt.service_name,
    `${dateDisplay} at ${timeDisplay}`,
    `(${statusLabel})`,
  ];
  const summary = summaryParts.join(" — ");
  const { date: dateIso, time: time24 } = utcToLocalParts(appt.start_at, timezone);

  return {
    service: appt.service_name,
    date: dateDisplay,
    time: timeDisplay,
    end_time: endTimeDisplay,
    status: statusLabel,
    add_ons: addons,
    notes: appt.notes,
    summary,
    cancellable: isCancellable(appt.status, appt.start_at),
    _cancel_with: {
      service: appt.service_name,
      date: dateIso,
      time: time24,
    },
  };
}

async function fetchCustomerAppointments(
  ctx: PublicBusinessContext,
  userId: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id, start_at, end_at, created_at, status, notes,
      businesses ( name, slug ),
      services ( name ),
      appointment_addons ( services ( name ) )
    `
    )
    .eq("customer_id", userId)
    .eq("business_id", ctx.business.id)
    .order("start_at", { ascending: true });

  if (error) {
    return { appointments: [], error: error.message };
  }

  return {
    appointments: (data ?? []).map((row) =>
      mapCustomerAppointment(row as AppointmentJoinRow)
    ),
  };
}

export async function executeBookingAgentTool(
  bookingRef: string,
  ctx: PublicBusinessContext,
  userId: string,
  name: string,
  argsJson: string
): Promise<AgentToolResult> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return { content: JSON.stringify({ error: "Invalid tool arguments" }) };
  }

  if (name === "list_my_appointments") {
    const upcomingOnly = args.upcoming_only === true;
    const { appointments, error } = await fetchCustomerAppointments(ctx, userId);

    if (error) {
      return { content: JSON.stringify({ error }) };
    }

    const filtered = appointments.filter((appt) => {
      if (!upcomingOnly) return true;
      return isCancellable(appt.status, appt.start_at);
    });

    const timezone = ctx.business.timezone;
    const items = filtered.map((appt) => formatAppointmentDetails(appt, timezone));

    return {
      content: JSON.stringify({
        business: ctx.business.name,
        appointments: items,
        count: items.length,
        instruction:
          "Show the customer each appointment using summary and details only. Do not show _cancel_with or any internal IDs.",
      }),
    };
  }

  if (name === "check_availability") {
    const serviceId = String(args.service_id ?? "");
    const date = String(args.date ?? "");
    const { serviceName, slots, error } = await getSlotsForService(
      bookingRef,
      ctx,
      serviceId,
      date
    );

    if (error) {
      return { content: JSON.stringify({ error }) };
    }

    return {
      content: JSON.stringify({
        service: serviceName,
        date,
        timezone: ctx.business.timezone,
        available_times: slots,
        count: slots.length,
      }),
    };
  }

  if (name === "book_appointment") {
    const serviceId = String(args.service_id ?? "");
    const date = String(args.date ?? "");
    const time = String(args.time ?? "").slice(0, 5);
    const notes = args.notes ? String(args.notes) : null;
    const addonIds = Array.isArray(args.addon_service_ids)
      ? args.addon_service_ids.map(String)
      : [];

    const service = ctx.services.find((s) => s.id === serviceId);
    if (!service) {
      return { content: JSON.stringify({ error: "Service not found" }) };
    }

    const { slots } = await getSlotsForService(
      bookingRef,
      ctx,
      serviceId,
      date
    );
    if (!slots.includes(time)) {
      return {
        content: JSON.stringify({
          error: "That time is no longer available. Please pick another slot.",
          available_times: slots,
        }),
      };
    }

    const { start_at, end_at } = slotToTimestamps(
      date,
      time,
      service.duration_minutes,
      ctx.business.timezone
    );

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_public_appointment", {
      p_ref: bookingRef,
      p_service_id: serviceId,
      p_start_at: start_at,
      p_end_at: end_at,
      p_notes: notes,
      p_addon_service_ids: addonIds,
    });

    if (error) {
      return { content: JSON.stringify({ error: error.message }) };
    }

    const result = data as { success?: boolean; error?: string; id?: string } | null;
    if (result?.error) {
      return { content: JSON.stringify({ error: result.error }) };
    }

    if (result?.id) {
      try {
        await sendBookingNotifications(result.id, { actorUserId: userId });
      } catch (err) {
        console.error("[booking-agent] notification failed", err);
      }
    }

    const booked = formatAppointmentDetails(
      {
        id: result?.id ?? "",
        start_at,
        end_at,
        created_at: new Date().toISOString(),
        status: "pending",
        notes,
        business_name: ctx.business.name,
        business_slug: ctx.business.slug,
        service_name: service.name,
        addon_names: [],
      },
      ctx.business.timezone
    );

    return {
      content: JSON.stringify({
        success: true,
        service: booked.service,
        date: booked.date,
        time: booked.time,
        status: "pending",
        summary: booked.summary,
      }),
      booking: result?.id ? { appointmentId: result.id } : undefined,
    };
  }

  if (name === "cancel_appointment") {
    const serviceName = String(args.service ?? "").trim();
    const dateIso = String(args.date ?? "").trim();
    const time24 = String(args.time ?? "").slice(0, 5);

    if (!serviceName || !dateIso || !time24) {
      return {
        content: JSON.stringify({
          error: "service, date (YYYY-MM-DD), and time (HH:mm) are required",
        }),
      };
    }

    const { appointments, error: listError } = await fetchCustomerAppointments(
      ctx,
      userId
    );
    if (listError) {
      return { content: JSON.stringify({ error: listError }) };
    }

    const timezone = ctx.business.timezone;
    const appt = appointments.find((a) => {
      const parts = utcToLocalParts(a.start_at, timezone);
      return (
        a.service_name.toLowerCase() === serviceName.toLowerCase() &&
        parts.date === dateIso &&
        parts.time === time24
      );
    });

    if (!appt) {
      return {
        content: JSON.stringify({
          error:
            "Appointment not found. Call list_my_appointments and use _cancel_with from the matching booking.",
        }),
      };
    }

    const appointmentId = appt.id;

    if (!isCancellable(appt.status, appt.start_at)) {
      return {
        content: JSON.stringify({
          error: "This appointment cannot be cancelled.",
          status: appt.status,
        }),
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId)
      .eq("customer_id", userId)
      .eq("business_id", ctx.business.id);

    if (error) {
      return { content: JSON.stringify({ error: error.message }) };
    }

    try {
      await notifyAppointmentStatus(appointmentId, "cancelled", {
        actorUserId: userId,
      });
    } catch (err) {
      console.error("[booking-agent] cancellation notification failed", err);
    }

    const details = formatAppointmentDetails(appt, ctx.business.timezone);
    return {
      content: JSON.stringify({
        success: true,
        service: details.service,
        date: details.date,
        time: details.time,
        status: "cancelled",
        summary: details.summary,
      }),
      cancelled: { appointmentId },
    };
  }

  return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
}
