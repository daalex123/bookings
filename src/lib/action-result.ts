export type ActionResult =
  | { success: boolean; message?: string }
  | { error: string | Record<string, string[]> }
  | { token: string }
  | { businessId: string }
  | void
  | undefined;

export function formatActionError(
  error: string | Record<string, string[]>,
  fallback = "Something went wrong"
): string {
  if (typeof error === "string") return error;
  const messages = Object.values(error).flat();
  return messages[0] ?? fallback;
}

export function hasActionError(
  result: ActionResult
): result is { error: string | Record<string, string[]> } {
  return Boolean(
    result && typeof result === "object" && "error" in result && result.error
  );
}
