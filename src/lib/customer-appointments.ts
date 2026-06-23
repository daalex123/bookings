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
};
