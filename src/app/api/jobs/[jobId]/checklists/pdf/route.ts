import { NextResponse } from "next/server";
import { buildChecklistPdf, pdfFileResponse } from "@/lib/pdf/documents";
import { loadChecklistPdfPayload } from "@/lib/pdf/load";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const payload = await loadChecklistPdfPayload(jobId);
  if ("error" in payload) {
    return NextResponse.json(
      { error: payload.error === 401 ? "Sign in required" : "Not found" },
      { status: payload.error }
    );
  }
  const bytes = await buildChecklistPdf(payload.input);
  return pdfFileResponse(bytes, payload.filename);
}
