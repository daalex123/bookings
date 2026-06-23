import { deleteService, upsertService } from "@/lib/actions";
import { ServicesPanel } from "@/components/dashboard/services-panel";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const [{ data: services }, { data: business }] = await Promise.all([
    supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("businesses")
      .select("currency")
      .eq("id", businessId)
      .single(),
  ]);

  const currency = business?.currency ?? "LKR";

  async function saveService(formData: FormData) {
    "use server";
    return upsertService(businessId, formData);
  }

  async function removeService(formData: FormData) {
    "use server";
    const id = formData.get("id")?.toString();
    if (!id) return { error: "Missing service id" };
    return deleteService(businessId, id);
  }

  const normalizedServices =
    services?.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      slot_interval_minutes:
        service.slot_interval_minutes ?? service.duration_minutes,
      price: Number(service.price),
      image_url: service.image_url,
      is_active: service.is_active,
    })) ?? [];

  return (
    <ServicesPanel
      services={normalizedServices}
      currency={currency}
      businessId={businessId}
      saveAction={saveService}
      deleteAction={removeService}
    />
  );
}
