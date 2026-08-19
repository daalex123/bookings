"use server";

import { revalidatePath } from "next/cache";
import { appendJobEvent } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";
import { asJoined } from "@/lib/utils";
import { resolveUniqueKey } from "@/lib/customer-unique-key";
import type { InvoicePaymentMethod } from "@/types/database";

export type InvoiceLineInput = {
  service_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  sort_order?: number;
};

function calcTotals(lines: InvoiceLineInput[], discountAmount: number) {
  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
    0
  );
  const discount = Math.max(0, Math.min(discountAmount, subtotal));
  const total = Math.max(0, subtotal - discount);
  return {
    subtotal: roundMoney(subtotal),
    discount_amount: roundMoney(discount),
    tax_amount: 0,
    total: roundMoney(total),
  };
}

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type InvoiceLinePreset = {
  id: string;
  description: string;
  unit_price: number;
  cost_price: number;
  service_id: string | null;
  use_count: number;
};

export async function listInvoiceLinePresets(
  businessId: string,
  limit = 80
): Promise<InvoiceLinePreset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice_line_presets")
    .select("id, description, unit_price, cost_price, service_id, use_count")
    .eq("business_id", businessId)
    .order("last_used_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    unit_price: Number(row.unit_price),
    cost_price: Number(row.cost_price),
    service_id: row.service_id,
    use_count: row.use_count,
  }));
}

async function rememberInvoiceLinePresets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  lines: InvoiceLineInput[]
) {
  const now = new Date().toISOString();
  const seen = new Set<string>();

  for (const line of lines) {
    const description = line.description.trim();
    if (!description) continue;
    const key = description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const unitPrice = Number(line.unit_price) || 0;
    const costPrice = Number(line.cost_price) || 0;
    const serviceId = line.service_id ?? null;

    const { data: existing } = await supabase
      .from("invoice_line_presets")
      .select("id, use_count")
      .eq("business_id", businessId)
      .ilike("description", description)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("invoice_line_presets")
        .update({
          description,
          unit_price: unitPrice,
          cost_price: costPrice,
          service_id: serviceId,
          use_count: (existing.use_count ?? 1) + 1,
          last_used_at: now,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("invoice_line_presets").insert({
        business_id: businessId,
        description,
        unit_price: unitPrice,
        cost_price: costPrice,
        service_id: serviceId,
        use_count: 1,
        last_used_at: now,
      });
    }
  }
}

async function requireMember(businessId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, supabase, user: null };

  const { data: member } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    const { data: isSuper } = await supabase.rpc("current_user_is_super_admin");
    if (!isSuper) {
      return { error: "Not authorized" as const, supabase, user };
    }
  }

  return { supabase, user, error: null as null };
}

/** Prefill lines from an appointment (snapshotted prices). */
export async function buildLinesFromAppointment(appointmentId: string) {
  const supabase = await createClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      `
      id, service_id, service_price, service_cost_price,
      services ( name ),
      appointment_addons ( service_id, price, cost_price, services ( name ) )
    `
    )
    .eq("id", appointmentId)
    .single();

  if (!appointment) return [] as InvoiceLineInput[];

  const service = asJoined(
    appointment.services as { name?: string } | { name?: string }[] | null
  );
  const serviceName = service?.name ?? null;

  const lines: InvoiceLineInput[] = [
    {
      service_id: appointment.service_id,
      description: serviceName ?? "Service",
      quantity: 1,
      unit_price: Number(appointment.service_price ?? 0),
      cost_price: Number(appointment.service_cost_price ?? 0),
      sort_order: 0,
    },
  ];

  const addons = Array.isArray(appointment.appointment_addons)
    ? appointment.appointment_addons
    : [];

  addons.forEach((addon, index) => {
    const svc = addon.services as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
    lines.push({
      service_id: addon.service_id,
      description: name ?? "Add-on",
      quantity: 1,
      unit_price: Number(addon.price ?? 0),
      cost_price: Number(addon.cost_price ?? 0),
      sort_order: index + 1,
    });
  });

  return lines;
}

