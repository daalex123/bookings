import { NextResponse } from "next/server";
import { buildInvoicePdf, pdfFileResponse } from "@/lib/pdf/documents";
import { loadInvoicePdfPayload } from "@/lib/pdf/load";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  const payload = await loadInvoicePdfPayload(invoiceId);
  if ("error" in payload) {
    return NextResponse.json(
      { error: payload.error === 401 ? "Sign in required" : "Not found" },
      { status: payload.error }
    );
  }
  const bytes = await buildInvoicePdf(payload.input);
  return pdfFileResponse(bytes, payload.filename);
}
