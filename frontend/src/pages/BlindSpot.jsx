import { useEffect, useState } from "react";
import Badge from "../components/Badge.jsx";
import { loadDetections } from "../api/data.js";

const WINDOWS = [
  ["Terra", 10.0, 10.8, "#ffb547"],
  ["Aqua", 13.2, 14.0, "#ff8a3d"],
  ["VIIRS ×3", 13.0, 14.0, "#3dd6f5"],
  ["Terra night", 22.0, 22.8, "#ffb547"],
  ["VIIRS night", 1.1, 2.0, "#3dd6f5"],
];

function polar(cx, cy, r, hour) {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function arcPath(cx, cy, r1, r2, h1, h2) {
  const a = polar(cx, cy, r2, h1);
  const b = polar(cx, cy, r2, h2);
  const c = polar(cx, cy, r1, h2);
  const d = polar(cx, cy, r1, h1);
  return "M" + a[0] + "," + a[1] + " A" + r2 + "," + r2 + " 0 0 1 " + b[0] + "," + b[1] + " L" + c[0] + "," + c[1] + " A" + r1 + "," + r1 + " 0 0 0 " + d[0] + "," + d[1] + " Z";
}

export default function BlindSpot() {
  const [points, setPoints] = useState([]);
  const [peak, setPeak] = useState(16.3);

  useEffect(() => {
    loadDetections("ALL", 1).then((result) => setPoints(result.data));
  }, []);

  const hours = new Array(24).fill(0);
  points.forEach((p) => {
    hours[Math.floor(p.lmst) % 24] = hours[Math.floor(p.lmst) % 24] + 1;
  });
  let maxHour = 1;
  hours.forEach((h) => {
    if (h > maxHour) {
      maxHour = h;
    }
  });

  const cx = 210;
  const cy = 210;
  const curve = [];
  for (let i = 0; i <= 240; i = i + 1) {
    const hour = (i / 240) * 24;
    const g = Math.exp(-0.5 * Math.pow((hour - peak) / 1.6, 2));
    const p = polar(cx, cy, 80 + 100 * g, hour);
    curve.push(p[0].toFixed(1) + "," + p[1].toFixed(1));
  }
  let seen = 0;
  [[10.0, 10.8], [13.0, 14.0]].forEach((w) => {
    for (let h = w[0]; h < w[1]; h = h + 0.01) {
      seen = seen + Math.exp(-0.5 * Math.pow((h - peak) / 1.6, 2)) * 0.01;
    }
  });
  const share = (100 * seen) / (1.6 * Math.sqrt(2 * Math.PI));

  return (
    <div className="page">
      <div className="eyebrow">Blind spot observatory</div>
      <h1>When can the satellites not see?</h1>
      <p className="lead">Polar satellites look at each place at fixed local solar times. If burning happens later in the afternoon, few hot pixels are recorded. Move the peak to see how much of a burning curve falls inside the windows.</p>
      <div className="split2" style={{ marginTop: 18 }}>
        <div className="panel" style={{ padding: 16 }}>
          <svg width="420" height="420" role="img" aria-label="24-hour coverage clock">
            <circle cx={cx} cy={cy} r={190} fill="none" stroke="var(--line-strong)" />
            <circle cx={cx} cy={cy} r={80} fill="none" stroke="var(--line)" />
            {WINDOWS.map((w) => <path key={w[0]} d={arcPath(cx, cy, 80, 190, w[1], w[2])} fill={w[3]} opacity="0.35" />)}
            <polyline points={curve.join(" ")} fill="none" stroke="var(--fire)" strokeWidth="2" strokeDasharray="6 4" />
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
              const p = polar(cx, cy, 204, h);
              return <text key={h} x={p[0]} y={p[1] + 4} fill="var(--dim)" fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)">{h}</text>;
            })}
            <text x={cx} y={cy - 6} fill="var(--text)" fontSize="26" textAnchor="middle" fontFamily="var(--font-display)">{share.toFixed(0)}%</text>
            <text x={cx} y={cy + 14} fill="var(--dim)" fontSize="10.5" textAnchor="middle">of the curve in day windows</text>
          </svg>
          <label className="small dim" style={{ display: "block", marginTop: 8 }}>Burning peak (local solar hour): <b className="mono">{peak.toFixed(1)}</b></label>
          <input type="range" min="8" max="20" step="0.1" value={peak} onChange={(event) => setPeak(Number(event.target.value))} style={{ width: "100%" }} />
          <div className="row" style={{ marginTop: 8 }}><Badge kind="PROPOSED_UNVALIDATED" text="SCENARIO, NOT MEASUREMENT" /></div>
        </div>
        <div className="panel" style={{ padding: 16 }}>
          <div className="caps">Detections by local solar hour (demo)</div>
          <svg width="100%" height="180" viewBox="0 0 480 180" style={{ marginTop: 10 }}>
            {hours.map((h, i) => <rect key={i} x={i * 20 + 2} y={170 - (150 * h) / maxHour} width="16" height={(150 * h) / maxHour} rx="3" fill="var(--viirs-mark)" />)}
            {[0, 6, 12, 18].map((h) => <text key={h} x={h * 20 + 10} y={180} fill="var(--dim)" fontSize="10" textAnchor="middle">{h}</text>)}
          </svg>
          <p className="small dim" style={{ marginTop: 6 }}>Detections pile up at overpass times because that is when the satellites look — not because fires only burn then.</p>
          <div className="caps" style={{ marginTop: 18 }}>Four reasons fires go unseen</div>
          <div className="cards" style={{ marginTop: 10 }}>
            <div className="card"><h3>Timing</h3><p>Burning between passes.</p></div>
            <div className="card"><h3>Clouds & smoke</h3><p>No view of the ground.</p></div>
            <div className="card"><h3>Too small or cool</h3><p>Below the pixel's detection limit.</p></div>
            <div className="card"><h3>Canopy</h3><p>Ground fires under trees.</p></div>
          </div>
          <div className="kv" style={{ marginTop: 12 }}><span>Burned-area / detection flag B</span><b>PENDING (needs MCD64A1 run)</b></div>
        </div>
      </div>
    </div>
  );
}
