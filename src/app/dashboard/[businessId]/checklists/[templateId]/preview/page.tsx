import { notFound } from "next/navigation";
import { DocumentChrome } from "@/components/print/document-chrome";
import { DocumentPreviewBar } from "@/components/print/document-preview-bar";
import { ChecklistDocumentBody } from "@/components/print/checklist-document-body";
import { getChecklistTemplate } from "@/lib/checklists";
import { templateToPreviewChecklist } from "@/lib/checklist-types";
import { createClient } from "@/lib/supabase/server";

export default async function ChecklistTemplatePreviewPage({
  params,
}: {
  params: Promise<{ businessId: string; templateId: string }>;
}) {
  const { businessId, templateId } = await params;
  const supabase = await createClient();
  const [template, { data: business }] = await Promise.all([
    getChecklistTemplate(businessId, templateId),
    supabase
      .from("businesses")
      .select(
        "name, logo_url, brand_color, address, contact_email, contact_phone, contact_whatsapp, document_template"
      )
      .eq("id", businessId)
      .single(),
  ]);

  if (!template || !business) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <DocumentPreviewBar
        backHref={`/dashboard/${businessId}/checklists/${templateId}`}
        backLabel="Back to template"
        pdfHref={`/api/checklists/templates/${templateId}/pdf`}
      />
      <DocumentChrome business={business} template={business.document_template}>
        <ChecklistDocumentBody
          title={template.name}
          subtitle="Template preview"
          checklists={[templateToPreviewChecklist(template)]}
        />
      </DocumentChrome>
    </div>
  );
}
