import { formatMoney } from "../lib/format";
import { accountNeedsRecalcWarning } from "../lib/accountRecalc";
import type { MonthSummary } from "../types/budget";

type AccountSummary = {
  name: string;
  balance: number;
  lastRecalculatedAt?: number;
};

type SummaryStripProps = {
  summary?: MonthSummary;
  /** Compact labels for table tab (+ / − icons) */
  compact?: boolean;
  /** Analytics: счёт + доходы + расходы в одну линию */
  variant?: "default" | "analytics";
  account?: AccountSummary;
  currencyCode?: string;
};

export function SummaryStrip({
  summary,
  compact = false,
  variant = "default",
  account,
  currencyCode,
}: SummaryStripProps) {
  const isAnalytics = variant === "analytics";
  const className = [
    "summary-cards",
    compact ? "summary-cards--compact" : "",
    isAnalytics ? "summary-cards--row" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const needsWarning =
    isAnalytics && account
      ? accountNeedsRecalcWarning(account.lastRecalculatedAt)
      : false;

  if (isAnalytics) {
    return (
      <section className={className}>
        <article className="summary-card summary-card--account">
          <span>{account?.name ?? "Текущий"}</span>
          <strong>
            {formatMoney(account?.balance ?? 0, false, currencyCode)}
            {needsWarning && (
              <span
                className="summary-card-warn"
                title="Сверьте остаток: перерасчёт не делался или прошло больше 2 недель"
                aria-label="Нужен перерасчёт счёта"
              >
                !
              </span>
            )}
          </strong>
        </article>
        <article className="summary-card income">
          <span>Доходы</span>
          <strong>{formatMoney(summary?.income ?? 0, false, currencyCode)}</strong>
        </article>
        <article className="summary-card expense">
          <span>Расходы</span>
          <strong>{formatMoney(summary?.expense ?? 0, false, currencyCode)}</strong>
        </article>
      </section>
    );
  }

  return (
    <section className={className}>
      <article className="summary-card balance">
        <span>Баланс</span>
        <strong>{formatMoney(summary?.balance ?? 0, false, currencyCode)}</strong>
      </article>
      <article className="summary-card income">
        <span>{compact ? "+" : "Доходы"}</span>
        <strong>{formatMoney(summary?.income ?? 0, compact, currencyCode)}</strong>
      </article>
      <article className="summary-card expense">
        <span>{compact ? "−" : "Расходы"}</span>
        <strong>{formatMoney(summary?.expense ?? 0, compact, currencyCode)}</strong>
      </article>
    </section>
  );
}
