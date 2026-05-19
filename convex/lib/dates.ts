import { ConvexError } from "convex/values";

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function assertMonthArgs(year: number, month: number) {
  if (month < 0 || month > 11 || !Number.isInteger(month)) {
    throw new ConvexError("month должен быть 0–11");
  }
  if (year < MIN_YEAR || year > MAX_YEAR || !Number.isInteger(year)) {
    throw new ConvexError(`year должен быть ${MIN_YEAR}–${MAX_YEAR}`);
  }
}

/** Inclusive Unix ms range for a calendar month (local server timezone). */
export function monthRange(year: number, month: number) {
  assertMonthArgs(year, month);
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime() - 1;
  return { start, end };
}

/** 0-based month in key, e.g. 2026-2-15 for 15 Mar 2026. */
export function toDayKey(year: number, month: number, day: number) {
  assertMonthArgs(year, month);
  if (day < 1 || day > 31 || !Number.isInteger(day)) {
    throw new ConvexError("day должен быть 1–31");
  }
  return `${year}-${month}-${day}`;
}

export function dayKeyFromTimestamp(timestamp: number) {
  const d = new Date(timestamp);
  return toDayKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function datesInMonth(year: number, month: number): string[] {
  assertMonthArgs(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(toDayKey(year, month, d));
  }
  return dates;
}
