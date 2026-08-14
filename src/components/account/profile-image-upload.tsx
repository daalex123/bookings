"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { UploadKind } from "@/lib/storage/upload";
import { cn, getInitials } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type ProfileImageVariant = "booking" | "dashboard" | "platform";

const avatarSize = {
  md: "h-16 w-16",
  lg: "h-24 w-24",
} as const;

const cameraSize = {
  md: "h-7 w-7",
  lg: "h-8 w-8",
} as const;

const cameraIconSize = {
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
} as const;

const initialsSize = {
  md: "text-lg",
  lg: "text-2xl",
} as const;

export function ProfileImageUpload({
  name,
  defaultUrl = "",
  displayName,
  variant = "dashboard",
  kind = "avatar",
  size = "lg",
  businessId,
  memberId,
  onUploaded,
  className,
}: {
  name?: string;
  defaultUrl?: string;
  displayName?: string | null;
  variant?: ProfileImageVariant;
  kind?: Extract<UploadKind, "avatar" | "staff">;
  size?: keyof typeof avatarSize;
  businessId?: string;
  memberId?: string;
  onUploaded?: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(displayName);
  const isBooking = variant === "booking";
  const isPlatform = variant === "platform";
  const compact = size === "md";

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      if (kind === "staff") {
        if (!businessId || !memberId) {
          throw new Error("Missing staff upload details");
        }
        body.set("businessId", businessId);
        body.set("memberId", memberId);
      }

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed");
      }
      setUrl(data.url);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller");
      return;
    }
    void uploadFile(file);
  }

  function removePhoto() {
    setUrl("");
    setError(null);
    onUploaded?.("");
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", compact && "items-start gap-2", className)}>
      {name ? <input type="hidden" name={name} value={url} /> : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Upload profile photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70",
          avatarSize[size],
          isBooking
            ? "focus-visible:ring-booking-accent focus-visible:ring-offset-transparent"
            : isPlatform
              ? "focus-visible:ring-zinc-500 focus-visible:ring-offset-zinc-950"
              : "focus-visible:ring-[#1e2235]/30 focus-visible:ring-offset-white"
        )}
      >
        <span
          className={cn(
            "relative block h-full w-full overflow-hidden rounded-full ring-2 ring-offset-2",
            isBooking
              ? "bg-booking-elevated ring-white/20 ring-offset-transparent"
              : isPlatform
                ? "bg-zinc-800 ring-zinc-700 ring-offset-zinc-950"
                : "bg-[#f0f2f5] ring-[#1e2235]/10 ring-offset-white"
          )}
        >
          {url ? (
            <Image src={url} alt="" fill className="object-cover" unoptimized />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center font-semibold",
                initialsSize[size],
                isBooking
                  ? "text-white"
                  : isPlatform
                    ? "text-zinc-300"
                    : "text-[#1e2235]"
              )}
            >
              {initials}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </span>
          )}
        </span>
        <span
          className={cn(
            "absolute right-0 bottom-0 flex items-center justify-center rounded-full shadow-sm ring-2 transition-transform group-hover:scale-105",
            cameraSize[size],
            isBooking
              ? "bg-booking-accent text-booking-accent-fg ring-booking-bg"
              : isPlatform
                ? "bg-zinc-100 text-zinc-900 ring-zinc-950"
                : "bg-booking-accent text-booking-accent-fg ring-white"
          )}
        >
          <Camera className={cameraIconSize[size]} strokeWidth={2} />
        </span>
      </button>

      {!compact ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "text-sm font-medium underline-offset-2 hover:underline disabled:opacity-60",
                isBooking
                  ? "text-booking-accent"
                  : isPlatform
                    ? "text-zinc-200"
                    : "text-[#1e2235]"
              )}
            >
              {url ? "Change photo" : "Add photo"}
            </button>
            {url ? (
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className={cn(
                  "text-sm hover:underline disabled:opacity-60",
                  isBooking
                    ? "text-booking-muted"
                    : isPlatform
                      ? "text-zinc-500"
                      : "text-[#8b92a5]"
                )}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1 text-xs",
              isBooking
                ? "text-booking-muted"
                : isPlatform
                  ? "text-zinc-500"
                  : "text-[#8b92a5]"
            )}
          >
            JPEG, PNG, or WebP · max 5 MB
          </p>
          {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
        </div>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
