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
  const qrSize = compact ? 88 : 148;

  return (
    <div
      className={cn(
        compact ? "rounded-2xl p-4" : "rounded-3xl p-5",
        isDark ? "bg-booking-elevated" : "border border-zinc-200 bg-white"
      )}
    >
      <div className="space-y-1">
        <h3
          className={cn(
            compact ? "text-sm font-semibold" : "font-semibold",
            isDark ? "text-white" : "text-zinc-900"
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            compact ? "text-xs leading-relaxed" : "text-sm",
            isDark ? "text-booking-muted" : "text-zinc-600"
          )}
        >
          {description}
        </p>
      </div>

      <div
        className={cn(
          "mt-4 flex gap-3",
          compact
            ? "flex-col items-center"
            : "sm:mt-5 sm:flex-row sm:items-start sm:gap-4"
        )}
      >
        <div
          ref={qrRef}
          className={cn(
            "rounded-xl bg-white shadow-sm",
            compact ? "mx-auto p-2" : "mx-auto rounded-2xl p-4 sm:mx-0"
          )}
          aria-hidden
        >
          <QRCode value={url} size={qrSize} level="M" />
        </div>

        <div className="w-full min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "break-all rounded-lg px-2.5 py-1.5 font-mono text-[10px] sm:text-xs",
              isDark ? "bg-booking-surface text-booking-muted" : "bg-zinc-50 text-zinc-600"
            )}
          >
            {url}
          </p>
          <div className={cn("flex gap-2", compact ? "flex-col sm:flex-row" : "flex-wrap")}>
            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
                compact ? "px-3 py-1.5 text-xs" : "rounded-xl px-4 py-2.5 text-sm",
                isDark
                  ? "bg-booking-accent text-booking-accent-fg"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              )}
            >
              {copied ? (
                <>
                  <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  Copy link
                </>
              )}
            </button>
            <button
              type="button"
              onClick={downloadQr}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
                compact ? "px-3 py-1.5 text-xs" : "rounded-xl px-4 py-2.5 text-sm",
                isDark
                  ? "bg-booking-surface text-white hover:bg-white/10"
                  : "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              )}
            >
              <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
