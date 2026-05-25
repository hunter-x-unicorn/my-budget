/**
 * TEMPORARY — one-time backfill (browser fetches NBRB, mutation saves to DB).
 * Delete: convex/temp/, src/temp/, BudgetApp TEMP block, index.css import.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getSyncRecord } from "../lib/exchangeSync";
import { enumerateBackfillDateKeys } from "./backfillDates";

const rateInput = v.object({
  code: v.string(),
  scale: v.number(),
  rate: v.number(),
});

export const status = query({
  args: {},
  returns: v.object({
    needed: v.boolean(),
    total: v.number(),
    synced: v.number(),
  }),
  handler: async (ctx) => {
    const allDays = enumerateBackfillDateKeys();
    let synced = 0;
    for (const dateKey of allDays) {
      const row = await getSyncRecord(ctx, dateKey);
      if (row !== null) synced++;
    }
    return {
      needed: synced < allDays.length,
      total: allDays.length,
      synced,
    };
  },
});

/** Save one day of rates (idempotent). Called from the browser after fetch. */
export const saveDayRates = mutation({
  args: {
    dateKey: v.string(),
    rates: v.array(rateInput),
  },
  returns: v.object({
    dateKey: v.string(),
    rateCount: v.number(),
    skipped: v.boolean(),
  }),
  handler: async (ctx, { dateKey, rates }) => {
    const existing = await getSyncRecord(ctx, dateKey);
    if (existing !== null) {
      return {
        dateKey,
        rateCount: existing.rateCount,
        skipped: true,
      };
    }

    let count = 0;
    for (const row of rates) {
      const normalized = row.code.trim().toUpperCase();
      if (!normalized || normalized === "BYN") continue;

      const found = await ctx.db
        .query("exchangeRates")
        .withIndex("by_date_code", (q) =>
          q.eq("dateKey", dateKey).eq("code", normalized),
        )
        .unique();

      if (found !== null) {
        await ctx.db.patch(found._id, {
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

    await ctx.db.insert("exchangeRateSyncs", {
      dateKey,
      syncedAt: Date.now(),
      rateCount: count,
    });

    return { dateKey, rateCount: count, skipped: false };
  },
});
