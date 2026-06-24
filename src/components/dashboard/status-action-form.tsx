"use client";

import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonProps } from "@/components/ui/button";

const STATUS_MESSAGES: Record<
  string,
  { loading: string; success: string }
> = {
  confirmed: {
    loading: "Confirming appointment…",
    success: "Appointment confirmed",
  },
  completed: {
    loading: "Completing appointment…",
    success: "Appointment completed",
  },
  no_show: {
    loading: "Updating appointment…",
    success: "Marked as no show",
  },
  cancelled: {
    loading: "Cancelling appointment…",
    success: "Appointment cancelled",
  },
};

export function StatusActionForm({
  action,
  appointmentId,
  status,
  children,
  buttonProps,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  appointmentId: string;
  status: string;
  children: React.ReactNode;
  buttonProps?: ButtonProps;
}) {
  const { wrapFormAction } = useActionToast();
  const messages = STATUS_MESSAGES[status] ?? {
    loading: "Updating status…",
    success: "Status updated",
  };
  const wrapped = wrapFormAction(action, messages);

  return (
    <form action={wrapped}>
      <FormPendingOverlay message={messages.loading} />
      <input type="hidden" name="id" value={appointmentId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton size="sm" className="rounded-full" pendingLabel="Updating…" {...buttonProps}>
        {children}
      </SubmitButton>
    </form>
  );
}
