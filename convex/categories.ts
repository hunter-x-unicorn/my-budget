import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  type MutationCtx,
  query,
} from "./_generated/server";
import { categoryHasTransactions } from "./lib/categories";
import { getOptionalUserId, requireUserId } from "./lib/auth";
import { categoryDocValidator, categoryType } from "./lib/validators";

const DEFAULT_EXPENSE = [
  "Еда",
  "Транспорт",
  "Дом",
  "Здоровье",
  "Развлечения",
  "Покупки",
  "Другое",
];

const DEFAULT_INCOME = ["Зарплата", "Подработка", "Подарок", "Другое"];

function sortCategories<T extends { type: string; order: number }>(rows: T[]) {
  return rows.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "expense" ? -1 : 1;
    }
    return a.order - b.order;
  });
}

async function insertDefaultCategories(ctx: MutationCtx, userId: Id<"users">) {
  let order = 0;
  for (const name of DEFAULT_EXPENSE) {
    await ctx.db.insert("categories", {
      userId,
      name,
      type: "expense",
      order: order++,
    });
  }
  order = 0;
  for (const name of DEFAULT_INCOME) {
    await ctx.db.insert("categories", {
      userId,
      name,
      type: "income",
      order: order++,
    });
  }
}

/** Idempotent seed — вызывать один раз из BudgetApp, не из вкладок. */
export const bootstrap = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing === null) {
      await insertDefaultCategories(ctx, userId);
    }
    return null;
  },
});

export const seedDefaultsIfEmpty = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return null;

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing !== null) return null;

    await insertDefaultCategories(ctx, userId);
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(categoryDocValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return sortCategories(rows);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: categoryType,
  },
  returns: v.id("categories"),
  handler: async (ctx, { name, type }) => {
    const userId = await requireUserId(ctx);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ConvexError("Введите название категории");
    }
    if (trimmed.length > 40) {
      throw new ConvexError("Слишком длинное название");
    }

    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", type),
      )
      .collect();

    const duplicate = siblings.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError("Такая категория уже есть");
    }

    const maxOrder = siblings.reduce((m, c) => Math.max(m, c.order), -1);

    return await ctx.db.insert("categories", {
      userId,
      name: trimmed,
      type,
      order: maxOrder + 1,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const category = await ctx.db.get(id);
    if (category === null || category.userId !== userId) {
      throw new ConvexError("Категория не найдена");
    }

    if (await categoryHasTransactions(ctx, userId, category)) {
      throw new ConvexError(
        "Нельзя удалить: есть операции в этой категории",
      );
    }

    await ctx.db.delete(id);

    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("type", category.type),
      )
      .collect();

    const sorted = siblings.sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]!._id, { order: i });
    }
    return null;
  },
});

export const move = mutation({
  args: {
    id: v.id("categories"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, { id, direction }) => {
    const userId = await requireUserId(ctx);
    const category = await ctx.db.get(id);
    if (category === null || category.userId !== userId) {
      throw new ConvexError("Категория не найдена");
    }

    const siblings = (
      await ctx.db
        .query("categories")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("type", category.type),
        )
        .collect()
    ).sort((a, b) => a.order - b.order);

    const index = siblings.findIndex((c) => c._id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return null;

    const other = siblings[swapIndex]!;
    await ctx.db.patch(id, { order: other.order });
    await ctx.db.patch(other._id, { order: category.order });
    return null;
  },
});
