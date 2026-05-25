import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { action, internalAction, internalQuery } from "./_generated/server";
import { fetchAllDailyRates } from "./lib/nbrb";
import { getSyncRecord, todayDateKeyMinsk } from "./lib/exchangeSync";

const syncMetaValidator = v.union(
  v.null(),
  v.object({
    dateKey: v.string(),
    syncedAt: v.number(),
    rateCount: v.number(),
  }),
);

const syncResultValidator = v.object({
  synced: v.boolean(),
  dateKey: v.string(),
  rateCount: v.number(),
});

export const getSyncInternal = internalQuery({
  args: { dateKey: v.string() },
  returns: syncMetaValidator,
  handler: async (ctx, { dateKey }) => {
    const row = await getSyncRecord(ctx, dateKey);
    if (row === null) return null;
    return {
      dateKey: row.dateKey,
      syncedAt: row.syncedAt,
      rateCount: row.rateCount,
    };
  },
});

/** Load all NBRB daily rates for one calendar day into the global cache. */
async function syncDayRates(
  ctx: ActionCtx,
  dateKey?: string,
): Promise<{ synced: boolean; dateKey: string; rateCount: number }> {
  const { dateKey: resolvedKey, rates } = await fetchAllDailyRates(dateKey);

  const existing = await ctx.runQuery(internal.exchangeRatesSync.getSyncInternal, {
    dateKey: resolvedKey,
  });
  if (existing !== null) {
    return { synced: false, dateKey: resolvedKey, rateCount: existing.rateCount };
  }

  const { rateCount } = await ctx.runMutation(
    internal.exchangeRatesData.bulkUpsertForDay,
    {
      dateKey: resolvedKey,
      rates,
      syncedAt: Date.now(),
    },
  );

  return { synced: true, dateKey: resolvedKey, rateCount };
}

/** Cron + optional backfill for a specific day (`dateKey` like 2026-4-24). */
export const syncForDateInternal = internalAction({
  args: { dateKey: v.string() },
  returns: syncResultValidator,
  handler: async (ctx, { dateKey }) => syncDayRates(ctx, dateKey),
});

/** Cron: today's full NBRB rate sheet → global DB. */
export const syncTodayInternal = internalAction({
  args: {},
  returns: syncResultValidator,
  handler: async (ctx) => syncDayRates(ctx),
});

/** Idempotent: runs once per day when a signed-in user opens the app. */
export const syncTodayIfNeeded = action({
  args: {},
  returns: syncResultValidator,
  handler: async (
    ctx,
  ): Promise<{ synced: boolean; dateKey: string; rateCount: number }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { synced: false, dateKey: todayDateKeyMinsk(), rateCount: 0 };
    }

    const expected = todayDateKeyMinsk();
    const existing = (await ctx.runQuery(
      internal.exchangeRatesSync.getSyncInternal,
      { dateKey: expected },
    )) as { rateCount: number } | null;
    if (existing !== null) {
      return { synced: false, dateKey: expected, rateCount: existing.rateCount };
    }

    return await syncDayRates(ctx);
  },
});
