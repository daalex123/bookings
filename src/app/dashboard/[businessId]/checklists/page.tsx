import Link from "next/link";
import { format } from "date-fns";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { listChecklistTemplates } from "@/lib/checklists";
import { ChecklistDocActions } from "@/components/print/checklist-doc-actions";

export default async function ChecklistsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const templates = await listChecklistTemplates(businessId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Templates staff fill on a job. Customers see the completed form."
        action={
          <Button asChild>
            <Link href={`/dashboard/${businessId}/checklists/new`}>
              New template
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-[#1e2235]/10 bg-white px-6 py-12 text-center text-sm text-[#8b92a5]">
          No checklist templates yet. Create one, then attach it to a service as
          the default.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#1e2235]/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#1e2235]/10 bg-[#f0f2f5]/60 text-xs uppercase tracking-wide text-[#8b92a5]">
              <tr>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 font-semibold">Document</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-[#1e2235]/6 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/${businessId}/checklists/${template.id}`}
                      className="font-medium text-[var(--admin-navy)] hover:underline"
                    >
                      {template.name}
                    </Link>
                    {template.description && (
                      <p className="mt-0.5 text-xs text-[#8b92a5]">
                        {template.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {template.section_count} section
                    {template.section_count === 1 ? "" : "s"} · {template.item_count}{" "}
                    item{template.item_count === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold">
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8b92a5]">
                    {format(new Date(template.updated_at), "PP")}
                  </td>
                  <td className="px-4 py-3">
                    <ChecklistDocActions
                      previewHref={`/dashboard/${businessId}/checklists/${template.id}/preview`}
                      pdfHref={`/api/checklists/templates/${template.id}/pdf`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
