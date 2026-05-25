/**
 * TEMPORARY — one-time backfill UI support.
 * Delete this file, `convex/temp/`, `src/temp/`, and BudgetApp TEMP block.
 */

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import { action, query } from "../_generated/server";
import { getSyncRecord } from "../lib/exchangeSync";
import { enumerateBackfillDateKeys } from "./backfillDates";

const dayResultValidator = v.object({
  dateKey: v.string(),
  synced: v.boolean(),
  skipped: v.boolean(),
  rateCount: v.number(),
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

/** Sync one calendar day (skips if already in DB). */
export const syncOneDay = action({
  args: { dateKey: v.string() },
  returns: dayResultValidator,
  handler: async (ctx, { dateKey }): Promise<{
    dateKey: string;
    synced: boolean;
    skipped: boolean;
    rateCount: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Требуется вход");
    }

    const existing = await ctx.runQuery(internal.exchangeRatesSync.getSyncInternal, {
      dateKey,
    });
    if (existing !== null) {
      return {
        dateKey,
        synced: false,
        skipped: true,
        rateCount: existing.rateCount,
      };
    }

    const result = await ctx.runAction(internal.exchangeRatesSync.syncForDateInternal, {
      dateKey,
    });

    return {
      dateKey: result.dateKey,
      synced: result.synced,
      skipped: !result.synced,
      rateCount: result.rateCount,
    };
  },
});
