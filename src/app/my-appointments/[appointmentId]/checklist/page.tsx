import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { DocumentChrome } from "@/components/print/document-chrome";
import { DocumentPreviewBar } from "@/components/print/document-preview-bar";
import { ChecklistDocumentBody } from "@/components/print/checklist-document-body";
import { getJobChecklists } from "@/lib/checklists";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUniqueKey, resolveUniqueKey } from "@/lib/customer-unique-key";
import { formatJobNumber } from "@/lib/job-invoices";
import { asJoined } from "@/lib/utils";

export default async function CustomerChecklistPreviewPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `id, start_at, customer_id, business_id, custom_fields,
       services ( name ),
       jobs ( id, job_number ),
       businesses (
         name, logo_url, brand_color, address, contact_email, contact_phone,
         contact_whatsapp, document_template, customer_unique_key_field, booking_custom_fields
       )`
    )
    .eq("id", appointmentId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!appointment) notFound();

  const job = asJoined(appointment.jobs);
  const business = asJoined(appointment.businesses);
  const service = asJoined(appointment.services);
  if (!job || !business) notFound();

  const checklists = await getJobChecklists(appointment.business_id, job.id);
  const uniqueKeyLine = formatUniqueKey(
    resolveUniqueKey(
      appointment.custom_fields,
      business.customer_unique_key_field,
      business.booking_custom_fields
    )
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const subtitle = [
    service?.name ?? "Service",
    profile?.full_name ?? "Customer",
    format(new Date(appointment.start_at), "PP"),
  ].join(" · ");

  return (
    <div className="mx-auto max-w-3xl bg-zinc-100 px-4 py-6 sm:px-8">
      <DocumentPreviewBar
        backHref={`/my-appointments/${appointmentId}`}
        backLabel="Back to appointment"
        pdfHref={`/api/jobs/${job.id}/checklists/pdf`}
      />
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <DocumentChrome business={business} template={business.document_template}>
          <ChecklistDocumentBody
            title={formatJobNumber(job.job_number, job.id)}
            subtitle={subtitle}
            customerPhone={profile?.phone}
            uniqueKeyLine={uniqueKeyLine}
            checklists={checklists}
          />
        </DocumentChrome>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        <Link href={`/my-appointments/${appointmentId}`} className="underline-offset-2 hover:underline">
          Return to appointment
        </Link>
      </p>
    </div>
  );
}
