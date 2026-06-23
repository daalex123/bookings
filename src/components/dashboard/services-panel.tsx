"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  ChevronDown,
  Clock,
  GripVertical,
  List,
  Package,
  Pencil,
  Plus,
  Search,
} from "@/lib/admin-icons";
import { DeleteServiceButton } from "@/components/dashboard/delete-service-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServiceForm, type ServiceFormValues } from "@/components/dashboard/service-form";
import type {
  LinkableService,
  ServiceExtraItem,
} from "@/components/dashboard/service-extras-editor";
import { StatCard } from "@/components/dashboard/stat-card";
import { useActionToast } from "@/hooks/use-action-toast";
import { hasActionError, type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Service = ServiceFormValues & { id: string; sort_order: number };

type Filter = "all" | "active" | "inactive";

export function ServicesPanel({
  services,
  extrasByParent,
  linkableServices,
  currency,
  businessId,
  saveAction,
  deleteAction,
  reorderAction,
  linkExtraAction,
  unlinkExtraAction,
  reorderExtrasAction,
}: {
  services: Service[];
  extrasByParent: ServiceExtraItem[];
  linkableServices: LinkableService[];
  currency: string;
  businessId: string;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
  linkExtraAction: (formData: FormData) => Promise<ActionResult>;
  unlinkExtraAction: (formData: FormData) => Promise<ActionResult>;
  reorderExtrasAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [orderedServices, setOrderedServices] = useState(services);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const { wrapFormAction } = useActionToast();

  useEffect(() => {
    setOrderedServices(services);
  }, [services]);

  const handleSaveExtra = useMemo(
    () =>
      wrapFormAction(
        async (formData) => {
          const result = await saveAction(formData);
          if (hasActionError(result)) return result;
          return { success: true, message: "Extra saved" };
        },
        {
          loading: "Saving extra…",
          success: "Extra saved",
          error: "Could not save extra",
        }
      ),
    [saveAction, wrapFormAction]
  );

  const handleSave = useMemo(
    () =>
      wrapFormAction(
        async (formData) => {
          const isCreate = !formData.get("id")?.toString();
          const result = await saveAction(formData);
          if (hasActionError(result)) return result;
          return {
            success: true,
            message: isCreate ? "Service created" : "Service updated",
          };
        },
        {
          loading: "Saving service…",
          success: "Service saved",
          error: "Could not save service",
        },
        () => {
          setShowAddForm(false);
          setEditingId(null);
        }
      ),
    [saveAction, wrapFormAction]
  );

  const extrasForParent = useMemo(() => {
    const map = new Map<string, ServiceExtraItem[]>();
    for (const extra of extrasByParent) {
      const list = map.get(extra.parent_service_id) ?? [];
      list.push(extra);
      map.set(extra.parent_service_id, list);
    }
    return map;
  }, [extrasByParent]);

  const activeCount = services.filter((s) => s.is_active).length;
  const extraCount = extrasByParent.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedServices.filter((service) => {
      if (filter === "active" && !service.is_active) return false;
      if (filter === "inactive" && service.is_active) return false;
      if (!q) return true;
      return (
        service.name.toLowerCase().includes(q) ||
        (service.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [orderedServices, query, filter]);

  async function persistServiceOrder(next: Service[]) {
    const formData = new FormData();
    next.forEach((service) => formData.append("orderedIds", service.id));
    setReordering(true);
    const result = await reorderAction(formData);
    setReordering(false);
    if (result && "error" in result && result.error) {
      setOrderedServices(services);
      return;
    }
    setOrderedServices(next.map((service, index) => ({ ...service, sort_order: index })));
  }

  function handleServiceDrop(targetId: string) {
    if (!canReorder) return;
    if (!dragId || dragId === targetId) return;
    const current = [...orderedServices];
    const from = current.findIndex((s) => s.id === dragId);
    const to = current.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    setOrderedServices(current);
    void persistServiceOrder(current);
    setDragId(null);
  }

  const canReorder = filter === "all" && !query.trim();

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Drag to set booking page order · edit a service to manage extras"
        action={
          <Button
            type="button"
            className="rounded-full"
            onClick={() => {
              setShowAddForm((open) => !open);
              setEditingId(null);
            }}
          >
            <Plus className="h-4 w-4" />
            {showAddForm ? "Close" : "Add service"}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Primary services" value={services.length} icon={Package} />
        <StatCard label="Additional services" value={extraCount} icon={List} />
        <StatCard label="Active on booking page" value={activeCount} icon={Calendar} />
      </div>

      {showAddForm && (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[#1e2235]/8 px-6 py-5">
            <h2 className="text-lg font-bold text-[#1e2235]">New service</h2>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Add a bookable service with pricing and scheduling rules
            </p>
          </div>
          <div className="p-6">
            <ServiceForm
              action={handleSave}
              businessId={businessId}
              currency={currency}
              submitLabel="Create service"
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      <div className="admin-card overflow-hidden">
        <div className="border-b border-[#1e2235]/8 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1e2235]">Your services</h2>
              <p className="mt-1 text-sm text-[#8b92a5]">
                {filtered.length} of {services.length} shown
                {reordering ? " · saving order…" : ""}
              </p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b92a5]" />
              <input
                type="search"
                placeholder="Search services…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-[#1e2235]/10 bg-[#f0f2f5]/60 pl-10 pr-4 text-sm text-[#1e2235] placeholder:text-[#8b92a5] focus:border-[#1e2235]/20 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e2235]/10"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  filter === item.id
                    ? "bg-[#1e2235] text-white"
                    : "bg-[#f0f2f5] text-[#8b92a5] hover:text-[#1e2235]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-[#1e2235]/6">
            {filtered.map((service) => {
              const isEditing = editingId === service.id;
              const interval =
                service.slot_interval_minutes ?? service.duration_minutes;
              const serviceExtras = extrasForParent.get(service.id) ?? [];

              return (
                <div
                  key={service.id}
                  draggable={canReorder && !isEditing && !reordering}
                  onDragStart={() => setDragId(service.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleServiceDrop(service.id)}
                  className={cn(
                    "px-4 py-5 sm:px-6",
                    dragId === service.id && "opacity-50"
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <button
                        type="button"
                        className={cn(
                          "mt-1 hidden shrink-0 text-[#8b92a5] sm:block",
                          canReorder ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-30"
                        )}
                        aria-label="Drag to reorder"
                      >
                        <GripVertical className="h-5 w-5" />
                      </button>

                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f0f2f5]">
                        {service.image_url ? (
                          <Image
                            src={service.image_url}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#8b92a5]">
                            <Package className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold text-[#1e2235]">
                            {service.name}
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              service.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-[#f0f2f5] text-[#8b92a5]"
                            )}
                          >
                            {service.is_active ? "Active" : "Hidden"}
                          </span>
                          {serviceExtras.length > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {serviceExtras.length} extra
                              {serviceExtras.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8b92a5]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {service.duration_minutes} min
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Every {interval} min
                          </span>
                          <span className="font-medium text-[#1e2235]">
                            {formatPrice(Number(service.price), currency)}
                          </span>
                        </div>

                        {service.description && !isEditing && (
                          <p className="mt-2 line-clamp-2 text-sm text-[#8b92a5]">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <div className="flex flex-wrap gap-2 lg:shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setEditingId(service.id);
                            setShowAddForm(false);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <DeleteServiceButton
                          action={deleteAction}
                          serviceId={service.id}
                          serviceName={service.name}
                        />
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-5 rounded-2xl border border-[#1e2235]/8 bg-[#f0f2f5]/40 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1e2235]">
                          Edit service
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 text-sm text-[#8b92a5] hover:text-[#1e2235]"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Collapse
                        </button>
                      </div>
                      <ServiceForm
                        action={handleSave}
                        businessId={businessId}
                        currency={currency}
                        values={service}
                        submitLabel="Save changes"
                        onCancel={() => setEditingId(null)}
                        extras={serviceExtras}
                        linkableServices={linkableServices}
                        saveExtraAction={handleSaveExtra}
                        deleteExtraAction={deleteAction}
                        linkExtraAction={linkExtraAction}
                        unlinkExtraAction={unlinkExtraAction}
                        reorderExtrasAction={reorderExtrasAction}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : services.length > 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[#8b92a5]">
            No services match your search or filter.
          </p>
        ) : (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f2f5] text-[#1e2235]">
              <Package className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <p className="mt-4 font-semibold text-[#1e2235]">No services yet</p>
            <p className="mt-1 text-sm text-[#8b92a5]">
              Add your first service so customers can start booking.
            </p>
            <Button
              type="button"
              className="mt-5 rounded-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add your first service
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
