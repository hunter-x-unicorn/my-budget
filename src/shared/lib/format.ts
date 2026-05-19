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

export function formatCellAmount(income: number, expense: number) {
  const parts: string[] = [];
  if (income > 0) parts.push(`+${Math.round(income)}`);
  if (expense > 0) parts.push(`−${Math.round(expense)}`);
  return parts.join("\n") || "";
}
