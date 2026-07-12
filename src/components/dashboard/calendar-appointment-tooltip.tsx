"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import type { AppointmentRow } from "@/components/dashboard/appointments-panel";
import { cn } from "@/lib/utils";

function appointmentTooltipLines(appt: AppointmentRow): string[] {
  const lines = [
    appt.service_name,
    `${format(new Date(appt.start_at), "h:mm a")} – ${format(new Date(appt.end_at), "h:mm a")}`,
    appt.customer_name,
  ];

  if (appt.customer_phone) lines.push(appt.customer_phone);
  if (appt.addon_names.length > 0) {
    lines.push(`Add-ons: ${appt.addon_names.join(", ")}`);
  }
  lines.push(`Status: ${appt.status.replace(/_/g, " ")}`);
  if (appt.notes?.trim()) lines.push(`Notes: ${appt.notes.trim()}`);

  return lines;
}

export function appointmentTooltipTitle(appt: AppointmentRow): string {
  return appointmentTooltipLines(appt).join(" · ");
}

function TooltipCard({
  appt,
  variant,
  id,
  style,
}: {
  appt: AppointmentRow;
  variant: "admin" | "booking";
  id: string;
  style: React.CSSProperties;
}) {
  const isBooking = variant === "booking";

  return (
    <div
      id={id}
      role="tooltip"
      style={style}
      className={cn(
        "pointer-events-none z-[200] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border px-3 py-2.5 text-left shadow-xl",
        isBooking
          ? "border-white/15 bg-[#1a1a1a] text-white"
          : "border-[#1e2235]/10 bg-white text-[#1e2235]"
      )}
    >
      <p className="text-sm font-semibold leading-snug">{appt.service_name}</p>
      <p
        className={cn(
          "mt-1 text-xs",
          isBooking ? "text-booking-muted" : "text-[#8b92a5]"
        )}
      >
        {format(new Date(appt.start_at), "h:mm a")} –{" "}
        {format(new Date(appt.end_at), "h:mm a")}
      </p>
      <p className="mt-2 text-xs font-medium">{appt.customer_name}</p>
      {appt.customer_phone && (
        <p
          className={cn(
            "text-xs",
            isBooking ? "text-booking-muted" : "text-[#8b92a5]"
          )}
        >
          {appt.customer_phone}
        </p>
      )}
      {appt.addon_names.length > 0 && (
        <p
          className={cn(
            "mt-1 text-xs",
            isBooking ? "text-booking-muted" : "text-[#8b92a5]"
          )}
        >
          + {appt.addon_names.join(", ")}
        </p>
      )}
      <p
        className={cn(
          "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
          appt.status === "pending" &&
            (isBooking ? "bg-amber-500/20 text-amber-400" : "bg-teal-50 text-teal-700"),
          appt.status === "confirmed" &&
            (isBooking
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-emerald-50 text-emerald-700"),
          appt.status === "cancelled" &&
            (isBooking ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600"),
          appt.status === "completed" &&
            (isBooking ? "bg-white/10 text-booking-muted" : "bg-[#f0f2f5] text-[#8b92a5]"),
          appt.status === "no_show" &&
            (isBooking ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-600")
        )}
      >
        {appt.status.replace(/_/g, " ")}
      </p>
      {appt.notes?.trim() && (
        <p
          className={cn(
            "mt-2 line-clamp-3 text-xs leading-relaxed",
            isBooking ? "text-booking-muted" : "text-[#8b92a5]"
          )}
        >
          {appt.notes.trim()}
        </p>
      )}
    </div>
  );
}

function positionTooltip(
  anchor: DOMRect,
  tooltipHeight = 160,
  tooltipWidth = 288
): React.CSSProperties {
  const margin = 8;
  const centerX = anchor.left + anchor.width / 2;
  let left = centerX;
  let top = anchor.top - margin;
  let transform = "translate(-50%, -100%)";

  const minLeft = margin + tooltipWidth / 2;
  const maxLeft = window.innerWidth - margin - tooltipWidth / 2;
  left = Math.min(Math.max(left, minLeft), maxLeft);

  if (top - tooltipHeight < margin) {
    top = anchor.bottom + margin;
    transform = "translate(-50%, 0)";
  }

  return {
    position: "fixed",
    left,
    top,
    transform,
  };
}

export function CalendarAppointmentTooltip({
  appt,
  variant = "admin",
  className,
  children,
  onActivate,
}: {
  appt: AppointmentRow;
  variant?: "admin" | "booking";
  className?: string;
  children: React.ReactNode;
  onActivate?: () => void;
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords(positionTooltip(rect));
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div
        ref={anchorRef}
        className={cn("relative", className)}
        title={appointmentTooltipTitle(appt)}
        aria-describedby={open ? tooltipId : undefined}
        role="button"
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          onActivate?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onActivate?.();
          }
        }}
      >
        {children}
      </div>
      {mounted &&
        open &&
        createPortal(
          <TooltipCard
            appt={appt}
            variant={variant}
            id={tooltipId}
            style={coords}
          />,
          document.body
        )}
    </>
  );
}

