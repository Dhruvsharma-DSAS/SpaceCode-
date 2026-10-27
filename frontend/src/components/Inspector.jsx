import { useNavigate } from "react-router-dom";
import StatusChip from "./StatusChip.jsx";
import { CLASS_LABELS, CLASS_COLORS, SENSOR_COLORS } from "../lib/colors.js";
import { cellIndex, cellAreaKm2, formatHour } from "../lib/geo.js";

const OVERPASSES = [
  ["Terra MODIS", SENSOR_COLORS.MODIS, "~10:30", "~22:30"],
  ["Aqua MODIS", SENSOR_COLORS.MODIS, "~13:30", "~01:30"],
  ["S-NPP VIIRS", SENSOR_COLORS.VIIRS, "~13:30", "~01:30"],
  ["NOAA-20 / 21 VIIRS", SENSOR_COLORS.VIIRS, "~13:30", "~01:30"],
];

function Row(props) {
  return (
    <div className="kv">
      <span>{props.k}</span>
      <b style={props.style}>{props.v}</b>
    </div>
  );
}

function downloadCsv(rows, name) {
  const cols = ["id", "lat", "lon", "date", "utc", "lmst", "dn", "platform", "sensor", "frp", "conf", "cls", "country"];
  const lines = [cols.join(",")];
  rows.forEach((row) => {
    lines.push(cols.map((c) => {
      let v = row[c];
      if (v === undefined || v === null) {
        v = "";
      }
      return '"' + String(v).replace(/"/g, '""') + '"';
    }).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

function Summary(props) {
  const points = props.points;
  const bySensor = { MODIS: 0, VIIRS: 0 };
  const byClass = {};
  const byCountry = {};
  points.forEach((p) => {
    bySensor[p.sensor] = (bySensor[p.sensor] || 0) + 1;
    byClass[p.cls] = (byClass[p.cls] || 0) + 1;
    if (p.country) {
      byCountry[p.country] = (byCountry[p.country] || 0) + 1;
    }
  });
  const top = Object.keys(byCountry).map((k) => [k, byCountry[k]]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div>
      <div className="insp-title">{points.length.toLocaleString()}</div>
      <div className="insp-sub">hot pixels in the current filter · {props.period}</div>
      <div className="split2" style={{ gap: 10, marginTop: 14 }}>
        <div className="tile"><div className="big" style={{ color: "var(--modis)" }}>{bySensor.MODIS.toLocaleString()}</div><div className="lbl">MODIS 1 km pixels</div></div>
        <div className="tile"><div className="big" style={{ color: "var(--viirs)" }}>{bySensor.VIIRS.toLocaleString()}</div><div className="lbl">VIIRS 375 m pixels</div></div>
      </div>
      <div className="lp-sec">Probable source (demo labels)</div>
      {Object.keys(CLASS_LABELS).filter((k) => byClass[k]).map((k) => (
        <div key={k} style={{ marginTop: 9 }}>
          <div className="row small" style={{ justifyContent: "space-between" }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: CLASS_COLORS[k], marginRight: 7 }} />{CLASS_LABELS[k]}</span>
            <span className="mono">{byClass[k].toLocaleString()}</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "var(--line)", marginTop: 5 }}>
            <div style={{ height: 3, borderRadius: 2, width: (100 * byClass[k]) / Math.max(1, points.length) + "%", background: CLASS_COLORS[k], transition: "width 300ms" }} />
          </div>
        </div>
      ))}
      <div className="lp-sec">Most detections by country</div>
      {top.map((row) => <Row key={row[0]} k={row[0]} v={row[1].toLocaleString()} />)}
      <div className="note info small" style={{ marginTop: 14 }}>Click a dot, a column or any place on the Earth to open its 0.1° cell.</div>
    </div>
  );
}

function CellDetail(props) {
  const navigate = useNavigate();
  const p = props.point;
  const cell = cellIndex(p.lat, p.lon, 0.1);
  const area = cellAreaKm2(cell.row, 0.1);
  const inCell = props.allPoints.filter((q) => {
    const c = cellIndex(q.lat, q.lon, 0.1);
    return c && c.id === cell.id;
  });
  const days = [];
  const byClass = {};
  let maxFrp = 0;
  inCell.forEach((q) => {
    if (days.indexOf(q.date) < 0) {
      days.push(q.date);
    }
    byClass[q.cls] = (byClass[q.cls] || 0) + 1;
    if (q.frp > maxFrp) {
      maxFrp = q.frp;
    }
  });
  let mixKey = "UNKNOWN";
  let mixCount = 0;
  Object.keys(byClass).forEach((k) => {
    if (byClass[k] > mixCount) {
      mixKey = k;
      mixCount = byClass[k];
    }
  });
  const mixShare = Math.round((100 * mixCount) / Math.max(1, inCell.length));
  let mixLabel = CLASS_LABELS[mixKey] || mixKey;
  mixLabel = mixLabel.split(" ")[0].toLowerCase() + " " + mixShare + "%";
  const place = p.country || "Country not matched";

  return (
    <div>
      <div className="insp-title">Cell {cell.id}</div>
      <div className="insp-sub">{place} · 0.1° × 0.1° ≈ {Math.round(area)} km²</div>
      <div style={{ marginTop: 12 }}>
        <Row k={"Fire cell-days · " + props.period} v={days.length} />
        <Row k="Hot pixels in cell" v={inCell.length} />
        <Row k="Clear-sky cell-days" v={<span>— <small>needs EE</small></span>} />
        <Row k="Rate (fire / clear)" v={<span>— <small>pending</small></span>} />
        <Row k="Harmonised (VIIRS-eq)" v={<span>— <small>k pending</small></span>} />
        <Row k="Max FRP" v={maxFrp.toFixed(1) + " MW"} />
        <Row k="Source mix (demo)" v={mixLabel} style={{ color: CLASS_COLORS[mixKey] }} />
      </div>
      <div className="flagbox">Blind-spot check: satellites pass at about 10:30 and 13:30 local time, so burning late in the afternoon is often missed. Treat low counts here as a lower bound.</div>
      <div className="insp-actions">
        <button className="btn" onClick={() => navigate("/calendar/world")}>Open calendar</button>
        <button className="btn" onClick={() => downloadCsv(inCell, "chronos_cell_" + cell.id + ".csv")}>Export CSV</button>
        <button className="btn small" onClick={() => props.onClear()} aria-label="Close cell">✕</button>
      </div>
    </div>
  );
}

export default function Inspector(props) {
  let body = <Summary points={props.points} period={props.period} />;
  let title = "Earth summary";
  let cellTimes = [];
  if (props.selected) {
    body = <CellDetail point={props.selected} allPoints={props.points} onClear={props.onClear} period={props.period} />;
    title = "Cell inspector";
    const cell = cellIndex(props.selected.lat, props.selected.lon, 0.1);
    props.points.forEach((q) => {
      const c = cellIndex(q.lat, q.lon, 0.1);
      if (c && c.id === cell.id && typeof q.lmst === "number") {
        cellTimes.push(q.lmst);
      }
    });
    cellTimes.sort((a, b) => a - b);
  }

  let lastRow = <Row k="Burning often peaks" v="after 15:00" style={{ color: "var(--modis)" }} />;
  if (cellTimes.length > 0) {
    lastRow = <Row k="Seen here at (local)" v={cellTimes.slice(0, 4).map(formatHour).join(" · ")} style={{ color: "var(--modis)" }} />;
  }

  return (
    <div className="right">
      <section className="panel" aria-label={title}>
        <div className="panel-h">
          <span className="caps" style={{ color: "var(--text)" }}>{title}</span>
          <StatusChip status={props.status} />
        </div>
        <div className="panel-b">{body}</div>
      </section>
      <section className="panel" aria-label="Sensors over this cell">
        <div className="panel-h">
          <span className="caps" style={{ color: "var(--text)" }}>Sensors over this cell</span>
          <span className="mono small faint">day · night LST</span>
        </div>
        <div className="panel-b">
          {OVERPASSES.map((row) => (
            <div className="srow" key={row[0]}>
              <span className="nm"><i style={{ background: row[1] }} />{row[0]}</span>
              <b>{row[2]} <span className="faint">· {row[3]}</span></b>
            </div>
          ))}
          {lastRow}
        </div>
      </section>
    </div>
  );
}