export async function createDraftInvoice(params: {
  businessId: string;
  customerId: string;
  appointmentId?: string | null;
  jobId?: string | null;
  notes?: string | null;
  discountAmount?: number;
  lines?: InvoiceLineInput[];
}) {
  const gate = await requireMember(params.businessId);
  if (gate.error) return { error: gate.error };
  const { supabase } = gate;

  let jobId = params.jobId ?? null;
  let appointmentId = params.appointmentId ?? null;

  if (jobId && !appointmentId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("appointment_id")
      .eq("id", jobId)
      .eq("business_id", params.businessId)
      .maybeSingle();
    appointmentId = job?.appointment_id ?? appointmentId;
  }

  if (!jobId && appointmentId) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("appointment_id", appointmentId)
      .eq("business_id", params.businessId)
      .maybeSingle();
    jobId = job?.id ?? null;
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("currency, customer_unique_key_field, booking_custom_fields")
    .eq("id", params.businessId)
    .single();

  let uniqueKey: { label: string; value: string } | null = null;
  if (appointmentId && business?.customer_unique_key_field) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("custom_fields")
      .eq("id", appointmentId)
      .maybeSingle();
    uniqueKey = resolveUniqueKey(
      appointment?.custom_fields,
      business.customer_unique_key_field,
      business.booking_custom_fields
    );
  } else if (business?.customer_unique_key_field) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("custom_fields")
      .eq("business_id", params.businessId)
      .eq("customer_id", params.customerId)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    uniqueKey = resolveUniqueKey(
      appointment?.custom_fields,
      business.customer_unique_key_field,
      business.booking_custom_fields
    );
  }

  let lines = params.lines;
  if ((!lines || lines.length === 0) && appointmentId) {
    lines = await buildLinesFromAppointment(appointmentId);
  }
  lines = lines ?? [];

  if (jobId) {
    const { data: existingDraft } = await supabase
      .from("invoices")
      .select("id")
      .eq("job_id", jobId)
      .eq("status", "draft")
      .maybeSingle();
    if (existingDraft) {
      return { success: true as const, invoiceId: existingDraft.id };
    }
  }

  const totals = calcTotals(lines, params.discountAmount ?? 0);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      appointment_id: appointmentId,
      job_id: jobId,
      currency: business?.currency ?? "LKR",
      notes: params.notes ?? null,
      customer_unique_key: uniqueKey?.value ?? null,
      customer_unique_key_label: uniqueKey?.label ?? null,
      ...totals,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Failed to create invoice" };
  }

  if (lines.length > 0) {
    const { error: itemsError } = await supabase.from("invoice_items").insert(
      lines.map((line, index) => ({
        invoice_id: invoice.id,
        service_id: line.service_id ?? null,
        description: line.description.trim() || "Item",
        quantity: Number(line.quantity) || 1,
        unit_price: Number(line.unit_price) || 0,
        cost_price: Number(line.cost_price) || 0,
        sort_order: line.sort_order ?? index,
      }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  await rememberInvoiceLinePresets(supabase, params.businessId, lines);

  revalidatePath(`/dashboard/${params.businessId}/billing`);
  revalidatePath(`/dashboard/${params.businessId}/jobs`);
  if (jobId) revalidatePath(`/dashboard/${params.businessId}/jobs/${jobId}`);
  revalidatePath(`/dashboard/${params.businessId}/customers`);
  return { success: true as const, invoiceId: invoice.id };
}

export async function upsertDraftInvoiceItems(
  invoiceId: string,
  businessId: string,
  lines: InvoiceLineInput[],
  options?: { discountAmount?: number; notes?: string | null; customerId?: string }
) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase } = gate;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, business_id")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "draft") {
    return { error: "Only draft invoices can be edited" };
  }

  if (!lines.length) return { error: "Add at least one line item" };

  const totals = calcTotals(lines, options?.discountAmount ?? 0);

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    lines.map((line, index) => ({
      invoice_id: invoiceId,
      service_id: line.service_id ?? null,
      description: line.description.trim() || "Item",
      quantity: Number(line.quantity) || 1,
      unit_price: Number(line.unit_price) || 0,
      cost_price: Number(line.cost_price) || 0,
      sort_order: line.sort_order ?? index,
    }))
  );
  if (itemsError) return { error: itemsError.message };

  const update: Record<string, unknown> = { ...totals };
  if (options?.notes !== undefined) update.notes = options.notes;
  if (options?.customerId) update.customer_id = options.customerId;

  const { error } = await supabase
    .from("invoices")
    .update(update)
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  await rememberInvoiceLinePresets(supabase, businessId, lines);

  revalidatePath(`/dashboard/${businessId}/billing`);
  revalidatePath(`/dashboard/${businessId}/billing/${invoiceId}`);
  return { success: true };
}

