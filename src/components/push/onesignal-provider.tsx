"use client";

import Script from "next/script";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isOneSignalConfigured,
  ONESIGNAL_APP_ID,
  ONESIGNAL_SERVICE_WORKER_PATH,
} from "@/lib/push/onesignal/constants";

function runWhenReady(
  callback: (oneSignal: OneSignalWeb) => void | Promise<void>
) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(callback);
}

export function OneSignalProvider() {
  useEffect(() => {
    if (!isOneSignalConfigured()) return;

    let authUnsubscribe: (() => void) | undefined;

    runWhenReady(async (OneSignal) => {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
        serviceWorkerPath: ONESIGNAL_SERVICE_WORKER_PATH,
        serviceWorkerParam: { scope: "/" },
      });

      const supabase = createClient();

      const syncAuth = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await OneSignal.login(user.id);
        } else {
          await OneSignal.logout();
        }
      };

      await syncAuth();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          void OneSignal.login(session.user.id);
        } else {
          void OneSignal.logout();
        }
      });

      authUnsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      authUnsubscribe?.();
    };
  }, []);

  if (!isOneSignalConfigured()) return null;

  return (
    <Script
      id="onesignal-sdk"
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
      defer
    />
  );
}
