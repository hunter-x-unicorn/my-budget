import { formatMoney } from "../../../shared/lib/format";
import { CHART_COLORS, type ChartSlice } from "./palette";

type BarChartProps = {
  slices: ChartSlice[];
  accent?: "expense" | "income" | "neutral";
  maxItems?: number;
};

export function BarChart({
  slices,
  accent = "expense",
  maxItems = 10,
}: BarChartProps) {
  const items = slices.slice(0, maxItems);
  const max = items.reduce((m, s) => Math.max(m, s.value), 0) || 1;

  if (items.length === 0) {
    return <p className="empty-state">Нет данных за месяц</p>;
  }

  return (
    <ul className={`chart-bars chart-bars--${accent}`}>
      {items.map((slice, i) => (
        <li key={slice.name} className="chart-bar-row">
          <div className="chart-bar-label">
            <span>{slice.name}</span>
            <span className="chart-bar-value">{formatMoney(slice.value)}</span>
          </div>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{
                width: `${(slice.value / max) * 100}%`,
                background: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
