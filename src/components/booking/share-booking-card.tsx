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
  downloadFileName = "booking-qr.png",
  compact = false,
}: {
  url: string;
  title?: string;
  description?: string;
  variant?: "light" | "dark";
  downloadFileName?: string;
  compact?: boolean;
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
      link.download = downloadFileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [downloadFileName]);

  const isDark = variant === "dark";
  const qrSize = compact ? 72 : 120;

  return (
    <div
      className={cn(
        compact ? "rounded-2xl p-3" : "rounded-3xl p-4",
        isDark ? "booking-glass-card" : "border border-zinc-200 bg-white"
      )}
    >
      <div className={cn(compact ? "space-y-0.5" : "space-y-1")}>
        <h3
          className={cn(
            compact ? "text-sm font-semibold" : "text-base font-semibold",
            isDark ? "text-white" : "text-zinc-900"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            compact ? "text-[11px] leading-snug" : "text-sm",
            isDark ? "text-booking-muted" : "text-zinc-600"
          )}
        >
          {description}
        </p>
      </div>

      <div
        className={cn(
          "mt-3 flex gap-2.5",
          compact
            ? "items-center"
            : "sm:mt-4 sm:flex-row sm:items-start sm:gap-3"
        )}
      >
        <div
          ref={qrRef}
          className={cn(
            "shrink-0 rounded-lg bg-white shadow-sm",
            compact ? "p-1.5" : "mx-auto rounded-xl p-3 sm:mx-0"
          )}
          aria-hidden
        >
          <QRCode value={url} size={qrSize} level="M" />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-1.5">
          <p
            className={cn(
              "break-all rounded-md px-2 py-1 font-mono text-[10px] leading-snug",
              isDark ? "booking-glass text-booking-muted" : "bg-zinc-50 text-zinc-600"
            )}
          >
            {url}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "inline-flex items-center gap-1 rounded-md font-medium transition-colors",
                compact ? "px-2.5 py-1 text-[11px]" : "rounded-lg px-3 py-2 text-xs",
                isDark
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy link
                </>
              )}
            </button>
            <button
              type="button"
              onClick={downloadQr}
              className={cn(
                "inline-flex items-center gap-1 rounded-md font-medium transition-colors",
                compact ? "px-2.5 py-1 text-[11px]" : "rounded-lg px-3 py-2 text-xs",
                isDark
                  ? "booking-glass-pill text-white hover:bg-white/10"
                  : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              )}
            >
              <Download className="h-3 w-3" />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
