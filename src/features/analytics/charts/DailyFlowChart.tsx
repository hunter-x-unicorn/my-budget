import { formatMoney } from "../../../shared/lib/format";
import { sumMoney } from "../../../shared/lib/money";

export type DailyPoint = {
  date: string;
  income: number;
  expense: number;
};

type DailyFlowChartProps = {
  points: DailyPoint[];
};

/** dateKey format: YYYY-M-D (day without zero-padding) */
function dayLabel(dateKey: string) {
  const day = Number(dateKey.split("-")[2]);
  return Number.isFinite(day) ? String(day) : dateKey;
}

export function DailyFlowChart({ points }: DailyFlowChartProps) {
  const max = points.reduce(
    (m, p) => Math.max(m, p.income, p.expense),
    1,
  );

  const totalIncome = sumMoney(points.map((point) => point.income));
  const totalExpense = sumMoney(points.map((point) => point.expense));

  return (
    <div className="daily-flow">
      <div className="daily-flow-bars" role="img" aria-label="Доходы и расходы по дням">
        {points.map((p) => (
          <div key={p.date} className="daily-flow-col" title={p.date}>
            <div className="daily-flow-pair">
              <div
                className="daily-flow-bar daily-flow-bar--income"
                style={{ height: `${(p.income / max) * 100}%` }}
              />
              <div
                className="daily-flow-bar daily-flow-bar--expense"
                style={{ height: `${(p.expense / max) * 100}%` }}
              />
            </div>
            <span className="daily-flow-day">{dayLabel(p.date)}</span>
          </div>
        ))}
      </div>
      <div className="daily-flow-legend">
        <span>
          <i className="dot dot--income" /> доход
        </span>
        <span>
          <i className="dot dot--expense" /> расход
        </span>
      </div>
      <div className="daily-flow-totals">
        <span>
          Σ доход:{" "}
          <strong>{formatMoney(totalIncome)}</strong>
        </span>
        <span>
          Σ расход:{" "}
          <strong>{formatMoney(totalExpense)}</strong>
        </span>
      </div>
    </div>
  );
}
