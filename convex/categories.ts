import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";

const categoryType = v.union(v.literal("income"), v.literal("expense"));

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

async function requireUserId(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Требуется вход");
  }
  return userId;
}

async function seedDefaults(ctx: MutationCtx, userId: Id<"users">) {
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "expense" ? -1 : 1;
      }
      return a.order - b.order;
    });
  },
});

export const ensureDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing === null) {
      await seedDefaults(ctx, userId);
    }
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: categoryType,
  },
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
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const category = await ctx.db.get(id);
    if (category === null || category.userId !== userId) {
      throw new ConvexError("Категория не найдена");
    }

    const used = await ctx.db
      .query("transactions")
      .withIndex("by_category", (q) => q.eq("categoryId", id))
      .first();

    if (used !== null) {
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
  },
});

export const move = mutation({
  args: {
    id: v.id("categories"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
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
    if (swapIndex < 0 || swapIndex >= siblings.length) return;

    const other = siblings[swapIndex]!;
    await ctx.db.patch(id, { order: other.order });
    await ctx.db.patch(other._id, { order: category.order });
  },
});
