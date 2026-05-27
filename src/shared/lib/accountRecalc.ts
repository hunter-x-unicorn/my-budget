const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/** Red «!» if never recalculated or last recalc was over 2 weeks ago. */
export function accountNeedsRecalcWarning(
  lastRecalculatedAt: number | undefined,
): boolean {
  if (lastRecalculatedAt === undefined) return true;
  return Date.now() - lastRecalculatedAt > TWO_WEEKS_MS;
}
