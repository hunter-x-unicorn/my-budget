import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { dayKeyFromTimestamp } from "./dates";
import { roundMoney } from "./money";

type DbCtx = QueryCtx | MutationCtx;

export type CachedRate = {
  scale: number;
  rate: number;
};

/** NBRB: Cur_Scale units of foreign currency = rate BYN. */
export function convertToBase(amount: number, scale: number, rate: number): number {
  if (scale <= 0 || rate <= 0) {
    throw new ConvexError("Некорректный курс валюты");
  }
  return roundMoney((amount * rate) / scale);
}

export async function getBaseCurrency(ctx: DbCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("currencies")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const sorted = rows.sort((a, b) => a.order - b.order);
  return sorted[0] ?? null;
}

export async function getCachedRate(
  ctx: DbCtx,
  dateKey: string,
  code: string,
): Promise<CachedRate | null> {
  const row = await ctx.db
    .query("exchangeRates")
    .withIndex("by_date_code", (q) => q.eq("dateKey", dateKey).eq("code", code))
    .unique();
  if (row === null) return null;
  return { scale: row.scale, rate: row.rate };
}

/** Amount in user's base currency (first currency by order). */
export function amountForAggregation(row: {
  amount: number;
  amountBase?: number;
}): number {
  return row.amountBase ?? row.amount;
}

export async function resolveAmountBase(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  currencyId: Id<"currencies">,
  date: number,
): Promise<number> {
  const rounded = roundMoney(amount);
  const base = await getBaseCurrency(ctx, userId);
  if (base === null) {
    throw new ConvexError("Добавьте валюту в настройках");
  }

  const currency = await ctx.db.get(currencyId);
  if (currency === null || currency.userId !== userId) {
    throw new ConvexError("Валюта не найдена");
  }

  if (currency.code === base.code) {
    return rounded;
  }

  const dateKey = dayKeyFromTimestamp(date);
  const cached = await getCachedRate(ctx, dateKey, currency.code);
  if (cached === null) {
    throw new ConvexError(
      `Нет курса ${currency.code} на ${dateKey} в базе. Курсы обновляются раз в день; для прошлых дат они появляются после первой синхронизации.`,
    );
  }

  return convertToBase(rounded, cached.scale, cached.rate);
}
