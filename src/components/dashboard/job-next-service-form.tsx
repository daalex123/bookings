"use client";

import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { useActionToast } from "@/hooks/use-action-toast";
import { saveJobNextService } from "@/lib/jobs";

export function JobNextServiceForm({
  businessId,
  jobId,
  cancelled,
  services,
  nextServiceId,
  nextServiceDueOn,
  nextServiceNotes,
  nextServiceVisible,
}: {
  businessId: string;
  jobId: string;
  cancelled: boolean;
  services: { id: string; name: string }[];
  nextServiceId: string | null;
  nextServiceDueOn: string | null;
  nextServiceNotes: string | null;
  nextServiceVisible: boolean;
}) {
  const { wrapFormAction } = useActionToast();
  const onSave = wrapFormAction(
    async (formData) => {
      const serviceId = formData.get("next_service_id")?.toString() || null;
      return saveJobNextService(jobId, businessId, {
        nextServiceId: serviceId,
        dueOn: formData.get("next_service_due_on")?.toString() || null,
        notes: formData.get("next_service_notes")?.toString() || null,
        visibleToCustomer: formData.get("next_service_visible") === "on",
      });
    },
    { loading: "Saving…", success: "Next service updated" }
  );

  return (
    <section className="rounded-2xl border border-[#1e2235]/10 bg-white p-5">
      <h2 className="text-sm font-semibold text-[#1e2235]">Next service</h2>
      <p className="mt-1 text-xs text-[#8b92a5]">
        Recommend a follow-up. Tick the box to show it on the customer’s visit
        history.
      </p>
      <form action={onSave} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="next_service_id">Recommended service</Label>
          <AdminSelect
            id="next_service_id"
            name="next_service_id"
            defaultValue={nextServiceId ?? ""}
            disabled={cancelled}
          >
            <option value="">None</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_service_due_on">Due date</Label>
          <Input
            id="next_service_due_on"
            name="next_service_due_on"
            type="date"
            defaultValue={nextServiceDueOn ?? ""}
            disabled={cancelled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_service_notes">Notes</Label>
          <Textarea
            id="next_service_notes"
            name="next_service_notes"
            rows={2}
            defaultValue={nextServiceNotes ?? ""}
            disabled={cancelled}
            placeholder="e.g. Replace brake pads, or service at 10,000 km"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="next_service_visible"
            defaultChecked={nextServiceVisible}
            disabled={cancelled}
            className="h-4 w-4 rounded border-[#1e2235]/20"
          />
          Show this next service to the customer
        </label>
        {!cancelled && <SubmitButton>Save next service</SubmitButton>}
      </form>
    </section>
  );
}
