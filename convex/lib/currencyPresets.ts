/** ISO codes with display metadata (also used when seeding from exchange DB). */
export const CURRENCY_PRESETS: Array<{
  code: string;
  name: string;
  symbol: string;
}> = [
  { code: "BYN", name: "белорусский рубль", symbol: "Br" },
  { code: "USD", name: "доллар США", symbol: "$" },
  { code: "EUR", name: "евро", symbol: "€" },
  { code: "RUB", name: "российский рубль", symbol: "₽" },
  { code: "PLN", name: "злотый", symbol: "zł" },
  { code: "CNY", name: "юань", symbol: "¥" },
  { code: "GBP", name: "фунт стерлингов", symbol: "£" },
  { code: "CHF", name: "швейцарский франк", symbol: "CHF" },
  { code: "JPY", name: "иена", symbol: "¥" },
  { code: "UAH", name: "гривна", symbol: "₴" },
];

export function presetForCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return (
    CURRENCY_PRESETS.find((p) => p.code === normalized) ?? {
      code: normalized,
      name: normalized,
      symbol: normalized,
    }
  );
}
