"use client";

import { useEffect } from "react";
import { SW_URL } from "@/lib/pwa/constants";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(() => {
      // Registration can fail on insecure origins or unsupported browsers.
    });
  }, []);

  return null;
}
