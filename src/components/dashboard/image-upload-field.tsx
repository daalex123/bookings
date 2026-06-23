"use client";

import { useRef, useState } from "react";
import NextImage from "next/image";
import { Image as ImageIcon, Loader2, Upload } from "@/lib/admin-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UploadKind } from "@/lib/storage/upload";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ImageUploadField({
  businessId,
  kind,
  name,
  label,
  defaultUrl = "",
  serviceId,
  className,
}: {
  businessId: string;
  kind: UploadKind;
  name: string;
  label: string;
  defaultUrl?: string;
  serviceId?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("businessId", businessId);
      body.set("kind", kind);
      body.set("file", file);
      if (serviceId) body.set("serviceId", serviceId);

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed");
      }
      setUrl(data.url);
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
    setError(null);
    void uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={url} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "mt-2 rounded-2xl border-2 border-dashed p-4 transition-colors",
          dragOver
            ? "border-[#1e2235] bg-[#f0f2f5]/80"
            : "border-[#1e2235]/15 bg-[#f0f2f5]/40"
        )}
      >
        <div className="flex flex-wrap items-center gap-4">
          {url ? (
            <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-white">
              <NextImage
                src={url}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed bg-white text-[#8b92a5]">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}

          <div className="min-w-[200px] flex-1 space-y-2">
            <p className="text-sm text-[#8b92a5]">
              Drag and drop an image here, or choose a file to upload.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {url ? "Replace" : "Choose image"}
                  </>
                )}
              </Button>
              {url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUrl("")}
                >
                  Remove
                </Button>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-[#8b92a5]">JPEG, PNG, WebP, or GIF · max 5 MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
