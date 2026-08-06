"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ensureRealtimeAuth,
  subscribePostgresChannel,
} from "@/lib/realtime/channel";
import {
  fetchBusinessAppointment,
  fetchBusinessAppointments,
  hasMeaningfulAppointmentChange,
  patchStoreAppointmentTimes,
  sortStoreAppointments,
  upsertStoreAppointment,
} from "@/lib/business-appointments-client";
import type { StoreAppointmentRow } from "@/lib/store-appointments";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notification-sound";
import type { RealtimeChannel } from "@supabase/supabase-js";

type AppointmentRealtimeRow = {
  id: string;
  business_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  custom_fields?: Record<string, unknown> | null;
  service_id?: string;
};

export function useBusinessAppointments(
  businessId: string,
  timezone: string,
  initialAppointments: StoreAppointmentRow[]
) {
  const [appointments, setAppointments] = useState<StoreAppointmentRow[]>(() =>
    sortStoreAppointments(initialAppointments)
  );
  const appointmentsRef = useRef(appointments);
  const wasHiddenRef = useRef(false);

  appointmentsRef.current = appointments;

  // Keep in sync when server refresh delivers a new initial list.
  useEffect(() => {
    setAppointments(sortStoreAppointments(initialAppointments));
  }, [initialAppointments]);

  const applyAppointments = useCallback(
    (updater: (current: StoreAppointmentRow[]) => StoreAppointmentRow[]) => {
      setAppointments((current) => {
        const next = updater(current);
        if (hasMeaningfulAppointmentChange(current, next)) {
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
      const response = await fetch(
        `/api/business-appointments?businessId=${encodeURIComponent(businessId)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;

      const data = (await response.json()) as {
        appointments?: StoreAppointmentRow[];
      };

      if (!data.appointments) return;

      const sorted = sortStoreAppointments(data.appointments);
      if (hasMeaningfulAppointmentChange(appointmentsRef.current, sorted)) {
        playNotificationSound();
      }
      appointmentsRef.current = sorted;
      setAppointments(sorted);
    } catch {
      // Sync should not break the UI.
    }
  }, [businessId]);

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
        `business-appointments:${businessId}`,
        (next) =>
          next
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "appointments",
                filter: `business_id=eq.${businessId}`,
              },
              async (payload) => {
                const row = payload.new as AppointmentRealtimeRow;
                const item = await fetchBusinessAppointment(
                  supabase,
                  row.id,
                  timezone
                );
                if (!item || cancelled) return;
                applyAppointments((current) =>
                  upsertStoreAppointment(current, item)
                );
              }
            )
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "appointments",
                filter: `business_id=eq.${businessId}`,
              },
              async (payload) => {
                const row = payload.new as AppointmentRealtimeRow;
                const existing = appointmentsRef.current.find(
                  (item) => item.id === row.id
                );

                // Fast local patch so calendar/list update immediately.
                if (existing) {
                  applyAppointments((current) =>
                    upsertStoreAppointment(
                      current,
                      patchStoreAppointmentTimes(existing, row, timezone)
                    )
                  );
                }

                const item = await fetchBusinessAppointment(
                  supabase,
                  row.id,
                  timezone
                );
                if (!item || cancelled) return;
                // Quiet upsert — sound already handled by patch if meaningful.
                setAppointments((current) => {
                  const next = upsertStoreAppointment(current, item);
                  appointmentsRef.current = next;
                  return next;
                });
              }
            )
            .on(
              "postgres_changes",
              {
                event: "DELETE",
                schema: "public",
                table: "appointments",
                filter: `business_id=eq.${businessId}`,
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
            console.error(
              "[realtime:business-appointments]",
              status,
              err?.message
            );
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
    // Catch bookings created just before subscribe.
    void syncAppointments();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      authSubscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [businessId, timezone, applyAppointments, syncAppointments]);

  return { appointments, refresh: syncAppointments };
}

/** Client-side full list fetch (used by API route consumers / tests). */
export { fetchBusinessAppointments };
