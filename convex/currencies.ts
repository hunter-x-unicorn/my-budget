import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { getOptionalUserId, requireUserId } from "./lib/auth";
import { assertValidReorder, nextOrder } from "./lib/crud";

export const currencyDocValidator = v.object({
  _id: v.id("currencies"),
  _creationTime: v.number(),
  userId: v.id("users"),
  code: v.string(),
  name: v.string(),
  symbol: v.string(),
  order: v.number(),
});

const DEFAULT_CURRENCY = {
  code: "BYN",
  name: "белорусский рубль",
  symbol: "Br",
};

async function insertDefaultCurrency(ctx: MutationCtx, userId: Id<"users">) {
  await ctx.db.insert("currencies", {
    userId,
    ...DEFAULT_CURRENCY,
    order: 0,
  });
}

/** Idempotent seed — BYN by default. */
export const bootstrap = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing === null) {
      await insertDefaultCurrency(ctx, userId);
    }
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(currencyDocValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
  },
  returns: v.id("currencies"),
  handler: async (ctx, { code, name, symbol }) => {
    const userId = await requireUserId(ctx);
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || normalizedCode.length > 6) {
      throw new ConvexError("Некорректный код валюты");
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ConvexError("Введите название валюты");
    }
    const trimmedSymbol = symbol.trim();
    if (!trimmedSymbol) {
      throw new ConvexError("Введите символ валюты");
    }

    const duplicate = await ctx.db
      .query("currencies")
      .withIndex("by_user_code", (q) =>
        q.eq("userId", userId).eq("code", normalizedCode),
      )
      .first();
    if (duplicate !== null) {
      throw new ConvexError("Эта валюта уже добавлена");
    }

    const siblings = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return await ctx.db.insert("currencies", {
      userId,
      code: normalizedCode,
      name: trimmedName,
      symbol: trimmedSymbol,
      order: nextOrder(siblings),
    });
  },
});

async function currencyInUse(
  ctx: MutationCtx,
  userId: Id<"users">,
  currencyId: Id<"currencies">,
) {
  const row = await ctx.db
    .query("transactions")
    .withIndex("by_user_currency", (q) =>
      q.eq("userId", userId).eq("currencyId", currencyId),
    )
    .first();
  return row !== null;
}

export const remove = mutation({
  args: { id: v.id("currencies") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const currency = await ctx.db.get(id);
    if (currency === null || currency.userId !== userId) {
      throw new ConvexError("Валюта не найдена");
    }

    const siblings = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (siblings.length <= 1) {
      throw new ConvexError("Нельзя удалить последнюю валюту");
    }
    if (await currencyInUse(ctx, userId, id)) {
      throw new ConvexError("Нельзя удалить: есть операции в этой валюте");
    }

    await ctx.db.delete(id);

    const sorted = siblings
      .filter((c) => c._id !== id)
      .sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]!._id, { order: i });
    }
    return null;
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("currencies")),
  },
  returns: v.null(),
  handler: async (ctx, { orderedIds }) => {
    const userId = await requireUserId(ctx);
    const siblings = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    assertValidReorder(
      orderedIds as string[],
      siblings as Array<{ _id: string }>,
      "Неверный список валют",
      "Валюта не найдена",
    );

    for (let i = 0; i < orderedIds.length; i++) {
      await ctx.db.patch(orderedIds[i]!, { order: i });
    }
    return null;
  },
});
