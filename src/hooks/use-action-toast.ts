"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useActionLoading } from "@/providers/action-loading-provider";
import {
  formatActionError,
  hasActionError,
  type ActionResult,
} from "@/lib/action-result";

export type ToastMessages = {
  loading: string;
  success: string;
  error?: string;
};

function resolveSuccessMessage(
  result: ActionResult,
  fallback: string
): string {
  if (result && typeof result === "object" && "token" in result) {
    return "Booking link regenerated";
  }
  if (result && typeof result === "object" && "message" in result && result.message) {
    return result.message;
  }
  return fallback;
}

export function useActionToast() {
  const router = useRouter();
  const { show: showLoader, hide: hideLoader } = useActionLoading();

  const runWithToast = useCallback(
    async (
      action: () => Promise<ActionResult>,
      messages: ToastMessages,
      onSuccess?: () => void
    ) => {
      showLoader(messages.loading);
      try {
        const result = await action();

        if (hasActionError(result)) {
          toast.error(formatActionError(result.error, messages.error));
          return { success: false as const };
        }

        toast.success(resolveSuccessMessage(result, messages.success));
        onSuccess?.();
        router.refresh();
        return { success: true as const, result };
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : messages.error ?? "Something went wrong"
        );
        return { success: false as const };
      } finally {
        hideLoader();
      }
    },
    [router, showLoader, hideLoader]
  );

  const wrapFormAction = useCallback(
    (
      action: (formData: FormData) => Promise<ActionResult>,
      messages: ToastMessages,
      onSuccess?: () => void
    ) => {
      return async (formData: FormData) => {
        await runWithToast(() => action(formData), messages, onSuccess);
      };
    },
    [runWithToast]
  );

  const wrapAction = useCallback(
    (
      action: () => Promise<ActionResult>,
      messages: ToastMessages,
      onSuccess?: () => void
    ) => {
      return async () => {
        await runWithToast(action, messages, onSuccess);
      };
    },
    [runWithToast]
  );

  return { wrapFormAction, wrapAction, runWithToast };
}
