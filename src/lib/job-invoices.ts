export type LinkedInvoice = {
  id: string;
  job_id: string | null;
  appointment_id: string | null;
  invoice_number: string | null;
  status: string;
  total: number;
  currency: string;
};

export function invoicesMatchingJob(
  invoices: LinkedInvoice[],
  job: { id: string; appointment_id: string }
): LinkedInvoice[] {
  const seen = new Set<string>();
  const matched: LinkedInvoice[] = [];
  for (const invoice of invoices) {
    if (seen.has(invoice.id)) continue;
    if (invoice.job_id === job.id || invoice.appointment_id === job.appointment_id) {
      seen.add(invoice.id);
      matched.push(invoice);
    }
  }
  return matched;
}

export function formatJobNumber(jobNumber: string | null | undefined, jobId: string) {
  return jobNumber?.trim() || `JOB-${jobId.slice(0, 8).toUpperCase()}`;
}
