import { formatMoney as formatMoneyImpl } from "./money";

const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

export function formatMonthLabel(year: number, month: number) {
  return monthFormatter.format(new Date(year, month, 1));
}

export function formatMoney(
  amount: number,
  compact = false,
  currencyCode?: string,
) {
  return formatMoneyImpl(amount, { compact, currencyCode });
}

export function formatTableDay(year: number, month: number, day: number) {
  const d = new Date(year, month, day);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(d);
}

const dayHeaderFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  weekday: "short",
});

const listDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

export function formatDayHeader(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return dayHeaderFormatter.format(date);
}

export function formatListTime(timestamp: number) {
  return listDateFormatter.format(new Date(timestamp));
}

