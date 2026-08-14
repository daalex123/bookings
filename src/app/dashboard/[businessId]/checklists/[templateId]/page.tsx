import { notFound } from "next/navigation";
import { ChecklistTemplateBuilder } from "@/components/dashboard/checklist-template-builder";
import {
  getChecklistTemplate,
  listChecklistItemPresets,
  listChecklistSectionTitles,
} from "@/lib/checklists";

export default async function EditChecklistPage({
  params,
}: {
  params: Promise<{ businessId: string; templateId: string }>;
}) {
  const { businessId, templateId } = await params;
  const [template, savedItems, sectionTitles] = await Promise.all([
    getChecklistTemplate(businessId, templateId),
    listChecklistItemPresets(businessId),
    listChecklistSectionTitles(businessId),
  ]);
  if (!template) notFound();

  return (
    <ChecklistTemplateBuilder
      businessId={businessId}
      template={template}
      savedItems={savedItems}
      sectionTitles={sectionTitles}
    />
  );
}
