import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { getOptionalUserId, requireUserId } from "./lib/auth";
import {
  hasCaseInsensitiveDuplicate,
  nextOrder,
  normalizeEntityName,
} from "./lib/crud";
import { roundMoney } from "./lib/money";

export const accountDocValidator = v.object({
  _id: v.id("accounts"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  balance: v.number(),
  order: v.number(),
  isDefault: v.optional(v.boolean()),
  lastRecalculatedAt: v.optional(v.number()),
});

const DEFAULT_ACCOUNT_NAME = "Текущий";

async function insertDefaultAccount(ctx: MutationCtx, userId: Id<"users">) {
  await ctx.db.insert("accounts", {
    userId,
    name: DEFAULT_ACCOUNT_NAME,
    balance: 0,
    order: 0,
    isDefault: true,
  });
}

/** Idempotent seed — «Текущий» with balance 0. */
export const bootstrap = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing === null) {
      await insertDefaultAccount(ctx, userId);
    }
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(accountDocValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("accounts"),
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    const trimmed = normalizeEntityName(
      name,
      "Введите название счёта",
      "Слишком длинное название",
    );

    const siblings = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (hasCaseInsensitiveDuplicate(siblings, (a) => a.name, trimmed)) {
      throw new ConvexError("Такой счёт уже есть");
    }

    return await ctx.db.insert("accounts", {
      userId,
      name: trimmed,
      balance: 0,
      order: nextOrder(siblings),
    });
  },
});

/** Set actual balance (перерасчёт). */
export const recalculate = mutation({
  args: {
    id: v.id("accounts"),
    balance: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { id, balance }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(id);
    if (account === null || account.userId !== userId) {
      throw new ConvexError("Счёт не найден");
    }
    if (balance < 0) {
      throw new ConvexError("Сумма не может быть отрицательной");
    }

    await ctx.db.patch(id, {
      balance: roundMoney(balance),
      lastRecalculatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(id);
    if (account === null || account.userId !== userId) {
      throw new ConvexError("Счёт не найден");
    }
    if (account.isDefault) {
      throw new ConvexError("Нельзя удалить основной счёт «Текущий»");
    }

    const siblings = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (siblings.length <= 1) {
      throw new ConvexError("Нельзя удалить последний счёт");
    }

    await ctx.db.delete(id);

    const sorted = siblings
      .filter((a) => a._id !== id)
      .sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]!._id, { order: i });
    }
    return null;
  },
});
