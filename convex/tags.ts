import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { getOptionalUserId, requireUserId } from "./lib/auth";

export const tagDocValidator = v.object({
  _id: v.id("tags"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  order: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(tagDocValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("tags"),
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ConvexError("Введите название тега");
    }
    if (trimmed.length > 40) {
      throw new ConvexError("Слишком длинное название");
    }

    const siblings = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = siblings.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError("Такой тег уже есть");
    }

    const maxOrder = siblings.reduce((m, t) => Math.max(m, t.order), -1);

    return await ctx.db.insert("tags", {
      userId,
      name: trimmed,
      order: maxOrder + 1,
    });
  },
});

async function tagInUse(
  ctx: MutationCtx,
  userId: Id<"users">,
  tagId: Id<"tags">,
) {
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .collect();
  return rows.some((row) => row.tagIds?.includes(tagId));
}

export const rename = mutation({
  args: {
    id: v.id("tags"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { id, name }) => {
    const userId = await requireUserId(ctx);
    const tag = await ctx.db.get(id);
    if (tag === null || tag.userId !== userId) {
      throw new ConvexError("Тег не найден");
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new ConvexError("Введите название тега");
    }
    if (trimmed.length > 40) {
      throw new ConvexError("Слишком длинное название");
    }

    const siblings = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = siblings.some(
      (t) => t._id !== id && t.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError("Такой тег уже есть");
    }

    await ctx.db.patch(id, { name: trimmed });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tags") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const tag = await ctx.db.get(id);
    if (tag === null || tag.userId !== userId) {
      throw new ConvexError("Тег не найден");
    }

    if (await tagInUse(ctx, userId, id)) {
      throw new ConvexError("Нельзя удалить: есть операции с этим тегом");
    }

    await ctx.db.delete(id);

    const siblings = (
      await ctx.db
        .query("tags")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).sort((a, b) => a.order - b.order);

    for (let i = 0; i < siblings.length; i++) {
      await ctx.db.patch(siblings[i]!._id, { order: i });
    }
    return null;
  },
});

export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("tags")),
  },
  returns: v.null(),
  handler: async (ctx, { orderedIds }) => {
    const userId = await requireUserId(ctx);
    const siblings = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (orderedIds.length !== siblings.length) {
      throw new ConvexError("Неверный список тегов");
    }

    const idSet = new Set(siblings.map((t) => t._id));
    for (const id of orderedIds) {
      if (!idSet.has(id)) {
        throw new ConvexError("Тег не найден");
      }
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await ctx.db.patch(orderedIds[i]!, { order: i });
    }
    return null;
  },
});

export const move = mutation({
  args: {
    id: v.id("tags"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, { id, direction }) => {
    const userId = await requireUserId(ctx);
    const tag = await ctx.db.get(id);
    if (tag === null || tag.userId !== userId) {
      throw new ConvexError("Тег не найден");
    }

    const siblings = (
      await ctx.db
        .query("tags")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).sort((a, b) => a.order - b.order);

    const index = siblings.findIndex((t) => t._id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) return null;

    const other = siblings[swapIndex]!;
    await ctx.db.patch(id, { order: other.order });
    await ctx.db.patch(other._id, { order: tag.order });
    return null;
  },
});
