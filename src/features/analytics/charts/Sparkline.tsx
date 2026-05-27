type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
};

export function Sparkline({
  values,
  width = 280,
  height = 56,
  stroke = "#6366f1",
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg className="sparkline" width={width} height={height} aria-hidden>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.1)"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const isFlat = max === min;
  const range = max - min || 1;
  const pad = 4;
  const step = (width - pad * 2) / (values.length - 1);
  const midY = height / 2;

  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = isFlat
        ? midY
        : pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const area = `${pad},${height - pad} ${points} ${pad + (values.length - 1) * step},${height - pad}`;

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
