"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ensureRealtimeAuth,
  subscribePostgresChannel,
} from "@/lib/realtime/channel";
import { fetchCustomerAppointment } from "@/lib/customer-appointments-client";
import type { CustomerAppointmentItem } from "@/lib/customer-appointments";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notification-sound";
import type { RealtimeChannel } from "@supabase/supabase-js";

type AppointmentRow = {
  id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
};

function sortAppointments(items: CustomerAppointmentItem[]): CustomerAppointmentItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function upsertAppointment(
  items: CustomerAppointmentItem[],
  next: CustomerAppointmentItem
): CustomerAppointmentItem[] {
  const without = items.filter((item) => item.id !== next.id);
  return sortAppointments([next, ...without]);
}

function hasMeaningfulChange(
  previous: CustomerAppointmentItem[],
  next: CustomerAppointmentItem[]
): boolean {
  const previousMap = new Map(previous.map((item) => [item.id, item]));

  for (const item of next) {
    const existing = previousMap.get(item.id);
    if (!existing) return true;
    if (existing.status !== item.status) return true;
    if (existing.start_at !== item.start_at) return true;
  }

  return false;
}

export function useMyAppointments(
  userId: string,
  initialAppointments: CustomerAppointmentItem[]
) {
  const [appointments, setAppointments] = useState<CustomerAppointmentItem[]>(() =>
    sortAppointments(initialAppointments)
  );
  const appointmentsRef = useRef(appointments);
  const wasHiddenRef = useRef(false);

  appointmentsRef.current = appointments;

  const applyAppointments = useCallback(
    (updater: (current: CustomerAppointmentItem[]) => CustomerAppointmentItem[]) => {
      setAppointments((current) => {
        const next = updater(current);
        if (hasMeaningfulChange(current, next)) {
          playNotificationSound();
        }
        appointmentsRef.current = next;
        return next;
      });
    },
    []
  );

  const syncAppointments = useCallback(async () => {
    try {
      const response = await fetch("/api/my-appointments", { cache: "no-store" });
      if (!response.ok) return;

      const data = (await response.json()) as {
        appointments?: CustomerAppointmentItem[];
      };

      if (!data.appointments) return;

      const sorted = sortAppointments(data.appointments);
      if (hasMeaningfulChange(appointmentsRef.current, sorted)) {
        playNotificationSound();
      }
      appointmentsRef.current = sorted;
      setAppointments(sorted);
    } catch {
      // Sync should not break the UI.
    }
  }, []);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        return;
      }
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        void syncAppointments();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    const connect = async () => {
      if (cancelled) return;

      const authed = await ensureRealtimeAuth(supabase);
      if (!authed || cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = await subscribePostgresChannel(
        supabase,
        `customer-appointments:${userId}`,
        (next) =>
          next
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "appointments",
                filter: `customer_id=eq.${userId}`,
              },
              async (payload) => {
                const row = payload.new as AppointmentRow;
                const item = await fetchCustomerAppointment(supabase, row.id);
                if (!item || cancelled) return;
                applyAppointments((current) => upsertAppointment(current, item));
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "appointments",
                filter: `customer_id=eq.${userId}`,
              },
              async (payload) => {
                const row = payload.new as AppointmentRow;
                const existing = appointmentsRef.current.find(
                  (item) => item.id === row.id
                );

                if (existing) {
                  applyAppointments((current) =>
                    upsertAppointment(current, {
                      ...existing,
                      start_at: row.start_at,
                      end_at: row.end_at,
                      created_at: row.created_at,
                      status: row.status,
                      notes: row.notes,
                    })
                  );
                  return;
                }

                const item = await fetchCustomerAppointment(supabase, row.id);
                if (!item || cancelled) return;
                applyAppointments((current) => upsertAppointment(current, item));
              }
            )
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "appointments",
                filter: `customer_id=eq.${userId}`,
              },
              (payload) => {
                const row = payload.old as { id?: string };
                if (!row.id) return;
                const next = appointmentsRef.current.filter(
                  (item) => item.id !== row.id
                );
                appointmentsRef.current = next;
                setAppointments(next);
              }
            ),
        (status, err) => {
          if (cancelled) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[realtime:appointments]", status, err?.message);
            retryTimer = setTimeout(() => {
              void connect();
            }, 3000);
          }
        }
      );
    };

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token || cancelled) return;
      void supabase.realtime.setAuth(session.access_token);
    });

    void connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      authSubscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, applyAppointments, syncAppointments]);

  return { appointments, refresh: syncAppointments };
}
