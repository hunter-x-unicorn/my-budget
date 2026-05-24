const AMOUNT_SCALE = 100;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * AMOUNT_SCALE);
}

export function fromMinorUnits(minor: number): number {
  return minor / AMOUNT_SCALE;
}

export function roundMoney(amount: number): number {
  return fromMinorUnits(toMinorUnits(amount));
}

export function sumMoney(values: number[]): number {
  return fromMinorUnits(values.reduce((acc, value) => acc + toMinorUnits(value), 0));
}

export function addMoney(current: number, delta: number): number {
  return fromMinorUnits(toMinorUnits(current) + toMinorUnits(delta));
}

export function parseAmountInput(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return roundMoney(parsed);
}

export function formatMoney(
  amount: number,
  options?: {
    currencyCode?: string;
    compact?: boolean;
  },
): string {
  const currencyCode = options?.currencyCode ?? "BYN";
  const compact = options?.compact ?? false;
  const rounded = roundMoney(amount);
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: compact && Math.abs(rounded) >= 10000 ? 0 : 2,
    notation: compact && Math.abs(rounded) >= 10000 ? "compact" : "standard",
  }).format(rounded);
}
