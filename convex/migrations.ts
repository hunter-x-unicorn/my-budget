import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
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

async function linkLegacyTransactionsLogic(ctx: MutationCtx) {
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
      .withIndex("by_user_type", (q) => q.eq("userId", tx.userId).eq("type", tx.type))
      .collect();

    const match = categories.find(
      (c) => c.name.toLowerCase() === legacyName.toLowerCase(),
    );
    if (!match) {
      skipped++;
      continue;
    }

    const doc = await ctx.db.get(tx._id);
    if (doc === null) {
      skipped++;
      continue;
    }
    await ctx.db.replace(tx._id, {
      userId: doc.userId,
      type: doc.type,
      amount: doc.amount,
      categoryId: match._id,
      note: doc.note,
      date: doc.date,
    });
    linked++;
  }

  return { linked, skipped };
}

async function stripLegacyCategoryFieldsLogic(ctx: MutationCtx) {
  let stripped = 0;
  const allTx = (await ctx.db.query("transactions").collect()) as LegacyTransaction[];
  for (const tx of allTx) {
    if (tx.category === undefined || tx.categoryId === undefined) {
      continue;
    }
    const doc = await ctx.db.get(tx._id);
    if (doc === null) continue;
    await ctx.db.replace(tx._id, {
      userId: doc.userId,
      type: doc.type,
      amount: doc.amount,
      categoryId: doc.categoryId,
      note: doc.note,
      date: doc.date,
    });
    stripped++;
  }
  return { stripped };
}

async function removeOrphanTransactionsLogic(ctx: MutationCtx) {
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
}

/**
 * Bind legacy transactions (no categoryId) to categories by type+name.
 * `npx convex run migrations:linkLegacyTransactions`
 */
export const linkLegacyTransactions = internalMutation({
  args: {},
  returns: v.object({
    linked: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => linkLegacyTransactionsLogic(ctx),
});

/** Remove deprecated `category` field from rows that already have categoryId. */
export const stripLegacyCategoryFields = internalMutation({
  args: {},
  returns: v.object({ stripped: v.number() }),
  handler: async (ctx) => stripLegacyCategoryFieldsLogic(ctx),
});

/**
 * Delete transactions that have no categoryId and no legacy name to match.
 * `npx convex run migrations:removeOrphanTransactions`
 */
export const removeOrphanTransactions = internalMutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx) => removeOrphanTransactionsLogic(ctx),
});

/**
 * Link legacy rows, strip deprecated fields, remove orphans.
 * `npx convex run migrations:migrateAllCategoryFields`
 */
export const migrateAllCategoryFields = internalMutation({
  args: {},
  returns: v.object({
    linked: v.number(),
    skipped: v.number(),
    stripped: v.number(),
    removed: v.number(),
  }),
  handler: async (ctx) => {
    const link = await linkLegacyTransactionsLogic(ctx);
    const strip = await stripLegacyCategoryFieldsLogic(ctx);
    const remove = await removeOrphanTransactionsLogic(ctx);
    return {
      linked: link.linked,
      skipped: link.skipped,
      stripped: strip.stripped,
      removed: remove.removed,
    };
  },
});
