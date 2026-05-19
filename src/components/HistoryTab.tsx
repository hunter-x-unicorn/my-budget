import { useMutation, useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import {
  currentMonth,
  formatDayHeader,
  formatListTime,
  formatMoney,
  formatMonthLabel,
  shiftMonth,
  type MonthState,
} from "../lib/budget";

export function HistoryTab({
  month,
  onMonthChange,
}: {
  month: MonthState;
  onMonthChange: (m: MonthState) => void;
}) {
  const bundle = useQuery(api.transactions.queries.monthBundle, month);
  const transactions = bundle?.transactions;
  const remove = useMutation(api.transactions.mutations.remove);

  const isCurrentMonth =
    month.year === currentMonth().year && month.month === currentMonth().month;

  const grouped = useMemo(() => {
    const groups = new Map<string, NonNullable<typeof transactions>>();
    for (const t of transactions ?? []) {
      const key = new Date(t.date).toDateString();
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    return [...groups.entries()].map(([key, items]) => ({
      key,
      label: formatDayHeader(items[0]!.date),
      items,
    }));
  }, [transactions]);

  return (
    <div className="tab-panel history-tab">
      <h2 className="panel-title">История</h2>

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

      {transactions === undefined && (
        <p className="empty-state">Загрузка…</p>
      )}

      {transactions?.length === 0 && (
        <p className="empty-state">За этот месяц операций пока нет.</p>
      )}

      {grouped.map((group) => (
        <section key={group.key} className="day-group">
          <p className="day-label">{group.label}</p>
          <ul className="tx-list">
            {group.items.map((tx) => (
              <li key={tx._id} className="tx-item">
                <div className="tx-main">
                  <span className={`tx-icon ${tx.type}`} aria-hidden>
                    {tx.type === "income" ? "↑" : "↓"}
                  </span>
                  <div className="tx-info">
                    <span className="tx-category">{tx.categoryName}</span>
                    {tx.note && <span className="tx-note">{tx.note}</span>}
                    <span className="tx-time">{formatListTime(tx.date)}</span>
                  </div>
                  <span className={`tx-amount ${tx.type}`}>
                    {tx.type === "income" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </span>
                </div>
                <button
                  type="button"
                  className="tx-delete"
                  aria-label="Удалить"
                  onClick={() => void remove({ id: tx._id })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
