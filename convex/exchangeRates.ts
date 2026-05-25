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
