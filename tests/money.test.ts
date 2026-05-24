import { describe, expect, it } from "vitest";
import { parseAmountInput } from "../src/shared/lib/money";

describe("parseAmountInput", () => {
  it("accepts common formats", () => {
    expect(parseAmountInput("8")).toBe(8);
    expect(parseAmountInput("8,00")).toBe(8);
    expect(parseAmountInput("8.00")).toBe(8);
    expect(parseAmountInput("8,5")).toBe(8.5);
    expect(parseAmountInput("8,55")).toBe(8.55);
    expect(parseAmountInput(" 8,55 ")).toBe(8.55);
  });

  it("rejects invalid values", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("8,555")).toBeNull();
  });
});
