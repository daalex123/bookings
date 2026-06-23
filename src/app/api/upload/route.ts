import { NextResponse } from "next/server";
import { uploadBusinessImage, type UploadKind } from "@/lib/storage/upload";

const KINDS = new Set<UploadKind>(["logo", "cover", "service"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const businessId = formData.get("businessId")?.toString();
    const kind = formData.get("kind")?.toString() as UploadKind | undefined;
    const file = formData.get("file");
    const serviceId = formData.get("serviceId")?.toString();

    if (!businessId || !kind || !KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadBusinessImage(
      businessId,
      kind,
      file,
      serviceId
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
