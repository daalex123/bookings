"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UploadKind } from "@/lib/storage/upload";

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

  async function handleFile(file: File) {
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

  return (
    <div className={className}>
      <Label>{label}</Label>
      <input type="hidden" name={name} value={url} />
      <div className="mt-2 flex flex-wrap items-center gap-4">
        {url ? (
          <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-zinc-100">
            <Image
              src={url}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed bg-zinc-50 text-zinc-400">
            <Upload className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
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
            ) : url ? (
              "Replace image"
            ) : (
              "Upload image"
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-zinc-500">JPEG, PNG, WebP, or GIF · max 5 MB</p>
        </div>
      </div>
    </div>
  );
}
