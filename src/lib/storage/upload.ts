import { put } from "@vercel/blob";
import { isSuperAdmin } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "business-assets";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type UploadKind = "logo" | "cover" | "service";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function buildStoragePath(
  businessId: string,
  kind: UploadKind,
  filename: string,
  serviceId?: string
): string {
  const safe = sanitizeFilename(filename);
  if (kind === "logo") return `${businessId}/branding/logo-${Date.now()}-${safe}`;
  if (kind === "cover") return `${businessId}/branding/cover-${Date.now()}-${safe}`;
  return `${businessId}/services/${serviceId ?? "new"}/${Date.now()}-${safe}`;
}

async function uploadToVercelBlob(
  path: string,
  file: File
): Promise<string> {
  const blob = await put(path, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

async function uploadToSupabase(
  path: string,
  file: File
): Promise<string> {
  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a business image. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise Supabase Storage (works on Vercel and other hosts).
 */
export async function uploadBusinessImage(
  businessId: string,
  kind: UploadKind,
  file: File,
  serviceId?: string
): Promise<{ url: string; provider: "vercel-blob" | "supabase" }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const superAdmin = await isSuperAdmin();

  if (!superAdmin) {
    const { count } = await supabase
      .from("business_members")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("user_id", user.id);

    if (!count) {
      throw new Error("Not authorized to upload for this business");
    }
  }

  const path = buildStoragePath(businessId, kind, file.name, serviceId);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const url = await uploadToVercelBlob(path, file);
    return { url, provider: "vercel-blob" };
  }

  const url = await uploadToSupabase(path, file);
  return { url, provider: "supabase" };
}