export async function issueInvoice(invoiceId: string, businessId: string) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_items ( id )")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "draft") return { error: "Invoice is not a draft" };

  const items = Array.isArray(invoice.invoice_items) ? invoice.invoice_items : [];
  if (items.length === 0) return { error: "Add at least one line item before issuing" };

  const { data: number, error } = await supabase.rpc("issue_invoice_number", {
    p_invoice_id: invoiceId,
  });

  if (error) return { error: error.message };

  if (invoice.job_id) {
    await appendJobEvent(supabase, {
      jobId: invoice.job_id,
      businessId,
      actorUserId: user?.id,
      eventType: "invoice_issued",
      message: `Invoice ${number} issued`,
      visibility: "public",
      metadata: { invoice_id: invoiceId, invoice_number: number },
    });
  }

  revalidatePath(`/dashboard/${businessId}/billing`);
  revalidatePath(`/dashboard/${businessId}/billing/${invoiceId}`);
  revalidatePath("/my-appointments");
  revalidatePath("/my-invoices");
  revalidatePath(`/my-invoices/${invoiceId}`);
  return { success: true, invoiceNumber: number as string };
}

export async function voidInvoice(invoiceId: string, businessId: string) {
  const gate = await requireMember(businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, job_id, invoice_number")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "void") return { error: "Invoice is already void" };
  if (invoice.status === "paid") return { error: "Paid invoices cannot be voided" };

  const { error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  if (invoice.job_id) {
    await appendJobEvent(supabase, {
      jobId: invoice.job_id,
      businessId,
      actorUserId: user?.id,
      eventType: "status_changed",
      message: `Invoice ${invoice.invoice_number ?? "draft"} voided`,
      visibility: "public",
      metadata: { invoice_id: invoiceId },
    });
  }

  revalidatePath(`/dashboard/${businessId}/billing`);
  revalidatePath(`/dashboard/${businessId}/billing/${invoiceId}`);
  revalidatePath("/my-appointments");
  revalidatePath("/my-invoices");
  revalidatePath(`/my-invoices/${invoiceId}`);
  return { success: true };
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  businessId: string;
  amount: number;
  method: InvoicePaymentMethod;
  note?: string | null;
  paidAt?: string | null;
}) {
  const gate = await requireMember(params.businessId);
  if (gate.error) return { error: gate.error };
  const { supabase, user } = gate;

  const amount = roundMoney(Number(params.amount));
  if (!(amount > 0)) return { error: "Payment amount must be greater than zero" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", params.invoiceId)
    .eq("business_id", params.businessId)
    .single();

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "issued" && invoice.status !== "paid") {
    return { error: "Only issued invoices can receive payments" };
  }

  const { error: payError } = await supabase.from("invoice_payments").insert({
    invoice_id: params.invoiceId,
    amount,
    method: params.method,
    note: params.note ?? null,
    paid_at: params.paidAt ?? new Date().toISOString(),
    recorded_by: user?.id ?? null,
  });

  if (payError) return { error: payError.message };

  const amountPaid = roundMoney(Number(invoice.amount_paid) + amount);
  const fullyPaid = amountPaid >= Number(invoice.total) - 0.001;
  const { error } = await supabase
    .from("invoices")
    .update({
      amount_paid: amountPaid,
      status: fullyPaid ? "paid" : "issued",
      paid_at: fullyPaid ? new Date().toISOString() : invoice.paid_at,
    })
    .eq("id", params.invoiceId);

  if (error) return { error: error.message };

  if (invoice.job_id) {
    await appendJobEvent(supabase, {
      jobId: invoice.job_id,
      businessId: params.businessId,
      actorUserId: user?.id,
      eventType: "payment_recorded",
      message: fullyPaid
        ? `Payment of ${amount} recorded — invoice paid`
        : `Partial payment of ${amount} recorded`,
      visibility: "public",
      metadata: {
        invoice_id: params.invoiceId,
        amount,
        method: params.method,
      },
    });
  }

  revalidatePath(`/dashboard/${params.businessId}/billing`);
  revalidatePath(`/dashboard/${params.businessId}/billing/${params.invoiceId}`);
  revalidatePath("/my-appointments");
  revalidatePath("/my-invoices");
  revalidatePath(`/my-invoices/${params.invoiceId}`);
  return { success: true };
}
