import {
  deleteService,
  linkServiceExtra,
  reorderServiceExtras,
  reorderServices,
  unlinkServiceExtra,
  upsertService,
} from "@/lib/actions";
import { ServicesPanel } from "@/components/dashboard/services-panel";
import type { ServiceExtraItem } from "@/components/dashboard/service-extras-editor";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();

  const [{ data: services }, { data: business }, { data: extraLinks }, { data: staffServices }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order")
        .order("name"),
      supabase
        .from("businesses")
        .select("currency")
        .eq("id", businessId)
        .single(),
      supabase
        .from("service_extra_links")
        .select("parent_service_id, child_service_id, sort_order"),
      supabase
        .from("staff_services")
        .select("service_id, member_id, business_members ( staff_name, profiles ( full_name ) )")
    ]);

  const currency = business?.currency ?? "LKR";

  // Build service_id -> staff names map
  const staffByService: Record<string, string[]> = {};
  for (const ss of staffServices ?? []) {
    const member = ss.business_members as any;
    const name = member?.staff_name || (Array.isArray(member?.profiles) ? member.profiles[0]?.full_name : member?.profiles?.full_name) || null;
    if (!name) continue;
    if (!staffByService[ss.service_id]) staffByService[ss.service_id] = [];
    staffByService[ss.service_id].push(name);
  }

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

  async function saveOrder(formData: FormData) {
    "use server";
    return reorderServices(businessId, formData);
  }

  async function linkExtra(formData: FormData) {
    "use server";
    return linkServiceExtra(businessId, formData);
  }

  async function unlinkExtra(formData: FormData) {
    "use server";
    return unlinkServiceExtra(businessId, formData);
  }

  async function reorderExtras(formData: FormData) {
    "use server";
    return reorderServiceExtras(businessId, formData);
  }

  const normalizedServices =
    services?.map((service) => ({
      id: service.id,
      parent_service_id: service.parent_service_id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      slot_interval_minutes:
        service.slot_interval_minutes ?? service.duration_minutes,
      price: Number(service.price),
      cost_price: Number((service as { cost_price?: number }).cost_price ?? 0),
      image_url: service.image_url,
      is_active: service.is_active,
      show_price: service.show_price ?? true,
      sort_order: service.sort_order ?? 0,
    })) ?? [];

  const primaryServices = normalizedServices.filter((s) => !s.parent_service_id);
  const addonServices = normalizedServices.filter((s) => s.parent_service_id);

  const serviceById = new Map(normalizedServices.map((s) => [s.id, s]));

  const linkedExtras: ServiceExtraItem[] = [];

  for (const link of extraLinks ?? []) {
    const child = serviceById.get(link.child_service_id);
    if (!child || child.parent_service_id) continue;
    linkedExtras.push({
      id: child.id,
      parent_service_id: link.parent_service_id,
      name: child.name,
      description: child.description,
      price: child.price,
      cost_price: child.cost_price,
      image_url: child.image_url,
      is_active: child.is_active,
      show_price: child.show_price,
      is_linked: true,
      sort_order: link.sort_order ?? 0,
    });
  }

  const inlineExtras: ServiceExtraItem[] = addonServices.map((addon) => ({
    id: addon.id,
    parent_service_id: addon.parent_service_id!,
    name: addon.name,
    description: addon.description,
    price: addon.price,
    cost_price: addon.cost_price,
    image_url: addon.image_url,
    is_active: addon.is_active,
    show_price: addon.show_price,
    is_linked: false,
    sort_order: addon.sort_order ?? 0,
  }));

  const allExtras = [...inlineExtras, ...linkedExtras];

  const linkableServices = primaryServices.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    show_price: s.show_price,
  }));

  return (
    <ServicesPanel
      services={primaryServices}
      extrasByParent={allExtras}
      linkableServices={linkableServices}
      currency={currency}
      businessId={businessId}
      staffByService={staffByService}
      saveAction={saveService}
      deleteAction={removeService}
      reorderAction={saveOrder}
      linkExtraAction={linkExtra}
      unlinkExtraAction={unlinkExtra}
      reorderExtrasAction={reorderExtras}
    />
  );
}
