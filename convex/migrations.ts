import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Legacy row shape before categoryId was required. */
type LegacyTransaction = {
  _id: Id<"transactions">;
  userId: Id<"users">;
  type: "income" | "expense";
  categoryId?: Id<"categories">;
  category?: string;
};

/**
 * Bind legacy transactions (no categoryId) to categories by type+name.
 * Run **before** deploying schema with required categoryId:
 * `npx convex run migrations:linkLegacyTransactions`
 */
export const linkLegacyTransactions = internalMutation({
  args: {},
  returns: v.object({
    linked: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    let linked = 0;
    let skipped = 0;

    const allTx = (await ctx.db.query("transactions").collect()) as LegacyTransaction[];

    for (const tx of allTx) {
      if (tx.categoryId !== undefined) {
        continue;
      }

      const legacyName = tx.category ?? null;
      if (!legacyName) {
        skipped++;
        continue;
      }

      const categories = await ctx.db
        .query("categories")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", tx.userId).eq("type", tx.type),
        )
        .collect();

      const match = categories.find(
        (c) => c.name.toLowerCase() === legacyName.toLowerCase(),
      );
      if (!match) {
        skipped++;
        continue;
      }

      await ctx.db.patch(tx._id, { categoryId: match._id });
      linked++;
    }

    return { linked, skipped };
  },
});

/**
 * Delete transactions that have no categoryId and no legacy name to match.
 * `npx convex run migrations:removeOrphanTransactions`
 */
export const removeOrphanTransactions = internalMutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx) => {
    let removed = 0;
    const allTx = (await ctx.db.query("transactions").collect()) as LegacyTransaction[];
    for (const tx of allTx) {
      if (tx.categoryId !== undefined) continue;
      if (!tx.category) {
        await ctx.db.delete(tx._id);
        removed++;
      }
    }
    return { removed };
  },
});
