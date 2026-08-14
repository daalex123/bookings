"use client";

import { useMemo, useRef } from "react";
import { Trash2 } from "lucide-react";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { FormPendingOverlay } from "@/components/ui/form-pending-overlay";
import { Button } from "@/components/ui/button";

export function DeleteBusinessButton({
    action,
    businessId,
    businessName,
}: {
    action: (formData: FormData) => Promise<ActionResult>;
    businessId: string;
    businessName: string;
}) {
    const formRef = useRef<HTMLFormElement>(null);
    const { wrapFormAction } = useActionToast();

    const wrappedAction = useMemo(
        () =>
            wrapFormAction(action, {
                loading: "Deleting business…",
                success: "Business deleted",
                error: "Could not delete business",
            }),
        [action, wrapFormAction]
    );

    return (
        <form ref={formRef} action={wrappedAction} className="w-full">
            <FormPendingOverlay message="Deleting business…" />
            <input type="hidden" name="id" value={businessId} />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full rounded-lg border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                onClick={() => {
                    const confirmed = window.confirm(
                        `Delete "${businessName}"? This permanently removes services, appointments, and related data.`
                    );
                    if (confirmed) formRef.current?.requestSubmit();
                }}
            >
                <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                Delete
            </Button>
        </form>
    );
}
