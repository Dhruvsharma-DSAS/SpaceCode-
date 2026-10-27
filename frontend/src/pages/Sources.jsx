import { useEffect, useState } from "react";
import GlobeView from "../components/GlobeView.jsx";
import Badge from "../components/Badge.jsx";
import { loadDetections } from "../api/data.js";
import { CLASS_COLORS, CLASS_LABELS } from "../lib/colors.js";

export default function Sources() {
  const [points, setPoints] = useState([]);
  const [cls, setCls] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadDetections("ALL", 1).then((result) => setPoints(result.data));
  }, []);

  const shown = points.filter((p) => cls === "all" || p.cls === cls);

  let evidence = <p className="dim small">Click a dot to see evidence for and against each source class.</p>;
  if (selected) {
    const site = points.filter((p) => Math.abs(p.lat - selected.lat) < 0.02 && Math.abs(p.lon - selected.lon) < 0.02);
    const nights = site.filter((p) => p.dn === "N").length;
    const days = {};
    site.forEach((p) => {
      days[p.date] = true;
    });
    const persistence = Object.keys(days).length / 7;
    let nightShare = "—";
    if (site.length >= 3) {
      nightShare = Math.round((100 * nights) / site.length) + "%";
    }
    evidence = (
      <div>
        <h3>{selected.country || "Unassigned"} · {selected.lat.toFixed(3)}, {selected.lon.toFixed(3)}</h3>
        <div className="kv"><span>Demo label</span><b style={{ color: CLASS_COLORS[selected.cls] }}>{CLASS_LABELS[selected.cls]}</b></div>
        <div className="kv"><span>Detections at site (±2 km)</span><b>{site.length}</b></div>
        <div className="kv"><span>Persistence (days hot / 7)</span><b>{persistence.toFixed(2)}</b></div>
        <div className="kv"><span>Night share</span><b>{nightShare}</b></div>
        <div className="kv"><span>Context L (OSM)</span><b>no data (needs Overpass run)</b></div>
        <div className="note info small" style={{ marginTop: 10 }}>Rule flow: persistence ≥ 0.20 and night ≥ 20% → static/industrial (hypothesis) · cropland in season → crop · forest → wildland · otherwise UNKNOWN.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="eyebrow">Fire source intelligence</div>
      <h1>What is burning?</h1>
      <p className="lead">Crop residue, forest, industrial heat — or honestly UNKNOWN. Labels here are demo labels; the real classifier abstains when evidence is weak.</p>
      <div className="row" style={{ margin: "16px 0" }}>
        {["all", "AGRICULTURAL", "WILDLAND", "INDUSTRIAL", "UNKNOWN"].map((k) => {
          let c = "pill";
          if (cls === k) {
            c = "pill on";
          }
          let label = "All";
          if (k !== "all") {
            label = CLASS_LABELS[k];
          }
          return <button key={k} className={c} onClick={() => setCls(k)}>{k !== "all" && <span className="sw" style={{ background: CLASS_COLORS[k] }} />}{label}</button>;
        })}
        <Badge kind="SIMULATED_DEMO" />
      </div>
      <div className="split3">
        <div className="panel" style={{ position: "relative", height: 560, overflow: "hidden" }}>
          <GlobeView hostId="sources-globe" points={shown} layers={{ points: true, rings: false, borders: true }} colorBy="class" basemap="dark" selected={selected} onSelect={setSelected} autoRotate={false} startLat={25} startLng={45} />
        </div>
        <div className="panel" style={{ padding: 16 }}>
          <div className="caps">Evidence card</div>
          <div style={{ marginTop: 10 }}>{evidence}</div>
        </div>
      </div>
    </div>
  );
}
