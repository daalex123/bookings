"use client";

import { useMemo, useRef } from "react";
import { Trash2 } from "@/lib/admin-icons";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function DeleteServiceButton({
  action,
  serviceId,
  serviceName,
  iconOnly = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  serviceId: string;
  serviceName: string;
  iconOnly?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { wrapFormAction } = useActionToast();

  const wrappedAction = useMemo(
    () =>
      wrapFormAction(action, {
        loading: "Deleting service…",
        success: "Service deleted",
        error: "Could not delete service",
      }),
    [action, wrapFormAction]
  );

  return (
    <form ref={formRef} action={wrappedAction}>
      <input type="hidden" name="id" value={serviceId} />
      <Button
        type="button"
        variant={iconOnly ? "ghost" : "outline"}
        size="sm"
        className={
          iconOnly
            ? "text-red-600 hover:bg-red-50 hover:text-red-700"
            : "rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        }
        onClick={() => {
          const confirmed = window.confirm(
            `Delete "${serviceName}"? This cannot be undone.`
          );
          if (confirmed) formRef.current?.requestSubmit();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!iconOnly && "Delete"}
      </Button>
    </form>
  );
}
