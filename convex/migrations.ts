import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-time: bind legacy transactions (categoryId missing) to categories by type+name.
 * Run: npx convex run migrations:linkLegacyTransactions
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

    const allTx = await ctx.db.query("transactions").collect();

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

      await ctx.db.patch(tx._id, {
        categoryId: match._id,
        category: undefined,
      });
      linked++;
    }

    return { linked, skipped };
  },
});
