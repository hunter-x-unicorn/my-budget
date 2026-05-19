import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { useMonth } from "../../shared/hooks/useMonth";
import { formatMoney } from "../../shared/lib/budget";
import { MonthNavigator } from "../../shared/ui/MonthNavigator";
import { SummaryStrip } from "../../shared/ui/SummaryStrip";

export function AnalyticsScreen() {
  const { month } = useMonth();
  const bundle = useQuery(api.transactions.queries.monthBundle, month);
  const summary = bundle?.summary;
  const transactions = bundle?.transactions;

  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      { name: string; expense: number; income: number }
    >();
    for (const tx of transactions ?? []) {
      const key = tx.categoryId;
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
      <MonthNavigator />
      <SummaryStrip summary={summary} />

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
