import type { MonthState } from "../types/budget";

export function shiftMonth(year: number, month: number, delta: number): MonthState {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function currentMonth(): MonthState {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function toDateInputValue(timestamp: number) {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateInputValue(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

/** Same key format as Convex `dayKeyFromTimestamp` (month 0-based). */
export function dayKeyFromDateInput(value: string) {
  const d = new Date(fromDateInputValue(value));
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
