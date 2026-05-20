export type CurrencyPreset = {
  code: string;
  name: string;
  symbol: string;
};

/** Presets offered when adding a new currency (BYN is seeded on bootstrap). */
export const CURRENCY_PRESETS: CurrencyPreset[] = [
  { code: "USD", name: "доллар США", symbol: "$" },
  { code: "EUR", name: "евро", symbol: "€" },
  { code: "RUB", name: "российский рубль", symbol: "₽" },
  { code: "PLN", name: "злотый", symbol: "zł" },
  { code: "CNY", name: "юань", symbol: "¥" },
];
