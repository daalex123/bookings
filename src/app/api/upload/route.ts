import { NextResponse } from "next/server";
import {
  uploadBusinessImage,
  uploadProfileAvatar,
  uploadStaffAvatar,
  type UploadKind,
} from "@/lib/storage/upload";

const BUSINESS_KINDS = new Set<UploadKind>(["logo", "cover", "service"]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const kind = formData.get("kind")?.toString() as UploadKind | undefined;
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (kind === "avatar") {
      const result = await uploadProfileAvatar(file);
      return NextResponse.json(result);
    }

    if (kind === "staff") {
      const businessId = formData.get("businessId")?.toString();
      const memberId = formData.get("memberId")?.toString();
      if (!businessId || !memberId) {
        return NextResponse.json({ error: "Invalid staff upload request" }, { status: 400 });
      }
      const result = await uploadStaffAvatar(businessId, memberId, file);
      return NextResponse.json(result);
    }

    const businessId = formData.get("businessId")?.toString();
    const serviceId = formData.get("serviceId")?.toString();

    if (!businessId || !kind || !BUSINESS_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
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
