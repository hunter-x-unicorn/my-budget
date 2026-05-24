import { ConvexError } from "convex/values";

export function normalizeEntityName(
  value: string,
  emptyMessage: string,
  tooLongMessage: string,
) {
  const trimmed = value.trim();
  if (!trimmed) throw new ConvexError(emptyMessage);
  if (trimmed.length > 40) throw new ConvexError(tooLongMessage);
  return trimmed;
}

export function hasCaseInsensitiveDuplicate<T>(
  rows: T[],
  getName: (row: T) => string,
  name: string,
  options?: { exclude?: (row: T) => boolean },
) {
  const normalized = name.toLowerCase();
  return rows.some((row) => {
    if (options?.exclude?.(row)) return false;
    return getName(row).toLowerCase() === normalized;
  });
}

export function nextOrder<T extends { order: number }>(rows: T[]) {
  return rows.reduce((max, row) => Math.max(max, row.order), -1) + 1;
}

export function assertValidReorder<T extends { _id: string }>(
  orderedIds: string[],
  rows: T[],
  invalidListMessage: string,
  notFoundMessage: string,
) {
  if (orderedIds.length !== rows.length) {
    throw new ConvexError(invalidListMessage);
  }

  const idSet = new Set(rows.map((row) => row._id));
  for (const id of orderedIds) {
    if (!idSet.has(id)) {
      throw new ConvexError(notFoundMessage);
    }
  }
}
