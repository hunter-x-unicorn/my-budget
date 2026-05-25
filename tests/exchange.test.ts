import { describe, expect, it } from "vitest";
import { convertToBase } from "../convex/lib/exchange";

describe("convertToBase", () => {
  it("converts using NBRB scale and rate", () => {
    expect(convertToBase(100, 1, 2.7506)).toBe(275.06);
    expect(convertToBase(100, 100, 3.5)).toBe(3.5);
  });
});
