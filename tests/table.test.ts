import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { buildSummary, buildTableForMonth } from "../convex/transactions/table";

const categoryId = "jd7abc123" as Id<"categories">;

function tx(
  partial: Partial<{ date: number }> & {
    type: "income" | "expense";
    amount: number;
  },
) {
  return {
    _id: "tx1" as Id<"transactions">,
    _creationTime: 0,
    userId: "user1" as Id<"users">,
    categoryId,
    date: partial.date ?? new Date(2026, 2, 10, 12).getTime(),
    type: partial.type,
    amount: partial.amount,
  };
}

describe("buildSummary", () => {
  it("computes balance", () => {
    const summary = buildSummary([
      tx({ type: "income", amount: 1000 }),
      tx({ type: "expense", amount: 400 }),
    ]);
    expect(summary).toEqual({ income: 1000, expense: 400, balance: 600 });
  });
});

describe("buildTableForMonth", () => {
  it("aggregates cells by category and day", () => {
    const day = new Date(2026, 2, 10, 12).getTime();
    const { cells } = buildTableForMonth(2026, 2, [
      tx({ type: "expense", amount: 50, date: day }),
      tx({ type: "expense", amount: 30, date: day }),
    ]);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      categoryId,
      date: "2026-2-10",
      income: 0,
      expense: 80,
    });
  });
});
