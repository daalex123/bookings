"use client";

import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function RegenerateLinkButton({
  action,
}: {
  action: () => Promise<ActionResult>;
}) {
  const { wrapAction } = useActionToast();
  const handleClick = wrapAction(action, {
    loading: "Regenerating booking link…",
    success: "Booking link regenerated",
    error: "Could not regenerate link",
  });

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Regenerate link
    </Button>
  );
}
