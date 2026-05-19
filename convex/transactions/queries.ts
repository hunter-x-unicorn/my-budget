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

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const nameById = new Map(categories.map((c) => [c._id, c.name]));

    const transactions = rows.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      userId: row.userId,
      type: row.type,
      amount: row.amount,
      categoryId: row.categoryId,
      categoryName: nameById.get(row.categoryId) ?? "—",
      note: row.note,
      date: row.date,
    }));

    return {
      transactions,
      summary: buildSummary(rows),
      table: buildTableForMonth(year, month, rows),
    };
  },
});
