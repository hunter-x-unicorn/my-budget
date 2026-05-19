import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";

const transactionType = v.union(v.literal("income"), v.literal("expense"));

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;
  return { start, end };
}

function dayKey(timestamp: number) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

async function requireUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Требуется вход");
  }
  return userId;
}

export const listForMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { year, month }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const { start, end } = monthRange(year, month);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .order("desc")
      .collect();
  },
});

export const summaryForMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, { year, month }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { income: 0, expense: 0, balance: 0 };
    }

    const { start, end } = monthRange(year, month);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .collect();

    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.type === "income") income += row.amount;
      else expense += row.amount;
    }

    return { income, expense, balance: income - expense };
  },
});

const tableCellValidator = v.object({
  categoryId: v.id("categories"),
  date: v.string(),
  income: v.number(),
  expense: v.number(),
});

export const tableForMonth = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  returns: v.object({
    dates: v.array(v.string()),
    cells: v.array(tableCellValidator),
  }),
  handler: async (ctx, { year, month }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { dates: [], cells: [] };
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${year}-${month}-${d}`);
    }

    const userCategories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const categoryByName = new Map<string, Id<"categories">>();
    for (const cat of userCategories) {
      categoryByName.set(`${cat.type}:${cat.name}`, cat._id);
    }

    const { start, end } = monthRange(year, month);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .collect();

    const aggregated = new Map<
      string,
      { categoryId: Id<"categories">; date: string; income: number; expense: number }
    >();

    for (const row of rows) {
      const categoryId =
        row.categoryId ??
        categoryByName.get(`${row.type}:${row.category}`) ??
        null;
      if (categoryId === null) continue;

      const date = dayKey(row.date);
      const mapKey = `${categoryId}|${date}`;
      const cell = aggregated.get(mapKey) ?? {
        categoryId,
        date,
        income: 0,
        expense: 0,
      };
      if (row.type === "income") cell.income += row.amount;
      else cell.expense += row.amount;
      aggregated.set(mapKey, cell);
    }

    return { dates, cells: [...aggregated.values()] };
  },
});

export const create = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    categoryId: v.id("categories"),
    note: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (args.amount <= 0) {
      throw new ConvexError("Сумма должна быть больше нуля");
    }

    const category = await ctx.db.get(args.categoryId);
    if (category === null || category.userId !== userId) {
      throw new ConvexError("Категория не найдена");
    }
    if (category.type !== args.type) {
      throw new ConvexError("Тип операции не совпадает с категорией");
    }

    return await ctx.db.insert("transactions", {
      userId,
      type: args.type,
      amount: Math.round(args.amount * 100) / 100,
      categoryId: args.categoryId,
      category: category.name,
      note: args.note?.trim() || undefined,
      date: args.date ?? Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (row === null || row.userId !== userId) {
      throw new ConvexError("Операция не найдена");
    }
    await ctx.db.delete(id);
  },
});
