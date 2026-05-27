import { v } from "convex/values";
import { query } from "../_generated/server";
import { dailyAccountBalanceForMonth } from "../lib/accountSnapshots";
import { getOptionalUserId } from "../lib/auth";
import { datesInMonth, dayKeyFromTimestamp, monthRange } from "../lib/dates";
import { amountForAggregation } from "../lib/exchange";
import { addMoney } from "../lib/money";
import { monthArgs, summaryValidator } from "../lib/validators";
import { buildSummary } from "./table";

const sliceValidator = v.object({
  name: v.string(),
  value: v.number(),
});

export const bundle = query({
  args: monthArgs,
  returns: v.object({
    summary: summaryValidator,
    expenseByCategory: v.array(sliceValidator),
    incomeByCategory: v.array(sliceValidator),
    expenseByTag: v.array(sliceValidator),
    dailyBalance: v.array(
      v.object({ date: v.string(), income: v.number(), expense: v.number() }),
    ),
    dailyAccountBalance: v.array(v.number()),
  }),
  handler: async (ctx, { year, month }) => {
    const userId = await getOptionalUserId(ctx);
    const monthDates = datesInMonth(year, month);
    const emptyDaily = monthDates.map((date) => ({
      date,
      income: 0,
      expense: 0,
    }));
    const flatAccount = monthDates.map(() => 0);

    if (userId === null) {
      return {
        summary: { income: 0, expense: 0, balance: 0 },
        expenseByCategory: [],
        incomeByCategory: [],
        expenseByTag: [],
        dailyBalance: emptyDaily,
        dailyAccountBalance: flatAccount,
      };
    }

    const { start, end } = monthRange(year, month);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const catName = new Map(categories.map((c) => [c._id, c.name]));

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const tagName = new Map(tags.map((t) => [t._id, t.name]));

    const expenseCat = new Map<string, number>();
    const incomeCat = new Map<string, number>();
    const expenseTag = new Map<string, number>();
    const dailyExp = new Map<string, number>();
    const dailyInc = new Map<string, number>();

    for (const row of rows) {
      const dk = dayKeyFromTimestamp(row.date);
      const value = amountForAggregation(row);
      if (row.type === "expense" && row.categoryId) {
        const name = catName.get(row.categoryId) ?? "—";
        expenseCat.set(name, addMoney(expenseCat.get(name) ?? 0, value));
        dailyExp.set(dk, addMoney(dailyExp.get(dk) ?? 0, value));
        for (const tagId of row.tagIds ?? []) {
          const tn = tagName.get(tagId) ?? "—";
          expenseTag.set(tn, addMoney(expenseTag.get(tn) ?? 0, value));
        }
      } else if (row.type === "income" && row.categoryId) {
        const name = catName.get(row.categoryId) ?? "—";
        incomeCat.set(name, addMoney(incomeCat.get(name) ?? 0, value));
        dailyInc.set(dk, addMoney(dailyInc.get(dk) ?? 0, value));
      }
    }

    const dailyBalance = monthDates.map((date) => ({
      date,
      income: dailyInc.get(date) ?? 0,
      expense: dailyExp.get(date) ?? 0,
    }));

    const dailyAccountBalance = await dailyAccountBalanceForMonth(
      ctx,
      userId,
      monthDates,
    );

    const toSlices = (m: Map<string, number>) =>
      [...m.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
      summary: buildSummary(rows),
      expenseByCategory: toSlices(expenseCat),
      incomeByCategory: toSlices(incomeCat),
      expenseByTag: toSlices(expenseTag),
      dailyBalance,
      dailyAccountBalance,
    };
  },
});
