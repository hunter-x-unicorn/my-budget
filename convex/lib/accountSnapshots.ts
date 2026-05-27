import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  dateKeysFromTo,
  datesInMonth,
  dayKeyFromTimestamp,
  dayRangeFromKey,
} from "./dates";
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

function parseDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

function monthsFromTo(startKey: string, endKey: string) {
  const start = parseDayKey(startKey);
  const end = parseDayKey(endKey);
  const out: { year: number; month: number }[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    out.push({ year, month });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return out;
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

/** Rebuild daily balances: flat before first operation, then forward from recalc. */
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

  const { end: todayEnd } = dayRangeFromKey(todayKey);
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", userId).lte("date", todayEnd),
    )
    .collect();

  const netByDay = new Map<string, number>();
  for (const row of rows) {
    const dk = dayKeyFromTimestamp(row.date);
    const net = netForRow(row);
    if (net === 0) continue;
    netByDay.set(dk, addMoney(netByDay.get(dk) ?? 0, net));
  }

  let firstOpDay: string | null = null;
  for (const [dk, net] of netByDay) {
    if (net === 0) continue;
    if (firstOpDay === null || dk < firstOpDay) {
      firstOpDay = dk;
    }
  }

  const snap = new Map<string, number>();

  // Forward from recalc through today (end-of-day balance).
  let running = anchor;
  for (const dateKey of dateKeysFromTo(recalcDayKey, todayKey)) {
    running = addMoney(running, netByDay.get(dateKey) ?? 0);
    snap.set(dateKey, running);
  }

  const flatBeforeFirstOp = (() => {
    if (firstOpDay === null || firstOpDay > recalcDayKey) {
      return anchor;
    }
    if (firstOpDay === recalcDayKey) {
      return addMoney(anchor, -(netByDay.get(recalcDayKey) ?? 0));
    }
    let bal = anchor;
    const span = dateKeysFromTo(firstOpDay, recalcDayKey);
    for (let i = span.length - 2; i >= 0; i--) {
      const d = span[i]!;
      bal = addMoney(bal, -(netByDay.get(span[i + 1]!) ?? 0));
      snap.set(d, bal);
    }
    const atFirstOp = snap.get(firstOpDay) ?? anchor;
    return addMoney(atFirstOp, -(netByDay.get(firstOpDay) ?? 0));
  })();

  const rangeStart = firstOpDay ?? recalcDayKey;
  for (const { year, month } of monthsFromTo(rangeStart, todayKey)) {
    for (const dateKey of datesInMonth(year, month)) {
      if (dateKey > todayKey) continue;
      if (firstOpDay !== null && dateKey < firstOpDay) {
        snap.set(dateKey, flatBeforeFirstOp);
        continue;
      }
      if (dateKey < recalcDayKey && !snap.has(dateKey)) {
        snap.set(dateKey, flatBeforeFirstOp);
      }
    }
  }

  for (const [dateKey, balance] of snap) {
    await upsertSnapshot(ctx, userId, account._id, dateKey, balance);
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

  const anchor = account.balance;

  const stored = await ctx.db
    .query("accountDailySnapshots")
    .withIndex("by_account", (q) => q.eq("accountId", account._id))
    .collect();
  const byDate = new Map(stored.map((s) => [s.dateKey, s.balance]));

  let flatFallback = anchor;
  for (const date of monthDates) {
    const bal = byDate.get(date);
    if (bal !== undefined) {
      flatFallback = bal;
      break;
    }
  }

  return monthDates.map((date) => {
    const snap = byDate.get(date);
    if (snap !== undefined) return snap;
    return flatFallback;
  });
}
