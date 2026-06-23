"use client";

import type { ReactNode } from "react";
import { useActionToast, type ToastMessages } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

export function ActionForm({
  action,
  messages,
  children,
  className,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  messages: ToastMessages;
  children: ReactNode;
  className?: string;
  onSuccess?: () => void;
}) {
  const { wrapFormAction } = useActionToast();
  const wrapped = wrapFormAction(action, messages, onSuccess);

  return (
    <form action={wrapped} className={className}>
      {children}
    </form>
  );
}
