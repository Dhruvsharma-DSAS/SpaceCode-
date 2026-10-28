import { useNavigate } from "react-router-dom";
import StatusChip from "./StatusChip.jsx";
import { CLASS_LABELS, CLASS_COLORS, SENSOR_COLORS } from "../lib/colors.js";
import { formatHour } from "../lib/geo.js";

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
function Sec(props) {
  return <div className="lp-sec" style={{ marginTop: 20 }}>{props.children}</div>;
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
  points.forEach((p) => {
    bySensor[p.sensor] = (bySensor[p.sensor] || 0) + 1;
  });
  return (
    <div>
      <div className="insp-title">{props.scopeName}</div>
      <div className="insp-sub">{points.length.toLocaleString()} hot pixels · {props.period}</div>
      <div className="split2" style={{ gap: 10, marginTop: 14 }}>
        <div className="tile"><div className="big" style={{ color: "var(--modis)" }}>{bySensor.MODIS.toLocaleString()}</div><div className="lbl">MODIS 1 km pixels</div></div>
        <div className="tile"><div className="big" style={{ color: "var(--viirs)" }}>{bySensor.VIIRS.toLocaleString()}</div><div className="lbl">VIIRS 375 m pixels</div></div>
      </div>
      <Sec>How to read the globe</Sec>
      <Row k="Column height" v="log(1 + FRP)" />
      <Row k="Hex column" v="pixels per H3 cell" />
      <Row k="Click anywhere" v="location card" />
      <div className="note info small" style={{ marginTop: 14 }}>Click any column, hex or place on the Earth. A card pins to that spot and this panel fills with its numbers.</div>
    </div>
  );
}

function ProbeDetail(props) {
  const navigate = useNavigate();
  const info = props.info;
  let mixLabel = "—";
  if (info.cell.n > 0) {
    mixLabel = (CLASS_LABELS[info.cell.mixKey] || info.cell.mixKey).split(" ")[0].toLowerCase() + " " + info.cell.mixShare + "%";
  }
  let daylight = "Night now";
  if (info.daylight) {
    daylight = "Day now";
  }
  let nearest = <Row k="Nearest hot pixel" v="none within 150 km" />;
  if (info.nearest) {
    nearest = <Row k="Nearest hot pixel" v={info.nearest.km.toFixed(1) + " km · " + info.nearest.sensor} />;
  }
  let maxFrp = "—";
  if (info.cell.n > 0) {
    maxFrp = info.cell.maxFrp.toFixed(1) + " MW";
  }
  let nightShare = "—";
  if (info.near.n > 0) {
    nightShare = Math.round((100 * info.near.night) / info.near.n) + "%";
  }
  let hexRows = null;
  if (info.hex) {
    hexRows = (
      <div>
        <Sec>Density hex (H3 res 3)</Sec>
        <Row k="Hot pixels in hex" v={info.hex.n.toLocaleString()} />
        <Row k="MODIS · VIIRS" v={info.hex.m + " · " + info.hex.v} />
        <Row k="Mean FRP" v={info.hex.meanFrp.toFixed(1) + " MW"} />
      </div>
    );
  }
  return (
    <div>
      <div className="insp-title">{info.place}</div>
      <div className="insp-sub">{info.lat.toFixed(3)}°, {info.lon.toFixed(3)}° · {daylight} · local solar {formatHour(info.lst)}</div>
      {hexRows}
      <Sec>This 0.1° cell · {info.cell.id}</Sec>
      <Row k="Cell area (F04)" v={Math.round(info.cell.area) + " km²"} />
      <Row k={"Fire cell-days · " + props.period} v={info.cell.days} />
      <Row k="Hot pixels" v={info.cell.n} />
      <Row k="Max FRP" v={maxFrp} />
      <Row k="Source mix (demo)" v={mixLabel} style={{ color: CLASS_COLORS[info.cell.mixKey] }} />
      <Sec>Within 50 km</Sec>
      <Row k="Hot pixels" v={info.near.n.toLocaleString()} />
      <Row k="MODIS · VIIRS" v={info.near.m + " · " + info.near.v} />
      <Row k="Night share" v={nightShare} />
      {nearest}
      <Sec>Needs the archive run</Sec>
      <Row k="Clear-sky cell-days" v={<span>— <small>Earth Engine</small></span>} />
      <Row k="Rate (fire / clear)" v={<span>— <small>F09</small></span>} />
      <Row k="Harmonised (VIIRS-eq)" v={<span>— <small>k, F14</small></span>} />
      <div className="insp-actions">
        <button className="btn" onClick={() => navigate("/calendar/world")}>Open calendar</button>
        <button className="btn" onClick={() => downloadCsv(info.nearRows, "chronos_" + info.cell.id + "_50km.csv")}>Export CSV</button>
        <button className="btn small" onClick={() => props.onClear()} aria-label="Clear location">✕</button>
      </div>
    </div>
  );
}

export default function Inspector(props) {
  let body = <Summary points={props.points} period={props.period} scopeName={props.scopeName} />;
  let title = "Scope summary";
  if (props.info) {
    body = <ProbeDetail info={props.info} onClear={props.onClear} period={props.period} />;
    title = "Location inspector";
  }

  let lastRow = <Row k="Burning often peaks" v="after 15:00" style={{ color: "var(--modis)" }} />;
  if (props.info && props.info.cellTimes.length > 0) {
    lastRow = <Row k="Seen here at (local)" v={props.info.cellTimes.slice(0, 4).map(formatHour).join(" · ")} style={{ color: "var(--modis)" }} />;
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
      <section className="panel" aria-label="Sensors over this place">
        <div className="panel-h">
          <span className="caps" style={{ color: "var(--text)" }}>Sensors over this place</span>
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
