import { ChecklistTemplateBuilder } from "@/components/dashboard/checklist-template-builder";
import {
  listChecklistItemPresets,
  listChecklistSectionTitles,
} from "@/lib/checklists";

export default async function NewChecklistPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const [savedItems, sectionTitles] = await Promise.all([
    listChecklistItemPresets(businessId),
    listChecklistSectionTitles(businessId),
  ]);

  return (
    <ChecklistTemplateBuilder
      businessId={businessId}
      savedItems={savedItems}
      sectionTitles={sectionTitles}
    />
  );
}
