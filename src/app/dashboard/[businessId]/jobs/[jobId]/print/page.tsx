import { notFound } from "next/navigation";
import { format } from "date-fns";
import { DocumentChrome } from "@/components/print/document-chrome";
import { DocumentPreviewBar } from "@/components/print/document-preview-bar";
import { ChecklistDocumentBody } from "@/components/print/checklist-document-body";
import { getJobChecklists } from "@/lib/checklists";
import { formatUniqueKey, resolveUniqueKey } from "@/lib/customer-unique-key";
import { formatJobNumber } from "@/lib/job-invoices";
import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";

export default async function JobPrintPage({
  params,
}: {
  params: Promise<{ businessId: string; jobId: string }>;
}) {
  const { businessId, jobId } = await params;
  const supabase = await createClient();

  const [{ data: job }, { data: business }, checklists] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, job_number, appointment_id, customer_id")
      .eq("id", jobId)
      .eq("business_id", businessId)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select(
        "name, logo_url, brand_color, contact_email, contact_whatsapp, contact_phone, address, document_template, customer_unique_key_field, booking_custom_fields"
      )
      .eq("id", businessId)
      .single(),
    getJobChecklists(businessId, jobId),
  ]);

  if (!job || !business) notFound();

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "start_at, custom_fields, services ( name ), profiles ( full_name, phone )"
    )
    .eq("id", job.appointment_id)
    .maybeSingle();

  const service = asJoined(appointment?.services);
  const customer = asJoined(appointment?.profiles);
  const uniqueKeyLine = formatUniqueKey(
    resolveUniqueKey(
      appointment?.custom_fields,
      business.customer_unique_key_field,
      business.booking_custom_fields
    )
  );
  const subtitle = [
    service?.name ?? "Service",
    customer?.full_name ?? "Customer",
    appointment?.start_at ? format(new Date(appointment.start_at), "PP") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <DocumentPreviewBar
        backHref={`/dashboard/${businessId}/jobs/${jobId}`}
        backLabel="Back to job"
        pdfHref={`/api/jobs/${jobId}/checklists/pdf`}
      />
      <DocumentChrome business={business} template={business.document_template}>
        <ChecklistDocumentBody
          title={formatJobNumber(job.job_number, job.id)}
          subtitle={subtitle}
          customerPhone={customer?.phone}
          uniqueKeyLine={uniqueKeyLine}
          checklists={checklists}
        />
      </DocumentChrome>
    </div>
  );
}
