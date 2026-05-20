import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOptionalUserId } from "../lib/auth";
import { monthRange } from "../lib/dates";
import {
  monthArgs,
  summaryValidator,
  tableCellValidator,
  transactionRowValidator,
} from "../lib/validators";
import { enrichTransactionRows } from "./mapRows";
import { buildSummary, buildTableForMonth } from "./table";

export const monthBundle = query({
  args: monthArgs,
  returns: v.object({
    transactions: v.array(transactionRowValidator),
    summary: summaryValidator,
    table: v.object({
      dates: v.array(v.string()),
      cells: v.array(tableCellValidator),
    }),
  }),
  handler: async (ctx, { year, month }) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) {
      return {
        transactions: [],
        summary: { income: 0, expense: 0, balance: 0 },
        table: { dates: [], cells: [] },
      };
    }

    const { start, end } = monthRange(year, month);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .order("desc")
      .collect();

    const transactions = await enrichTransactionRows(ctx, userId, rows);

    const tableRows = rows.filter(
      (
        row,
      ): row is typeof row & { categoryId: NonNullable<typeof row.categoryId> } =>
        row.categoryId !== undefined && row.type !== "transfer",
    );

    return {
      transactions,
      summary: buildSummary(rows),
      table: buildTableForMonth(year, month, tableRows),
    };
  },
});

/** All operations for history (newest first). */
export const historyList = query({
  args: {},
  returns: v.array(transactionRowValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(2000);

    return await enrichTransactionRows(ctx, userId, rows);
  },
});
