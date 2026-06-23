"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

export function DeleteAppointmentButton({
  action,
  appointmentId,
  label,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  appointmentId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const { wrapFormAction } = useActionToast();

  const wrappedAction = useMemo(
    () =>
      wrapFormAction(
        action,
        {
          loading: "Deleting appointment…",
          success: "Appointment deleted",
          error: "Could not delete appointment",
        },
        () => setOpen(false)
      ),
    [action, wrapFormAction]
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={wrappedAction}>
            <DialogHeader>
              <DialogTitle>Delete appointment?</DialogTitle>
              <DialogDescription>
                This will permanently remove the appointment for{" "}
                <span className="font-medium text-[#1e2235]">{label}</span>. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="id" value={appointmentId} />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton
                variant="destructive"
                className="rounded-full"
                pendingLabel="Deleting…"
              >
                Delete appointment
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
