import { SENSOR_COLORS, CLASS_COLORS, CLASS_LABELS } from "../lib/colors.js";

const MODIS = "#c98418";
const VIIRS = "#1a9dba";
const FRP_EDGES = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500];
const OVERPASSES = [[1.5, "01:30"], [10.5, "10:30"], [13.5, "13:30"], [22.5, "22:30"]];

function niceMax(v) {
  if (v <= 5) {
    return 5;
  }
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const steps = [1, 2, 2.5, 5, 10];
  const found = steps.find((s) => s * p >= v);
  return found * p;
}

export function HourChart(props) {
  const W = 760;
  const H = 240;
  const L = 40;
  const B = 28;
  const T = 26;
  const m = new Array(24).fill(0);
  const v = new Array(24).fill(0);
  props.points.forEach((p) => {
    if (typeof p.lmst !== "number") {
      return;
    }
    const h = Math.floor(((p.lmst % 24) + 24) % 24);
    if (p.sensor === "MODIS") {
      m[h] = m[h] + 1;
    } else {
      v[h] = v[h] + 1;
    }
  });
  let max = 1;
  for (let i = 0; i < 24; i = i + 1) {
    max = Math.max(max, m[i], v[i]);
  }
  const top = niceMax(max);
  const cw = (W - L - 10) / 24;
  const y = (n) => T + (H - T - B) * (1 - n / top);
  const x = (h) => L + h * cw;
  const bars = [];
  for (let i = 0; i < 24; i = i + 1) {
    bars.push(<rect key={"m" + i} x={x(i) + cw * 0.12} y={y(m[i])} width={cw * 0.36} height={H - B - y(m[i])} fill={MODIS} rx="1.5"><title>{String(i).padStart(2, "0") + ":00 · MODIS " + m[i]}</title></rect>);
    bars.push(<rect key={"v" + i} x={x(i) + cw * 0.5} y={y(v[i])} width={cw * 0.36} height={H - B - y(v[i])} fill={VIIRS} rx="1.5"><title>{String(i).padStart(2, "0") + ":00 · VIIRS " + v[i]}</title></rect>);
  }
  return (
    <svg className="chart" viewBox={"0 0 " + W + " " + H} role="img" aria-label="Detections by local solar hour, MODIS and VIIRS">
      <rect x={x(14)} y={T} width={cw * 8} height={H - T - B} fill="rgba(255,77,94,0.07)" />
      <text x={x(14) + 6} y={T + 14} className="lab">NO OVERPASS 14–22 h</text>
      <g className="grid">
        {[0, 0.5, 1].map((f) => <line key={f} x1={L} x2={W - 10} y1={y(top * f)} y2={y(top * f)} />)}
      </g>
      {[0, 0.5, 1].map((f) => <text key={"t" + f} x={L - 8} y={y(top * f) + 3} textAnchor="end">{Math.round(top * f)}</text>)}
      {bars}
      {OVERPASSES.map((o) => (
        <g key={o[1]}>
          <line x1={x(o[0])} x2={x(o[0])} y1={T - 4} y2={H - B} stroke="rgba(230,237,243,0.35)" strokeDasharray="3 4" />
          <text x={x(o[0])} y={T - 9} textAnchor="middle" className="lab">{o[1]}</text>
        </g>
      ))}
      {[0, 4, 8, 12, 16, 20, 24].map((h) => <text key={"h" + h} x={x(h)} y={H - 8} textAnchor="middle">{String(h).padStart(2, "0") + ":00"}</text>)}
    </svg>
  );
}

