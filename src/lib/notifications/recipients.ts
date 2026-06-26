/** Exclude users who should not receive a notification (e.g. the actor). */
export function excludeUserIds(
  userIds: string[],
  ...exclude: (string | null | undefined)[]
): string[] {
  const blocked = new Set(
    exclude.filter((id): id is string => Boolean(id))
  );
  return userIds.filter((id) => !blocked.has(id));
}
