import { groupResponsesBySection, type JobChecklistView } from "@/lib/checklist-types";

export function ChecklistDocumentBody({
  title,
  subtitle,
  customerPhone,
  uniqueKeyLine,
  checklists,
}: {
  title: string;
  subtitle: string;
  customerPhone?: string | null;
  uniqueKeyLine?: string | null;
  checklists: JobChecklistView[];
}) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Checklist
        </p>
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-600">{subtitle}</p>
        {customerPhone ? (
          <p className="text-sm text-zinc-500">{customerPhone}</p>
        ) : null}
        {uniqueKeyLine ? (
          <p className="mt-1 text-sm font-medium text-zinc-900">{uniqueKeyLine}</p>
        ) : null}
      </div>

      {checklists.length === 0 ? (
        <p className="text-sm text-zinc-500">No checklist on this job yet.</p>
      ) : (
        <div className="space-y-8">
          {checklists.map((checklist) => {
            const sections = groupResponsesBySection(checklist.responses);
            return (
              <section key={checklist.id}>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {checklist.title}
                </h2>
                {checklist.header_fields.length > 0 && (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {checklist.header_fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <dt className="text-zinc-500">{field.label}</dt>
                        <dd className="font-medium text-zinc-900">
                          {checklist.header_values[field.id] || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {sections.map((section) => (
                    <div key={section.title}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {section.title}
                      </h3>
                      <ul className="mt-2 space-y-1 text-sm">
                        {section.items.map((item) => {
                          const option = checklist.status_options.find(
                            (o) => o.code === item.value
                          );
                          return (
                            <li
                              key={item.id}
                              className="flex justify-between gap-3 border-b border-zinc-100 py-1.5"
                            >
                              <span>{item.label}</span>
                              <span className="font-medium">
                                {item.item_type === "status"
                                  ? option?.label || item.value || "—"
                                  : item.value || "—"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                {checklist.comments ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600">
                    {checklist.comments}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
