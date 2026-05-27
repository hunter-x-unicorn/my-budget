import { v } from "convex/values";
import { query } from "./_generated/server";
import { convertToBase } from "./lib/exchange";
import { countRatesForDay, getSyncRecord, todayDateKeyMinsk } from "./lib/exchangeSync";
import { readCachedRate } from "./exchangeRatesData";

const rateValidator = v.object({
  scale: v.number(),
  rate: v.number(),
});

/** Whether today's official rates are in the global cache. */
export const todayStatus = query({
  args: {},
  returns: v.object({
    dateKey: v.string(),
    ready: v.boolean(),
    rateCount: v.number(),
  }),
  handler: async (ctx) => {
    const dateKey = todayDateKeyMinsk();
    const sync = await getSyncRecord(ctx, dateKey);
    if (sync !== null) {
      return { dateKey, ready: true, rateCount: sync.rateCount };
    }
    const count = await countRatesForDay(ctx, dateKey);
    return { dateKey, ready: count > 0, rateCount: count };
  },
});

/** ISO codes with rates on the latest synced day in DB. */
export const codesInDatabase = query({
  args: {},
  returns: v.array(
    v.object({
      code: v.string(),
      rate: v.number(),
      scale: v.number(),
    }),
  ),
  handler: async (ctx) => {
    let dateKey = todayDateKeyMinsk();
    let sync = await getSyncRecord(ctx, dateKey);
    if (sync === null) {
      const anySync = await ctx.db.query("exchangeRateSyncs").order("desc").first();
      if (anySync === null) return [];
      dateKey = anySync.dateKey;
    }

    const rows = await ctx.db
      .query("exchangeRates")
      .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
      .collect();

    return rows
      .map((r) => ({
        code: r.code,
        rate: r.rate,
        scale: r.scale,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  },
});

const historyPointValidator = v.object({
  dateKey: v.string(),
  rate: v.number(),
  scale: v.number(),
});

/** Recent official rates for charts (up to `limit` days). */
export const rateHistory = query({
  args: {
    code: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(historyPointValidator),
  handler: async (ctx, { code, limit }) => {
    const normalized = code.trim().toUpperCase();
    if (normalized === "BYN") {
      return [{ dateKey: todayDateKeyMinsk(), rate: 1, scale: 1 }];
    }

    const max = Math.min(limit ?? 60, 120);
    const rows = await ctx.db.query("exchangeRates").collect();
    const points = rows
      .filter((r) => r.code === normalized)
      .map((r) => ({
        dateKey: r.dateKey,
        rate: r.rate,
        scale: r.scale,
        sort: dateKeySortable(r.dateKey),
      }))
      .sort((a, b) => a.sort - b.sort)
      .slice(-max)
      .map(({ dateKey, rate, scale }) => ({ dateKey, rate, scale }));

    return points;
  },
});

function dateKeySortable(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return y * 10000 + m * 100 + d;
}

/** Cached official NBRB rate for a calendar day (letter ISO code). */
export const lookup = query({
  args: {
    code: v.string(),
    dateKey: v.string(),
  },
  returns: v.union(v.null(), rateValidator),
  handler: async (ctx, { code, dateKey }) => readCachedRate(ctx, code, dateKey),
});

/** Preview conversion to base currency (DB only, no network). */
export const previewBase = query({
  args: {
    code: v.string(),
    dateKey: v.string(),
    amount: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      amountBase: v.number(),
      scale: v.number(),
      rate: v.number(),
    }),
  ),
  handler: async (ctx, { code, dateKey, amount }) => {
    if (amount <= 0) return null;

    const cached = await readCachedRate(ctx, code, dateKey);
    if (cached === null) return null;
    return {
      amountBase: convertToBase(amount, cached.scale, cached.rate),
      scale: cached.scale,
      rate: cached.rate,
    };
  },
});
