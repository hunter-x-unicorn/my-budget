import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { dateKeysFromTo, dayKeyFromTimestamp, dayRangeFromKey } from "./dates";
import { amountForAggregation } from "./exchange";
import { todayDateKeyMinsk } from "./exchangeSync";
import { addMoney } from "./money";

type DbCtx = QueryCtx | MutationCtx;

export function defaultAccount(accounts: Doc<"accounts">[]) {
  return accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
}

function netForRow(row: Doc<"transactions">) {
  if (row.type === "transfer") return 0;
  const value = amountForAggregation(row);
  return row.type === "income" ? value : -value;
}

async function upsertSnapshot(
  ctx: MutationCtx,
  userId: Id<"users">,
  accountId: Id<"accounts">,
  dateKey: string,
  balance: number,
) {
  const existing = await ctx.db
    .query("accountDailySnapshots")
    .withIndex("by_account_date", (q) =>
      q.eq("accountId", accountId).eq("dateKey", dateKey),
    )
    .unique();

  if (existing !== null) {
    await ctx.db.patch(existing._id, { balance });
  } else {
    await ctx.db.insert("accountDailySnapshots", {
      userId,
      accountId,
      dateKey,
      balance,
    });
  }
}

/** Rebuild end-of-day balances from last recalc through today (Minsk). */
export async function syncAccountSnapshots(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const account = defaultAccount(accounts);
  if (account === null || account.lastRecalculatedAt === undefined) {
    return;
  }

  const recalcDayKey = dayKeyFromTimestamp(account.lastRecalculatedAt);
  const todayKey = todayDateKeyMinsk();
  const anchor = account.balance;

  const { start: recalcStart } = dayRangeFromKey(recalcDayKey);
  const { end: todayEnd } = dayRangeFromKey(todayKey);

  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).gte("date", recalcStart).lte("date", todayEnd),
    )
    .collect();

  const netByDay = new Map<string, number>();
  for (const row of rows) {
    const dk = dayKeyFromTimestamp(row.date);
    netByDay.set(dk, addMoney(netByDay.get(dk) ?? 0, netForRow(row)));
  }

  let running = anchor;
  for (const dateKey of dateKeysFromTo(recalcDayKey, todayKey)) {
    running = addMoney(running, netByDay.get(dateKey) ?? 0);
    await upsertSnapshot(ctx, userId, account._id, dateKey, running);
  }
}

/** Daily balances for analytics chart (flat until first recalc). */
export async function dailyAccountBalanceForMonth(
  ctx: DbCtx,
  userId: Id<"users">,
  monthDates: string[],
): Promise<number[]> {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const account = defaultAccount(accounts);
  const flatValue = account?.balance ?? 0;

  if (account === null || account.lastRecalculatedAt === undefined) {
    return monthDates.map(() => flatValue);
  }

  const recalcDayKey = dayKeyFromTimestamp(account.lastRecalculatedAt);
  const anchor = account.balance;

  const stored = await ctx.db
    .query("accountDailySnapshots")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .collect();
  const byDate = new Map(stored.map((s) => [s.dateKey, s.balance]));

  return monthDates.map((date) => {
    const snap = byDate.get(date);
    if (snap !== undefined) return snap;
    if (date < recalcDayKey) return anchor;
    return anchor;
  });
}
