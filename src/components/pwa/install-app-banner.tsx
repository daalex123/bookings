"use client";

import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PWA_NAME } from "@/lib/pwa/constants";

export function InstallAppBanner() {
  const { showBanner, isIos, canPrompt, promptInstall, dismiss } =
    usePwaInstall();

  if (!showBanner) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 px-4"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-white/10 bg-booking-surface p-4 shadow-xl shadow-black/40">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-booking-accent text-lg font-bold text-booking-accent-fg">
          B
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install {PWA_NAME}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-booking-muted">
            {isIos && !canPrompt ? (
              <>
                Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                Share, then <strong className="text-white">Add to Home Screen</strong>{" "}
                for a full-screen app experience.
              </>
            ) : (
              "Add to your home screen for quick access — works on phone, tablet, and desktop."
            )}
          </p>
          {canPrompt ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-booking-accent px-4 py-2 text-xs font-semibold text-booking-accent-fg"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Install app
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-booking-muted transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
