import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import {
  currentMonth,
  formatMoney,
  formatMonthLabel,
  shiftMonth,
  type MonthState,
} from "../lib/budget";

export function AnalyticsTab({
  month,
  onMonthChange,
}: {
  month: MonthState;
  onMonthChange: (m: MonthState) => void;
}) {
  const bundle = useQuery(api.transactions.queries.monthBundle, month);
  const summary = bundle?.summary;
  const transactions = bundle?.transactions;

  const isCurrentMonth =
    month.year === currentMonth().year && month.month === currentMonth().month;

  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      { name: string; expense: number; income: number }
    >();
    for (const tx of transactions ?? []) {
      const key = tx.categoryId ?? tx.categoryName;
      const row = map.get(key) ?? {
        name: tx.categoryName,
        expense: 0,
        income: 0,
      };
      if (tx.type === "income") row.income += tx.amount;
      else row.expense += tx.amount;
      map.set(key, row);
    }
    return [...map.values()]
      .map((v) => ({
        name: v.name,
        total: v.expense + v.income,
        expense: v.expense,
        income: v.income,
      }))
      .sort((a, b) => b.expense - a.expense);
  }, [transactions]);

  const maxExpense = byCategory.reduce((m, c) => Math.max(m, c.expense), 1);

  return (
    <div className="tab-panel analytics-tab">
      <h2 className="panel-title">Аналитика</h2>

      <section className="month-nav">
        <button
          type="button"
          className="btn-icon"
          onClick={() => onMonthChange(shiftMonth(month.year, month.month, -1))}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <p className="month-nav-label">{formatMonthLabel(month.year, month.month)}</p>
        <button
          type="button"
          className="btn-icon"
          onClick={() => onMonthChange(shiftMonth(month.year, month.month, 1))}
          aria-label="Следующий месяц"
          disabled={isCurrentMonth}
        >
          ›
        </button>
      </section>

      <section className="summary-cards">
        <article className="summary-card balance">
          <span>Баланс</span>
          <strong>{formatMoney(summary?.balance ?? 0)}</strong>
        </article>
        <article className="summary-card income">
          <span>Доходы</span>
          <strong>{formatMoney(summary?.income ?? 0)}</strong>
        </article>
        <article className="summary-card expense">
          <span>Расходы</span>
          <strong>{formatMoney(summary?.expense ?? 0)}</strong>
        </article>
      </section>

      <section className="analytics-section">
        <h3>Расходы по категориям</h3>
        {byCategory.length === 0 && (
          <p className="empty-state">Нет данных за месяц</p>
        )}
        <ul className="analytics-bars">
          {byCategory
            .filter((c) => c.expense > 0)
            .map((cat) => (
              <li key={cat.name} className="analytics-bar-row">
                <div className="analytics-bar-label">
                  <span>{cat.name}</span>
                  <span className="analytics-bar-value">
                    {formatMoney(cat.expense)}
                  </span>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{ width: `${(cat.expense / maxExpense) * 100}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

