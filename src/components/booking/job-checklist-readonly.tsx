import {
  groupResponsesBySection,
  type JobChecklistView,
} from "@/lib/checklist-types";
import { cn } from "@/lib/utils";

const STATUS_CHIP: Record<string, string> = {
  ok: "bg-emerald-500/20 text-emerald-100",
  A: "bg-sky-500/20 text-sky-100",
  C: "bg-teal-500/20 text-teal-100",
  R: "bg-amber-500/20 text-amber-100",
  X: "bg-red-500/20 text-red-100",
  "N/A": "bg-white/10 text-white/70",
};

const STATUS_CHIP_LIGHT: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  A: "bg-sky-100 text-sky-800",
  C: "bg-teal-100 text-teal-800",
  R: "bg-amber-100 text-amber-800",
  X: "bg-red-100 text-red-800",
  "N/A": "bg-zinc-100 text-zinc-600",
};

export function JobChecklistReadOnly({
  checklists,
  isBooking,
  embedded = false,
}: {
  checklists: JobChecklistView[];
  isBooking: boolean;
  embedded?: boolean;
}) {
  if (checklists.length === 0) return null;

  return (
    <>
      {checklists.map((checklist) => {
        const sections = groupResponsesBySection(checklist.responses);
        return (
          <section
            key={checklist.id}
            className={cn(
              embedded ? "rounded-2xl p-0" : "rounded-3xl p-5",
              !embedded &&
                (isBooking
                  ? "booking-glass-card"
                  : "border border-zinc-200 bg-white shadow-sm")
            )}
          >
            <h2
              className={cn(
                "text-sm font-semibold tracking-wide",
                isBooking ? "text-white/55" : "text-zinc-500"
              )}
            >
              {checklist.title}
            </h2>
            <p
              className={cn(
                "mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]",
                isBooking ? "text-white/45" : "text-zinc-500"
              )}
            >
              {checklist.status_options.map((option) => (
                <span key={option.code}>
                  <span className={isBooking ? "text-white/80" : "text-zinc-700"}>
                    {option.code}
                  </span>{" "}
                  {option.label}
                </span>
              ))}
            </p>

            {checklist.header_fields.length > 0 && (
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {checklist.header_fields.map((field) => (
                  <div key={field.id} className="flex justify-between gap-3 text-sm">
                    <dt className={isBooking ? "text-white/50" : "text-zinc-500"}>
                      {field.label}
                    </dt>
                    <dd
                      className={cn(
                        "font-medium",
                        isBooking ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {checklist.header_values[field.id] || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3
                    className={cn(
                      "mb-2 text-xs font-semibold uppercase tracking-wide",
                      isBooking ? "text-white/45" : "text-zinc-500"
                    )}
                  >
                    {section.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.map((item) => {
                      const option = checklist.status_options.find(
                        (o) => o.code === item.value
                      );
                      return (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-2 text-sm"
                        >
                          <span className={isBooking ? "text-white/85" : "text-zinc-800"}>
                            {item.label}
                          </span>
                          {item.item_type === "status" ? (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                item.value
                                  ? isBooking
                                    ? STATUS_CHIP[item.value] ??
                                      "bg-white/15 text-white"
                                    : STATUS_CHIP_LIGHT[item.value] ??
                                      "bg-zinc-100 text-zinc-800"
                                  : isBooking
                                    ? "text-white/35"
                                    : "text-zinc-400"
                              )}
                              title={option?.label}
                            >
                              {option ? option.label : item.value || "—"}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "shrink-0 font-medium",
                                isBooking ? "text-white" : "text-zinc-900"
                              )}
                            >
                              {item.value || "—"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {checklist.comments && (
              <p
                className={cn(
                  "mt-5 whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  isBooking
                    ? "bg-white/10 text-white/85 ring-1 ring-white/10"
                    : "bg-zinc-50 text-zinc-700"
                )}
              >
                {checklist.comments}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
