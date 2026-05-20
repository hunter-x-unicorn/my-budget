import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import { transactionType } from "../lib/validators";

type TransactionInput = {
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId?: Id<"categories">;
  currencyId: Id<"currencies">;
  tagIds?: Id<"tags">[];
};

async function validateTags(
  ctx: MutationCtx,
  userId: Id<"users">,
  tagIds: Id<"tags">[] | undefined,
) {
  if (!tagIds?.length) return;
  for (const tagId of tagIds) {
    const tag = await ctx.db.get(tagId);
    if (tag === null || tag.userId !== userId) {
      throw new ConvexError("Тег не найден");
    }
  }
}

async function validateTransaction(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: TransactionInput,
) {
  if (args.amount <= 0) {
    throw new ConvexError("Сумма должна быть больше нуля");
  }

  const currency = await ctx.db.get(args.currencyId);
  if (currency === null || currency.userId !== userId) {
    throw new ConvexError("Валюта не найдена");
  }

  await validateTags(ctx, userId, args.tagIds);

  if (args.type === "transfer") {
    return;
  }

  if (args.categoryId === undefined) {
    throw new ConvexError("Выберите категорию");
  }

  const category = await ctx.db.get(args.categoryId);
  if (category === null || category.userId !== userId) {
    throw new ConvexError("Категория не найдена");
  }
  if (category.type !== args.type) {
    throw new ConvexError("Тип операции не совпадает с категорией");
  }
}

export const create = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    categoryId: v.optional(v.id("categories")),
    currencyId: v.id("currencies"),
    tagIds: v.optional(v.array(v.id("tags"))),
    note: v.optional(v.string()),
    date: v.optional(v.number()),
  },
  returns: v.id("transactions"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await validateTransaction(ctx, userId, args);

    return await ctx.db.insert("transactions", {
      userId,
      type: args.type,
      amount: Math.round(args.amount * 100) / 100,
      categoryId: args.categoryId,
      currencyId: args.currencyId,
      tagIds: args.tagIds?.length ? args.tagIds : undefined,
      note: args.note?.trim() || undefined,
      date: args.date ?? Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("transactions"),
    type: transactionType,
    amount: v.number(),
    categoryId: v.optional(v.id("categories")),
    currencyId: v.id("currencies"),
    tagIds: v.optional(v.array(v.id("tags"))),
    note: v.optional(v.string()),
    date: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.id);
    if (row === null || row.userId !== userId) {
      throw new ConvexError("Операция не найдена");
    }

    await validateTransaction(ctx, userId, args);

    await ctx.db.patch(args.id, {
      type: args.type,
      amount: Math.round(args.amount * 100) / 100,
      categoryId: args.categoryId,
      currencyId: args.currencyId,
      tagIds: args.tagIds?.length ? args.tagIds : undefined,
      note: args.note?.trim() || undefined,
      date: args.date,
    });
    return null;
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
