import { formatMoney } from "../../../shared/lib/format";

export type DailyPoint = {
  date: string;
  income: number;
  expense: number;
};

type DailyFlowChartProps = {
  points: DailyPoint[];
};

function dayLabel(iso: string) {
  const [, , d] = iso.split("-");
  return d ?? iso;
}

export function DailyFlowChart({ points }: DailyFlowChartProps) {
  if (points.length === 0) {
    return <p className="empty-state">Нет операций за месяц</p>;
  }

  const max = points.reduce(
    (m, p) => Math.max(m, p.income, p.expense),
    1,
  );

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
          <strong>{formatMoney(points.reduce((s, p) => s + p.income, 0))}</strong>
        </span>
        <span>
          Σ расход:{" "}
          <strong>{formatMoney(points.reduce((s, p) => s + p.expense, 0))}</strong>
        </span>
      </div>
    </div>
  );
}
