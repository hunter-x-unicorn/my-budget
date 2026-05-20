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

    const currencyRows = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const currencyById = new Map(currencyRows.map((c) => [c._id, c]));

    const tagRows = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tagNameById = new Map(tagRows.map((t) => [t._id, t.name]));

    const transactions = rows.map((row) => {
      const legacyName =
        "category" in row && typeof row.category === "string" ? row.category : undefined;
      const currency = row.currencyId ? currencyById.get(row.currencyId) : undefined;
      const tagNames =
        row.tagIds
          ?.map((id) => tagNameById.get(id))
          .filter((n): n is string => n !== undefined) ?? undefined;

      return {
        _id: row._id,
        _creationTime: row._creationTime,
        userId: row.userId,
        type: row.type,
        amount: row.amount,
        categoryId: row.categoryId,
        categoryName:
          row.type === "transfer"
            ? "Перевод"
            : row.categoryId
              ? (nameById.get(row.categoryId) ?? "—")
              : (legacyName ?? "—"),
        currencyId: row.currencyId,
        currencyCode: currency?.code,
        currencySymbol: currency?.symbol,
        tagNames: tagNames?.length ? tagNames : undefined,
        note: row.note,
        date: row.date,
      };
    });

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