export function CalendarDaySummaryTooltip({
  appointments,
  variant = "admin",
  className,
  children,
  onActivate,
}: {
  appointments: AppointmentRow[];
  variant?: "admin" | "booking";
  className?: string;
  children: React.ReactNode;
  onActivate?: () => void;
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const isBooking = variant === "booking";

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords(positionTooltip(rect, appointments.length * 28 + 56));
  }, [appointments.length]);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div
        ref={anchorRef}
        className={className}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          onActivate?.();
        }}
      >
        {children}
      </div>
      {mounted &&
        open &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={coords}
            className={cn(
              "pointer-events-none z-[200] w-[min(17rem,calc(100vw-1.5rem))] rounded-xl border px-3 py-2.5 shadow-xl",
              isBooking
                ? "border-white/15 bg-[#1a1a1a] text-white"
                : "border-[#1e2235]/10 bg-white text-[#1e2235]"
            )}
          >
            <p className="text-xs font-semibold">
              {appointments.length} appointment
              {appointments.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {appointments.map((appt) => (
                <li key={appt.id} className="text-xs leading-snug">
                  <p className="font-medium">{appt.service_name}</p>
                  <p
                    className={cn(
                      isBooking ? "text-booking-muted" : "text-[#8b92a5]"
                    )}
                  >
                    {format(new Date(appt.start_at), "h:mm a")} ·{" "}
                    {appt.customer_name}
                  </p>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}

export function CalendarDayOverflowTooltip({
  appointments,
  hiddenCount,
  variant = "admin",
  className,
  onActivate,
}: {
  appointments: AppointmentRow[];
  hiddenCount: number;
  variant?: "admin" | "booking";
  className?: string;
  onActivate?: () => void;
}) {
  const tooltipId = useId();
  const anchorRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const isBooking = variant === "booking";
  const hidden = appointments.slice(-hiddenCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords(positionTooltip(rect, hidden.length * 28 + 48));
  }, [hidden.length]);

  const show = useCallback(() => {
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <p
        ref={anchorRef}
        role="button"
        tabIndex={0}
        className={className}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          onActivate?.();
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onActivate?.();
          }
        }}
      >
        +{hiddenCount} more
      </p>
      {mounted &&
        open &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={coords}
            className={cn(
              "pointer-events-none z-[200] w-[min(16rem,calc(100vw-1.5rem))] rounded-xl border px-3 py-2.5 shadow-xl",
              isBooking
                ? "border-white/15 bg-[#1a1a1a] text-white"
                : "border-[#1e2235]/10 bg-white text-[#1e2235]"
            )}
          >
            <p className="text-xs font-semibold">More appointments</p>
            <ul className="mt-2 space-y-1.5">
              {hidden.map((appt) => (
                <li
                  key={appt.id}
                  className={cn(
                    "text-xs leading-snug",
                    isBooking ? "text-booking-muted" : "text-[#8b92a5]"
                  )}
                >
                  <span className="font-medium text-inherit">
                    {format(new Date(appt.start_at), "h:mm a")}
                  </span>{" "}
                  · {appt.service_name} · {appt.customer_name}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
