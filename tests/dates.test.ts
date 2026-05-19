import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import {
  assertMonthArgs,
  datesInMonth,
  dayKeyFromTimestamp,
  monthRange,
  toDayKey,
} from "../convex/lib/dates";

describe("toDayKey", () => {
  it("uses 0-based month", () => {
    expect(toDayKey(2026, 2, 15)).toBe("2026-2-15");
  });
});

describe("assertMonthArgs", () => {
  it("rejects invalid month", () => {
    expect(() => assertMonthArgs(2026, 12)).toThrow(ConvexError);
  });
});

describe("monthRange", () => {
  it("covers full January 2026 in local time", () => {
    const { start, end } = monthRange(2026, 0);
    expect(new Date(start).getMonth()).toBe(0);
    expect(new Date(end).getMonth()).toBe(0);
    expect(new Date(end).getDate()).toBe(31);
  });
});

describe("datesInMonth", () => {
  it("returns 28 days for Feb 2026", () => {
    expect(datesInMonth(2026, 1)).toHaveLength(28);
    expect(datesInMonth(2026, 1)[0]).toBe("2026-1-1");
  });
});

describe("dayKeyFromTimestamp", () => {
  it("matches toDayKey for local noon", () => {
    const ts = new Date(2026, 2, 15, 12, 0, 0).getTime();
    expect(dayKeyFromTimestamp(ts)).toBe(toDayKey(2026, 2, 15));
  });
});
