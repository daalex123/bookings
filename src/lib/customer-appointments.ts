export type CustomerAppointmentItem = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: string;
  notes: string | null;
  business_name: string;
  business_slug: string;
  service_name: string;
  addon_names: string[];
  job_status?: string | null;
  job_number?: string | null;
  job_id?: string | null;
  invoice_status?: string | null;
  invoice_number?: string | null;
  next_service_name?: string | null;
  next_service_due_on?: string | null;
  next_service_notes?: string | null;
};

export function isUpcomingAppointment(appt: CustomerAppointmentItem): boolean {
  if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "no_show") {
    return false;
  }
  if (appt.job_status === "in_progress" || appt.job_status === "completed") {
    return appt.job_status === "in_progress";
  }
  return new Date(appt.start_at).getTime() >= Date.now() - 60 * 60 * 1000;
}

export function isHistoryAppointment(appt: CustomerAppointmentItem): boolean {
  return !isUpcomingAppointment(appt);
}
