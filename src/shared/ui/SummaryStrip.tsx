import type { KeyboardEvent } from "react";
import { formatMoney } from "../lib/format";
import {
  accountNeedsRecalcWarning,
  accountNeverRecalculated,
} from "../lib/accountRecalc";
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
  onAccountClick?: () => void;
};

export function SummaryStrip({
  summary,
  compact = false,
  variant = "default",
  account,
  currencyCode,
  onAccountClick,
}: SummaryStripProps) {
  const isAnalytics = variant === "analytics";
  const className = [
    "summary-cards",
    compact ? "summary-cards--compact" : "",
    isAnalytics ? "summary-cards--row" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const labelIsWarn =
    isAnalytics && account
      ? accountNeverRecalculated(account.lastRecalculatedAt)
      : false;
  const needsWarning =
    isAnalytics && account
      ? accountNeedsRecalcWarning(account.lastRecalculatedAt)
      : false;

  if (isAnalytics) {
    const accountLabel = account?.name ?? "Текущий";
    return (
      <section className={className}>
        <article
          className={`summary-card summary-card--account${onAccountClick ? " summary-card--clickable" : ""}`}
          {...(onAccountClick
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: onAccountClick,
                onKeyDown: (e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAccountClick();
                  }
                },
              }
            : {})}
        >
          <span
            className={[
              "summary-card-account-label",
              labelIsWarn ? "summary-card-label--warn" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {accountLabel}
          </span>
          <strong
            className={[
              "summary-card-account-balance",
              labelIsWarn ? "summary-card-balance--warn" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
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
