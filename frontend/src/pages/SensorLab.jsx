import { useEffect, useState } from "react";
import GlobeView from "../components/GlobeView.jsx";
import Badge from "../components/Badge.jsx";
import { loadDetections, loadSatellites } from "../api/data.js";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "../lib/colors.js";

export default function SensorLab() {
  const [points, setPoints] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [sensor, setSensor] = useState("MODIS");

  useEffect(() => {
    loadDetections("ALL", 1).then((result) => setPoints(result.data));
    loadSatellites().then((result) => setSatellites(result.data));
  }, []);

  const shown = points.filter((p) => p.sensor === sensor);
  const byPlatform = {};
  points.forEach((p) => {
    if (!byPlatform[p.platform]) {
      byPlatform[p.platform] = { n: 0, frp: 0, night: 0 };
    }
    byPlatform[p.platform].n = byPlatform[p.platform].n + 1;
    byPlatform[p.platform].frp = byPlatform[p.platform].frp + p.frp;
    if (p.dn === "N") {
      byPlatform[p.platform].night = byPlatform[p.platform].night + 1;
    }
  });
  let maxN = 1;
  Object.keys(byPlatform).forEach((k) => {
    if (byPlatform[k].n > maxN) {
      maxN = byPlatform[k].n;
    }
  });

  return (
    <div className="page">
      <div className="eyebrow">Satellite comparison lab</div>
      <h1>Same Earth, two rulers</h1>
      <p className="lead">Switch sensors and watch the same regions light up differently. VIIRS 375 m sees many small fires that MODIS 1 km misses — the reason the exchange rate k is above 1.</p>
      <div className="row" style={{ margin: "16px 0" }}>
        <div className="seg">
          {["MODIS", "VIIRS"].map((s) => {
            let cls = "";
            if (sensor === s) {
              cls = "on";
            }
            return <button key={s} className={cls} onClick={() => setSensor(s)}>{s}</button>;
          })}
        </div>
        <Badge kind="SIMULATED_DEMO" />
      </div>
      <div className="split3">
        <div className="panel" style={{ position: "relative", height: 560, overflow: "hidden" }}>
          <GlobeView hostId="sensor-globe" points={shown} satellites={satellites.filter((s) => s.instrument === sensor)} layers={{ points: true, density: true, rings: false, borders: true, tracks: true }} colorBy="platform" basemap="dark" autoRotate={true} startLat={5} startLng={20} />
        </div>
        <div className="panel" style={{ padding: 16 }}>
          <div className="caps">Detections by platform (demo)</div>
          {Object.keys(PLATFORM_LABELS).map((id) => {
            const row = byPlatform[id] || { n: 0, frp: 0, night: 0 };
            let meanFrp = "—";
            if (row.n > 0) {
              meanFrp = (row.frp / row.n).toFixed(1);
            }
            return (
              <div key={id} style={{ marginTop: 12 }}>
                <div className="row small" style={{ justifyContent: "space-between" }}>
                  <span><span style={{ color: PLATFORM_COLORS[id] }}>●</span> {PLATFORM_LABELS[id]}</span>
                  <span className="mono">{row.n.toLocaleString()} · FRP {meanFrp} MW</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--line)", marginTop: 5 }}>
                  <div style={{ height: 6, borderRadius: 3, width: (100 * row.n) / maxN + "%", background: PLATFORM_COLORS[id] }} />
                </div>
              </div>
            );
          })}
          <div className="caps" style={{ marginTop: 20 }}>Exchange rate k (per stratum)</div>
          <div className="note warn small" style={{ marginTop: 8 }}>k_day and k_night stay empty until the FIRMS archive run (milestone M3). Never shown without an interval.</div>
          <div className="kv"><span>k day (95% band)</span><b>— needs archive run</b></div>
          <div className="kv"><span>k night (95% band)</span><b>— needs archive run</b></div>
          <div className="kv"><span>Method</span><b>NB offset model, pooled log k</b></div>
        </div>
      </div>
    </div>
  );
}
