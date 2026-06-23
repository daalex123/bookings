"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Clock,
  Pencil,
  Plus,
  Scissors,
  Search,
  Timer,
} from "lucide-react";
import { DeleteServiceButton } from "@/components/dashboard/delete-service-button";
import { PageHeader } from "@/components/dashboard/page-header";
import { ServiceForm, type ServiceFormValues } from "@/components/dashboard/service-form";
import { StatCard } from "@/components/dashboard/stat-card";
import { useActionToast } from "@/hooks/use-action-toast";
import { hasActionError, type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Service = ServiceFormValues & { id: string };

type Filter = "all" | "active" | "inactive";

export function ServicesPanel({
  services,
  currency,
  businessId,
  saveAction,
  deleteAction,
}: {
  services: Service[];
  currency: string;
  businessId: string;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { wrapFormAction } = useActionToast();

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

  const activeCount = services.filter((s) => s.is_active).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => {
      if (filter === "active" && !service.is_active) return false;
      if (filter === "inactive" && service.is_active) return false;
      if (!q) return true;
      return (
        service.name.toLowerCase().includes(q) ||
        (service.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [services, query, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "inactive", label: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage what customers can book — duration and slot interval control available times"
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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total services" value={services.length} icon={Scissors} />
        <StatCard label="Active on booking page" value={activeCount} icon={Timer} />
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

              return (
                <div key={service.id} className="px-4 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
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
                            <Scissors className="h-5 w-5" strokeWidth={1.75} />
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
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8b92a5]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {service.duration_minutes} min
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Timer className="h-3.5 w-3.5" />
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
              <Scissors className="h-6 w-6" strokeWidth={1.75} />
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
