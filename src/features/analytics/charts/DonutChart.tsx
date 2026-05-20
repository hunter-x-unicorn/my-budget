import { CHART_COLORS, type ChartSlice } from "./palette";

type DonutSegment = {
  name: string;
  value: number;
  path: string;
  color: string;
  pct: number;
};

type DonutChartProps = {
  slices: ChartSlice[];
  size?: number;
  accent?: "expense" | "income";
};

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function DonutChart({
  slices,
  size = 200,
  accent = "expense",
}: DonutChartProps) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const stroke = size * 0.14;

  if (total <= 0) {
    return (
      <div className="chart-empty" style={{ width: size, height: size }}>
        <span>Нет данных</span>
      </div>
    );
  }

  const segments: DonutSegment[] = [];
  let startAngle = 0;
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i]!;
    const sweep = (slice.value / total) * 360;
    segments.push({
      name: slice.name,
      value: slice.value,
      path: arcPath(cx, cy, r, startAngle, startAngle + sweep - 0.2),
      color: CHART_COLORS[i % CHART_COLORS.length]!,
      pct: Math.round((slice.value / total) * 100),
    });
    startAngle += sweep;
  }

  return (
    <div className="donut-wrap">
      <svg
        className="donut-svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="Круговая диаграмма"
      >
        {segments.map((seg: DonutSegment) => (
          <path
            key={seg.name}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={cx}
          cy={cy}
          r={r - stroke / 2}
          className={`donut-hole donut-hole--${accent}`}
        />
      </svg>
      <ul className="donut-legend">
        {segments.slice(0, 8).map((seg: DonutSegment) => (
          <li key={seg.name}>
            <span className="donut-legend-dot" style={{ background: seg.color }} />
            <span className="donut-legend-name">{seg.name}</span>
            <span className="donut-legend-pct">{seg.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
