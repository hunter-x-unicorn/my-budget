import { describe, expect, it } from "vitest";

/** Mirror of convex/exchangeRates.ts nbrbOnDateParam (local midnight). */
function nbrbOnDateParam(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month, day).toUTCString();
}

describe("nbrbOnDateParam", () => {
  it("uses local midnight, not noon", () => {
    const fromNoon = new Date(2026, 4, 24, 12, 0, 0, 0).toUTCString();
    const fromMidnight = nbrbOnDateParam("2026-4-24");
    expect(fromMidnight).not.toBe(fromNoon);
    expect(fromMidnight).toBe(new Date(2026, 4, 24).toUTCString());
  });
});
