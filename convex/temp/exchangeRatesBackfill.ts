/**
 * TEMPORARY — one-time backfill UI support.
 * Delete this file, `convex/temp/`, `src/temp/`, and BudgetApp TEMP block.
 */

import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { action, query } from "../_generated/server";
import { fetchAllDailyRates } from "../lib/nbrb";
import { getSyncRecord } from "../lib/exchangeSync";
import { enumerateBackfillDateKeys } from "./backfillDates";

const dayResultValidator = v.object({
  dateKey: v.string(),
  synced: v.boolean(),
  skipped: v.boolean(),
  rateCount: v.number(),
  error: v.optional(v.string()),
});

type DayResult = {
  dateKey: string;
  synced: boolean;
  skipped: boolean;
  rateCount: number;
  error?: string;
};

/** Fetch NBRB + save to DB (no nested actions — works reliably from public action). */
async function syncDayInAction(
  ctx: ActionCtx,
  dateKey: string,
): Promise<DayResult> {
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

  const { dateKey: resolvedKey, rates } = await fetchAllDailyRates(dateKey);

  if (resolvedKey !== dateKey) {
    const existingResolved = await ctx.runQuery(
      internal.exchangeRatesSync.getSyncInternal,
      { dateKey: resolvedKey },
    );
    if (existingResolved !== null) {
      return {
        dateKey: resolvedKey,
        synced: false,
        skipped: true,
        rateCount: existingResolved.rateCount,
      };
    }
  }

  const { rateCount } = await ctx.runMutation(
    internal.exchangeRatesData.bulkUpsertForDay,
    {
      dateKey: resolvedKey,
      rates,
      syncedAt: Date.now(),
    },
  );

  return {
    dateKey: resolvedKey,
    synced: true,
    skipped: false,
    rateCount,
  };
}

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
  handler: async (ctx, { dateKey }): Promise<DayResult> => {
    try {
      return await syncDayInAction(ctx, dateKey);
    } catch (err: unknown) {
      const message =
        err instanceof ConvexError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Неизвестная ошибка";
      return {
        dateKey,
        synced: false,
        skipped: false,
        rateCount: 0,
        error: message,
      };
    }
  },
});

/** Sync up to 8 days per call (fewer round-trips from the browser). */
export const syncBatch = action({
  args: { dateKeys: v.array(v.string()) },
  returns: v.array(dayResultValidator),
  handler: async (ctx, { dateKeys }): Promise<DayResult[]> => {
    const results: DayResult[] = [];
    for (const dateKey of dateKeys.slice(0, 8)) {
      try {
        results.push(await syncDayInAction(ctx, dateKey));
      } catch (err: unknown) {
        const message =
          err instanceof ConvexError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Неизвестная ошибка";
        results.push({
          dateKey,
          synced: false,
          skipped: false,
          rateCount: 0,
          error: message,
        });
      }
    }
    return results;
  },
});
