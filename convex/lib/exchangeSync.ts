import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

/** Calendar “today” in Europe/Minsk (matches NBRB publication day). */
export function todayDateKeyMinsk(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Minsk",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return `${year}-${month}-${day}`;
}

export async function getSyncRecord(ctx: DbCtx, dateKey: string) {
  return await ctx.db
    .query("exchangeRateSyncs")
    .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
    .unique();
}

export async function countRatesForDay(ctx: DbCtx, dateKey: string): Promise<number> {
  const rows = await ctx.db
    .query("exchangeRates")
    .withIndex("by_date", (q) => q.eq("dateKey", dateKey))
    .collect();
  return rows.length;
}
