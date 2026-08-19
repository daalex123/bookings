import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";
import { formatUniqueKey, resolveUniqueKey } from "@/lib/customer-unique-key";
import { getJobChecklists, getChecklistTemplate } from "@/lib/checklists";
import { formatJobNumber } from "@/lib/job-invoices";
import { format } from "date-fns";
import { templateToPreviewChecklist } from "@/lib/checklist-types";
import type { InvoicePdfInput, ChecklistPdfInput } from "@/lib/pdf/documents";

export async function assertSignedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, error: 401 as const };
  return { supabase, user, error: null as null };
}

async function isBusinessStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string
) {
  const { data: member } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member) return true;
  const { data: isSuper } = await supabase.rpc("current_user_is_super_admin");
  return Boolean(isSuper);
}

export async function loadInvoicePdfPayload(invoiceId: string): Promise<
  | { error: 401 | 403 | 404 }
  | { filename: string; input: InvoicePdfInput }
> {
  const gate = await assertSignedIn();
  if (gate.error || !gate.user) return { error: 401 };
  const { supabase, user } = gate;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, profiles ( full_name, phone )")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return { error: 404 };

  const isOwner = invoice.customer_id === user.id;
  const isStaff = await isBusinessStaff(supabase, invoice.business_id, user.id);
  if (!isStaff && !isOwner) return { error: 403 };
  if (isOwner && !isStaff && !["issued", "paid", "void"].includes(invoice.status)) {
    return { error: 404 };
  }

  const [{ data: items }, { data: payments }, { data: business }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("description, quantity, unit_price")
      .eq("invoice_id", invoiceId)
      .order("sort_order"),
    supabase
      .from("invoice_payments")
      .select("paid_at, method, amount")
      .eq("invoice_id", invoiceId)
      .order("paid_at", { ascending: false }),
    supabase
      .from("businesses")
      .select(
        "name, logo_url, brand_color, address, contact_email, contact_phone, contact_whatsapp, document_template, customer_unique_key_field, booking_custom_fields"
      )
      .eq("id", invoice.business_id)
      .single(),
  ]);

  if (!business) return { error: 404 };

  const customer = asJoined(invoice.profiles);
  let uniqueKeyLine = formatUniqueKey(
    invoice.customer_unique_key
      ? {
          field: "key",
          label: invoice.customer_unique_key_label || "Reference",
          value: invoice.customer_unique_key,
        }
      : null
  );
  if (!uniqueKeyLine && invoice.appointment_id) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("custom_fields")
      .eq("id", invoice.appointment_id)
      .maybeSingle();
    uniqueKeyLine = formatUniqueKey(
      resolveUniqueKey(
        appointment?.custom_fields,
        business.customer_unique_key_field,
        business.booking_custom_fields
      )
    );
  }

  const number = invoice.invoice_number ?? "draft";
  return {
    filename: `invoice-${number}.pdf`,
    input: {
      business,
      invoice: {
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        currency: invoice.currency,
        subtotal: Number(invoice.subtotal),
        discount_amount: Number(invoice.discount_amount),
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        notes: invoice.notes,
        issued_at: invoice.issued_at,
        paid_at: invoice.paid_at,
      },
      customerName: customer?.full_name ?? "Customer",
      customerPhone: customer?.phone,
      uniqueKeyLine,
      items: (items ?? []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
      payments: (payments ?? []).map((p) => ({
        paid_at: p.paid_at,
        method: p.method,
        amount: Number(p.amount),
      })),
    },
  };
}

export async function loadChecklistPdfPayload(jobId: string): Promise<
  | { error: 401 | 403 | 404 }
  | { filename: string; input: ChecklistPdfInput }
> {
  const gate = await assertSignedIn();
  if (gate.error || !gate.user) return { error: 401 };
  const { supabase, user } = gate;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, job_number, appointment_id, customer_id, business_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { error: 404 };

  const isOwner = job.customer_id === user.id;
  const isStaff = await isBusinessStaff(supabase, job.business_id, user.id);
  if (!isStaff && !isOwner) return { error: 403 };

  const [{ data: business }, checklists, { data: appointment }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "name, logo_url, brand_color, address, contact_email, contact_phone, contact_whatsapp, document_template, customer_unique_key_field, booking_custom_fields"
      )
      .eq("id", job.business_id)
      .single(),
    getJobChecklists(job.business_id, job.id),
    supabase
      .from("appointments")
      .select(
        "start_at, custom_fields, services ( name ), profiles ( full_name, phone )"
      )
      .eq("id", job.appointment_id)
      .maybeSingle(),
  ]);

  if (!business) return { error: 404 };

  const service = asJoined(appointment?.services);
  const customer = asJoined(appointment?.profiles);
  const uniqueKeyLine = formatUniqueKey(
    resolveUniqueKey(
      appointment?.custom_fields,
      business.customer_unique_key_field,
      business.booking_custom_fields
    )
  );
  const jobLabel = formatJobNumber(job.job_number, job.id);
  const subtitle = [
    service?.name ?? "Service",
    customer?.full_name ?? "Customer",
    appointment?.start_at ? format(new Date(appointment.start_at), "PP") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    filename: `checklist-${jobLabel}.pdf`,
    input: {
      business,
      title: jobLabel,
      subtitle,
      uniqueKeyLine,
      customerPhone: customer?.phone,
      checklists,
    },
  };
}

export async function loadTemplatePdfPayload(templateId: string): Promise<
  | { error: 401 | 403 | 404 }
  | { filename: string; input: ChecklistPdfInput }
> {
  const gate = await assertSignedIn();
  if (gate.error || !gate.user) return { error: 401 };
  const { supabase, user } = gate;

  const { data: templateRow } = await supabase
    .from("job_checklist_templates")
    .select("id, business_id, name")
    .eq("id", templateId)
    .maybeSingle();
  if (!templateRow) return { error: 404 };

  const staff = await isBusinessStaff(supabase, templateRow.business_id, user.id);
  if (!staff) return { error: 403 };

  const template = await getChecklistTemplate(templateRow.business_id, templateId);
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "name, logo_url, brand_color, address, contact_email, contact_phone, contact_whatsapp, document_template"
    )
    .eq("id", templateRow.business_id)
    .single();
  if (!template || !business) return { error: 404 };

  return {
    filename: `checklist-template-${template.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    input: {
      business,
      title: template.name,
      subtitle: "Template preview",
      checklists: [templateToPreviewChecklist(template)],
    },
  };
}
