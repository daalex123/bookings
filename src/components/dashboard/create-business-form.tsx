"use client";

import { useRouter } from "next/navigation";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { AdminSelect } from "@/components/dashboard/admin-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
} from "@/lib/constants";

export function CreateBusinessForm({
  action,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const { runWithToast } = useActionToast();

  async function handleCreate(formData: FormData) {
    const outcome = await runWithToast(() => action(formData), {
      loading: "Creating business…",
      success: "Business created",
      error: "Could not create business",
    });

    if (
      outcome.success &&
      outcome.result &&
      "businessId" in outcome.result &&
      outcome.result.businessId
    ) {
      router.push(`/dashboard/${outcome.result.businessId}`);
    }
  }

  return (
    <form action={handleCreate} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="my-salon"
          pattern="[a-z0-9-]+"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <AdminSelect id="currency" name="currency" defaultValue={DEFAULT_CURRENCY}>
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <AdminSelect id="timezone" name="timezone" defaultValue={DEFAULT_TIMEZONE}>
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </AdminSelect>
        </div>
      </div>
      <SubmitButton className="rounded-full" pendingLabel="Creating…">
        Create business
      </SubmitButton>
    </form>
  );
}
