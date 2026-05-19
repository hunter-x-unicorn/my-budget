import { formatMoney } from "../lib/format";
import type { MonthSummary } from "../types/budget";

type SummaryStripProps = {
  summary?: MonthSummary;
  /** Compact labels for table tab (+ / − icons) */
  compact?: boolean;
};

export function SummaryStrip({ summary, compact = false }: SummaryStripProps) {
  const className = compact ? "summary-cards summary-cards--compact" : "summary-cards";

  return (
    <section className={className}>
      <article className="summary-card balance">
        <span>Баланс</span>
        <strong>{formatMoney(summary?.balance ?? 0)}</strong>
      </article>
      <article className="summary-card income">
        <span>{compact ? "+" : "Доходы"}</span>
        <strong>{formatMoney(summary?.income ?? 0, compact)}</strong>
      </article>
      <article className="summary-card expense">
        <span>{compact ? "−" : "Расходы"}</span>
        <strong>{formatMoney(summary?.expense ?? 0, compact)}</strong>
      </article>
    </section>
  );
}
