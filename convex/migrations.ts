import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { dayKeyFromTimestamp } from "./lib/dates";
import {
  convertToBase,
  getBaseCurrency,
  getCachedRate,
} from "./lib/exchange";
import { roundMoney } from "./lib/money";

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
/**
 * Fill amountBase for legacy rows (uses cached NBRB rates; skips if rate missing).
 * `npx convex run migrations:backfillAmountBase`
 */
export const backfillAmountBase = internalMutation({
  args: {},
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    let updated = 0;
    let skipped = 0;

    const allTx = await ctx.db.query("transactions").collect();
    const baseByUser = new Map<string, Awaited<ReturnType<typeof getBaseCurrency>>>();

    for (const tx of allTx) {
      if (tx.amountBase !== undefined) continue;

      let base = baseByUser.get(tx.userId);
      if (base === undefined) {
        base = await getBaseCurrency(ctx, tx.userId);
        baseByUser.set(tx.userId, base);
      }
      if (base === null) {
        skipped++;
        continue;
      }

      let amountBase = roundMoney(tx.amount);
      if (tx.currencyId) {
        const currency = await ctx.db.get(tx.currencyId);
        if (currency && currency.code !== base.code) {
          const cached = await getCachedRate(
            ctx,
            dayKeyFromTimestamp(tx.date),
            currency.code,
          );
          if (cached === null) {
            skipped++;
            continue;
          }
          amountBase = convertToBase(tx.amount, cached.scale, cached.rate);
        }
      }

      await ctx.db.patch(tx._id, { amountBase });
      updated++;
    }

    return { updated, skipped };
  },
});

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
