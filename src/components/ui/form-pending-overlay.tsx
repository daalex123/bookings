"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useActionLoading } from "@/providers/action-loading-provider";

export function FormPendingOverlay({
  message = "Please wait…",
}: {
  message?: string;
}) {
  const { pending } = useFormStatus();
  const { show, hide } = useActionLoading();

  useEffect(() => {
    if (pending) {
      show(message);
      return () => hide();
    }
  }, [pending, message, show, hide]);

  return null;
}
