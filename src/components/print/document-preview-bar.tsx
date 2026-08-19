import Link from "next/link";
import { PdfDownloadLink } from "@/components/print/pdf-download-link";

export function DocumentPreviewBar({
  backHref,
  backLabel,
  pdfHref,
}: {
  backHref: string;
  backLabel: string;
  pdfHref: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="text-sm text-zinc-600 underline-offset-2 hover:underline"
      >
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <PdfDownloadLink
          href={pdfHref}
          className="rounded-full bg-booking-accent px-4 py-2 text-sm font-medium text-booking-accent-fg"
        >
          Download PDF
        </PdfDownloadLink>
        <span className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-600">
          Print with Ctrl/Cmd+P
        </span>
      </div>
    </div>
  );
}
