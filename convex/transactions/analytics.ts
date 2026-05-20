import { v } from "convex/values";
import { query } from "../_generated/server";
import { getOptionalUserId } from "../lib/auth";
import { dayKeyFromTimestamp, monthRange } from "../lib/dates";
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
    dailyExpense: v.array(v.object({ date: v.string(), amount: v.number() })),
    dailyIncome: v.array(v.object({ date: v.string(), amount: v.number() })),
    dailyBalance: v.array(
      v.object({ date: v.string(), income: v.number(), expense: v.number() }),
    ),
  }),
  handler: async (ctx, { year, month }) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) {
      return {
        summary: { income: 0, expense: 0, balance: 0 },
        expenseByCategory: [],
        incomeByCategory: [],
        expenseByTag: [],
        dailyExpense: [],
        dailyIncome: [],
        dailyBalance: [],
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
      if (row.type === "expense" && row.categoryId) {
        const name = catName.get(row.categoryId) ?? "—";
        expenseCat.set(name, (expenseCat.get(name) ?? 0) + row.amount);
        dailyExp.set(dk, (dailyExp.get(dk) ?? 0) + row.amount);
        for (const tagId of row.tagIds ?? []) {
          const tn = tagName.get(tagId) ?? "—";
          expenseTag.set(tn, (expenseTag.get(tn) ?? 0) + row.amount);
        }
      } else if (row.type === "income" && row.categoryId) {
        const name = catName.get(row.categoryId) ?? "—";
        incomeCat.set(name, (incomeCat.get(name) ?? 0) + row.amount);
        dailyInc.set(dk, (dailyInc.get(dk) ?? 0) + row.amount);
      }
    }

    const allDays = new Set([...dailyExp.keys(), ...dailyInc.keys()]);
    const dailyBalance = [...allDays]
      .sort()
      .map((date) => ({
        date,
        income: dailyInc.get(date) ?? 0,
        expense: dailyExp.get(date) ?? 0,
      }));

    const toSlices = (m: Map<string, number>) =>
      [...m.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
      summary: buildSummary(rows),
      expenseByCategory: toSlices(expenseCat),
      incomeByCategory: toSlices(incomeCat),
      expenseByTag: toSlices(expenseTag),
      dailyExpense: [...dailyExp.entries()]
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      dailyIncome: [...dailyInc.entries()]
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      dailyBalance,
    };
  },
});
