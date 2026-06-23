"use client";

import { useCallback, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShareBookingCard({
  url,
  title = "Share booking page",
  description = "Scan the QR code or copy the link to share with customers.",
  variant = "light",
}: {
  url: string;
  title?: string;
  description?: string;
  variant?: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  const downloadQr = useCallback(() => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const size = 512;

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = "booking-qr.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, []);

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "rounded-3xl p-5",
        isDark ? "bg-booking-elevated" : "border border-zinc-200 bg-white"
      )}
    >
      <div className="space-y-1">
        <h3
          className={cn(
            "font-semibold",
            isDark ? "text-white" : "text-zinc-900"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "text-sm",
            isDark ? "text-booking-muted" : "text-zinc-600"
          )}
        >
          {description}
        </p>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          ref={qrRef}
          className="rounded-2xl bg-white p-4 shadow-sm"
          aria-hidden
        >
          <QRCode value={url} size={148} level="M" />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-3">
          <p
            className={cn(
              "break-all rounded-xl px-3 py-2 font-mono text-xs",
              isDark ? "bg-booking-surface text-booking-muted" : "bg-zinc-50 text-zinc-600"
            )}
          >
            {url}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                isDark
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
            <button
              type="button"
              onClick={downloadQr}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                isDark
                  ? "bg-booking-surface text-white hover:bg-white/10"
                  : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              )}
            >
              <Download className="h-4 w-4" />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
