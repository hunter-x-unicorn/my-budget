import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
