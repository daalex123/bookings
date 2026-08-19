import { cn } from "@/lib/utils";

export function ChecklistDocActions({
  previewHref,
  pdfHref,
  variant = "admin",
}: {
  previewHref: string;
  pdfHref: string;
  variant?: "admin" | "booking";
}) {
  const previewClass =
    variant === "booking"
      ? "rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15"
      : "inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50";
  const pdfClass =
    variant === "booking"
      ? "rounded-xl bg-booking-accent px-4 py-2.5 text-sm font-semibold text-booking-accent-fg"
      : "inline-flex items-center justify-center rounded-lg bg-booking-accent px-3 py-2 text-sm font-medium text-booking-accent-fg hover:brightness-110";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={previewHref} className={cn(previewClass)}>
        Preview
      </a>
      <a href={pdfHref} download className={cn(pdfClass)}>
        Download PDF
      </a>
    </div>
  );
}