export function DailyChart(props) {
  const W = 420;
  const H = 220;
  const L = 36;
  const B = 26;
  const T = 12;
  const days = props.days;
  const rows = days.map((d) => {
    const c = { MODIS: 0, VIIRS: 0 };
    props.points.forEach((p) => {
      if (p.date === d) {
        c[p.sensor] = c[p.sensor] + 1;
      }
    });
    return { d: d, m: c.MODIS, v: c.VIIRS };
  });
  let max = 1;
  rows.forEach((r) => {
    max = Math.max(max, r.m + r.v);
  });
  const top = niceMax(max);
  const cw = (W - L - 6) / Math.max(1, rows.length);
  const h = (n) => ((H - T - B) * n) / top;
  return (
    <svg className="chart" viewBox={"0 0 " + W + " " + H} role="img" aria-label="Detections per day by sensor">
      <g className="grid">
        {[0, 0.5, 1].map((f) => <line key={f} x1={L} x2={W - 6} y1={H - B - h(top * f)} y2={H - B - h(top * f)} />)}
      </g>
      {[0, 0.5, 1].map((f) => <text key={"t" + f} x={L - 8} y={H - B - h(top * f) + 3} textAnchor="end">{Math.round(top * f)}</text>)}
      {rows.map((r, i) => {
        const bx = L + i * cw + cw * 0.2;
        const bw = cw * 0.6;
        return (
          <g key={r.d}>
            <rect x={bx} y={H - B - h(r.m)} width={bw} height={h(r.m)} fill={MODIS}><title>{r.d + " · MODIS " + r.m}</title></rect>
            <rect x={bx} y={H - B - h(r.m) - h(r.v)} width={bw} height={h(r.v)} fill={VIIRS}><title>{r.d + " · VIIRS " + r.v}</title></rect>
            <text x={bx + bw / 2} y={H - 8} textAnchor="middle">{r.d.slice(5)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function FrpChart(props) {
  const W = 420;
  const H = 220;
  const L = 36;
  const B = 26;
  const T = 12;
  const bins = FRP_EDGES.map((e, i) => {
    let label = "≥" + e;
    if (i < FRP_EDGES.length - 1) {
      label = e + "–" + FRP_EDGES[i + 1];
    }
    return { label: label, lo: e, hi: FRP_EDGES[i + 1] || Infinity, m: 0, v: 0 };
  });
  props.points.forEach((p) => {
    const f = p.frp || 0;
    const bin = bins.find((b) => f >= b.lo && f < b.hi);
    if (!bin) {
      return;
    }
    if (p.sensor === "MODIS") {
      bin.m = bin.m + 1;
    } else {
      bin.v = bin.v + 1;
    }
  });
  let max = 1;
  bins.forEach((b) => {
    max = Math.max(max, b.m, b.v);
  });
  const top = niceMax(max);
  const cw = (W - L - 6) / bins.length;
  const h = (n) => ((H - T - B) * n) / top;
  return (
    <svg className="chart" viewBox={"0 0 " + W + " " + H} role="img" aria-label="Fire radiative power distribution by sensor">
      <g className="grid">
        {[0, 0.5, 1].map((f) => <line key={f} x1={L} x2={W - 6} y1={H - B - h(top * f)} y2={H - B - h(top * f)} />)}
      </g>
      {[0, 0.5, 1].map((f) => <text key={"t" + f} x={L - 8} y={H - B - h(top * f) + 3} textAnchor="end">{Math.round(top * f)}</text>)}
      {bins.map((b, i) => {
        const bx = L + i * cw;
        return (
          <g key={b.label}>
            <rect x={bx + cw * 0.12} y={H - B - h(b.m)} width={cw * 0.36} height={h(b.m)} fill={MODIS}><title>{b.label + " MW · MODIS " + b.m}</title></rect>
            <rect x={bx + cw * 0.5} y={H - B - h(b.v)} width={cw * 0.36} height={h(b.v)} fill={VIIRS}><title>{b.label + " MW · VIIRS " + b.v}</title></rect>
            <text x={bx + cw / 2} y={H - 8} textAnchor="middle">{b.lo}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SourceBars(props) {
  const counts = {};
  props.points.forEach((p) => {
    counts[p.cls] = (counts[p.cls] || 0) + 1;
  });
  const total = Math.max(1, props.points.length);
  return (
    <div className="hbars">
      {Object.keys(CLASS_LABELS).filter((k) => counts[k]).map((k) => (
        <div className="hbar" key={k}>
          <span>{CLASS_LABELS[k]}</span>
          <span className="t"><i style={{ width: (100 * counts[k]) / total + "%", background: CLASS_COLORS[k] }} /></span>
          <b>{counts[k].toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

export function CountryBars(props) {
  const by = {};
  props.points.forEach((p) => {
    if (!p.country) {
      return;
    }
    if (!by[p.country]) {
      by[p.country] = { MODIS: 0, VIIRS: 0 };
    }
    by[p.country][p.sensor] = by[p.country][p.sensor] + 1;
  });
  const rows = Object.keys(by).map((k) => [k, by[k].MODIS, by[k].VIIRS]).sort((a, b) => b[1] + b[2] - (a[1] + a[2])).slice(0, props.limit || 8);
  let max = 1;
  rows.forEach((r) => {
    max = Math.max(max, r[1] + r[2]);
  });
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r[0]}>
          <span>{r[0]}</span>
          <span className="t">
            <i style={{ width: (100 * r[1]) / max + "%", background: SENSOR_COLORS.MODIS }} />
            <i style={{ width: (100 * r[2]) / max + "%", background: SENSOR_COLORS.VIIRS }} />
          </span>
          <b>{(r[1] + r[2]).toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

export function DayNight(props) {
  let day = 0;
  let night = 0;
  props.points.forEach((p) => {
    if (p.dn === "N") {
      night = night + 1;
    } else {
      day = day + 1;
    }
  });
  const total = Math.max(1, day + night);
  return (
    <div>
      <div className="split-num">
        <div><b>{day.toLocaleString()}</b><span>day passes · {Math.round((100 * day) / total)}%</span></div>
        <div><b>{night.toLocaleString()}</b><span>night passes · {Math.round((100 * night) / total)}%</span></div>
      </div>
      <div className="hbar" style={{ marginTop: 14, gridTemplateColumns: "minmax(0,1fr)" }}>
        <span className="t"><i style={{ width: (100 * day) / total + "%", background: "#ffd36b" }} /><i style={{ width: (100 * night) / total + "%", background: "#8f7dff" }} /></span>
      </div>
    </div>
  );
}
