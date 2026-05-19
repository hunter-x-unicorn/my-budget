export type TransactionType = "income" | "expense";

export type MonthState = { year: number; month: number };

const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

export function formatMonthLabel(year: number, month: number) {
  return monthFormatter.format(new Date(year, month, 1));
}

export function formatMoney(amount: number, compact = false) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: compact && Math.abs(amount) >= 1000 ? 0 : 0,
    notation: compact && Math.abs(amount) >= 10000 ? "compact" : "standard",
  }).format(amount);
}

export function formatTableDay(year: number, month: number, day: number) {
  const d = new Date(year, month, day);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(d);
}

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

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${month}-${day}`;
}

export function formatCellAmount(income: number, expense: number) {
  const parts: string[] = [];
  if (income > 0) parts.push(`+${Math.round(income)}`);
  if (expense > 0) parts.push(`−${Math.round(expense)}`);
  return parts.join("\n") || "";
}
