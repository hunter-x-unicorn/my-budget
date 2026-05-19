import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { transactionType } from "../lib/validators";

export const create = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    categoryId: v.id("categories"),
    note: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  returns: v.id("transactions"),
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
      note: args.note?.trim() || undefined,
      date: args.date ?? Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("transactions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (row === null || row.userId !== userId) {
      throw new ConvexError("Операция не найдена");
    }
    await ctx.db.delete(id);
    return null;
  },
});
