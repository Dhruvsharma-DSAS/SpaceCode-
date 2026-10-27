const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const RAMP = [[22, 32, 58], [74, 42, 58], [154, 59, 59], [224, 112, 58], [255, 196, 107], [255, 241, 201]];

export function rampColor(t) {
  const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const rgb = [0, 1, 2].map((k) => Math.round(RAMP[i][k] + f * (RAMP[i + 1][k] - RAMP[i][k])));
  return "rgb(" + rgb.join(",") + ")";
}

export default function CalendarHeatmap(props) {
  const cell = props.cell || 30;
  const left = 46;
  const top = 22;
  const width = left + 12 * cell + 44;
  const height = top + props.years.length * (cell * 0.62) + 10;
  const rowH = cell * 0.62;
  return (
    <div className="cal-wrap">
      <svg width={width} height={height} role="img" aria-label="Year by month calendar heatmap">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#141b2b" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#5b6780" strokeWidth="2" />
          </pattern>
        </defs>
        {MONTHS.map((m, i) => (
          <text key={"m" + i} x={left + i * cell + cell / 2} y={14} fill="var(--dim)" fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)">{m}</text>
        ))}
        {props.years.map((year, yi) => (
          <g key={year}>
            <text x={left - 8} y={top + yi * rowH + rowH * 0.72} fill="var(--dim)" fontSize="10.5" textAnchor="end" fontFamily="var(--font-mono)">{year}</text>
            {MONTHS.map((m, mi) => {
              const value = props.values[yi][mi];
              let fill = "url(#hatch)";
              let label = year + "-" + (mi + 1) + ": no valid coverage";
              if (value !== null && value !== undefined) {
                fill = rampColor(Math.sqrt(value / props.maxValue));
                label = year + "-" + (mi + 1) + ": " + value.toFixed(1) + " " + props.unit;
              }
              let stroke = "none";
              if (props.selected && props.selected.year === year && props.selected.month === mi) {
                stroke = "#ffffff";
              }
              return (
                <rect
                  key={mi}
                  className="cell"
                  x={left + mi * cell + 1}
                  y={top + yi * rowH + 1}
                  width={cell - 2}
                  height={rowH - 2}
                  rx="2"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="2"
                  tabIndex="0"
                  aria-label={label}
                  onClick={() => props.onSelect({ year: year, month: mi, value: value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      props.onSelect({ year: year, month: mi, value: value });
                    }
                  }}
                >
                  <title>{label}</title>
                </rect>
              );
            })}
          </g>
        ))}
        {props.seamYear && props.years.indexOf(props.seamYear) > 0 && (
          <g>
            <line x1={left - 4} x2={left + 12 * cell} y1={top + props.years.indexOf(props.seamYear) * rowH} y2={top + props.years.indexOf(props.seamYear) * rowH} stroke="var(--viirs)" strokeDasharray="5 4" strokeWidth="1.5" />
            <text x={left + 12 * cell + 4} y={top + props.years.indexOf(props.seamYear) * rowH + 4} fill="var(--viirs)" fontSize="10" fontFamily="var(--font-mono)">2012</text>
          </g>
        )}
      </svg>
    </div>
  );
}
