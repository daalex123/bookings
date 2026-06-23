import { asJoined } from "@/lib/utils";

type AddonJoinRow = {
  services: { name: string } | { name: string }[] | null;
};

export function mapAddonNames(
  rows: AddonJoinRow[] | null | undefined
): string[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => asJoined(row.services)?.name)
    .filter((name): name is string => Boolean(name));
}
