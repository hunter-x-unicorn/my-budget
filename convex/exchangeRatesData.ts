import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";

const rateValidator = v.object({
  scale: v.number(),
  rate: v.number(),
});

export async function readCachedRate(
  ctx: { db: QueryCtx["db"] },
  code: string,
  dateKey: string,
): Promise<{ scale: number; rate: number } | null> {
  const normalized = code.trim().toUpperCase();
  if (normalized === "BYN") {
    return { scale: 1, rate: 1 };
  }

  const row = await ctx.db
    .query("exchangeRates")
    .withIndex("by_date_code", (q) =>
      q.eq("dateKey", dateKey).eq("code", normalized),
    )
    .unique();

  if (row === null) return null;
  return { scale: row.scale, rate: row.rate };
}

export const upsert = internalMutation({
  args: {
    dateKey: v.string(),
    code: v.string(),
    scale: v.number(),
    rate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { dateKey, code, scale, rate }) => {
    const normalized = code.trim().toUpperCase();
    const existing = await ctx.db
      .query("exchangeRates")
      .withIndex("by_date_code", (q) =>
        q.eq("dateKey", dateKey).eq("code", normalized),
      )
      .unique();

    if (existing !== null) {
      await ctx.db.patch(existing._id, { scale, rate });
    } else {
      await ctx.db.insert("exchangeRates", {
        dateKey,
        code: normalized,
        scale,
        rate,
      });
    }
    return null;
  },
});

export const bulkUpsertForDay = internalMutation({
  args: {
    dateKey: v.string(),
    rates: v.array(
      v.object({
        code: v.string(),
        scale: v.number(),
        rate: v.number(),
      }),
    ),
    syncedAt: v.number(),
  },
  returns: v.object({ rateCount: v.number() }),
  handler: async (ctx, { dateKey, rates, syncedAt }) => {
    let count = 0;
    for (const row of rates) {
      const normalized = row.code.trim().toUpperCase();
      if (!normalized || normalized === "BYN") continue;

      const existing = await ctx.db
        .query("exchangeRates")
        .withIndex("by_date_code", (q) =>
          q.eq("dateKey", dateKey).eq("code", normalized),
        )
        .unique();

      if (existing !== null) {
        await ctx.db.patch(existing._id, {
          scale: row.scale,
          rate: row.rate,
        });
      } else {
        await ctx.db.insert("exchangeRates", {
          dateKey,
          code: normalized,
          scale: row.scale,
          rate: row.rate,
        });
      }
      count++;
    }

    const syncRow = await ctx.db
      .query("exchangeRateSyncs")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .unique();

    if (syncRow !== null) {
      await ctx.db.patch(syncRow._id, { syncedAt, rateCount: count });
    } else {
      await ctx.db.insert("exchangeRateSyncs", {
        dateKey,
        syncedAt,
        rateCount: count,
      });
    }

    return { rateCount: count };
  },
});

export const getCachedInternal = internalQuery({
  args: {
    code: v.string(),
    dateKey: v.string(),
  },
  returns: v.union(v.null(), rateValidator),
  handler: async (ctx, { code, dateKey }) => readCachedRate(ctx, code, dateKey),
});
