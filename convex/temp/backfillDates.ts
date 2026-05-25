/**
 * TEMPORARY — delete with `convex/temp/`.
 */

import {
  BACKFILL_START_DAY,
  BACKFILL_START_MONTH,
  BACKFILL_START_YEAR,
} from "./backfillConfig";
import { todayDateKeyMinsk } from "../lib/exchangeSync";

export function dateKeyToSortable(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return year * 10000 + month * 100 + day;
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
