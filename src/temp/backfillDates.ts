/**
 * TEMPORARY — must match `convex/temp/backfillDates.ts`.
 */

import {
  BACKFILL_START_DAY,
  BACKFILL_START_MONTH,
  BACKFILL_START_YEAR,
} from "./backfillConfig";

function todayDateKeyMinsk(): string {
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

export function enumerateBackfillDateKeys(): string[] {
  const endKey = todayDateKeyMinsk();
  const [endYear, endMonth, endDay] = endKey.split("-").map(Number);
  const endDate = new Date(endYear, endMonth, endDay);

  const keys: string[] = [];
  const cursor = new Date(BACKFILL_START_YEAR, BACKFILL_START_MONTH, BACKFILL_START_DAY);

  while (cursor.getTime() <= endDate.getTime()) {
    keys.push(
      `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function formatDateKeyLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${d}.${m}.${year}`;
}
