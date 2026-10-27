import { useState } from "react";
import GlobeView from "../components/GlobeView.jsx";
import StatusChip from "../components/StatusChip.jsx";

const STEPS = ["Upload", "Inspect", "Validate", "Map columns", "Parameters", "Preview", "Run", "Formulas", "Compare", "Export"];

function splitLine(line, sep) {
  return line.split(sep).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function guessColumn(headers, names) {
  const found = headers.find((h) => names.indexOf(h.toLowerCase()) >= 0);
  if (found) {
    return found;
  }
  return "";
}

export default function Studio() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [latCol, setLatCol] = useState("");
  const [lonCol, setLonCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [message, setMessage] = useState("");

  function onFile(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMessage("File is larger than 25 MB. Split it or use the API import.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setMessage("The file needs a header row and at least one data row.");
        return;
      }
      let sep = ",";
      if (lines[0].split(";").length > lines[0].split(",").length) {
        sep = ";";
      }
      const head = splitLine(lines[0], sep);
      const body = lines.slice(1, 20001).map((l) => splitLine(l, sep));
      setFileName(file.name);
      setHeaders(head);
      setRows(body);
      setLatCol(guessColumn(head, ["latitude", "lat", "y"]));
      setLonCol(guessColumn(head, ["longitude", "lon", "lng", "long", "x"]));
      setDateCol(guessColumn(head, ["date", "acq_date", "datetime", "time"]));
      setMessage("");
    };
    reader.readAsText(file);
  }

  const latIndex = headers.indexOf(latCol);
  const lonIndex = headers.indexOf(lonCol);
  const dateIndex = headers.indexOf(dateCol);
  const valid = [];
  let badCoords = 0;
  let missing = 0;
  rows.forEach((r, i) => {
    if (latIndex < 0 || lonIndex < 0) {
      return;
    }
    const lat = Number(r[latIndex]);
    const lon = Number(r[lonIndex]);
    if (r[latIndex] === "" || r[lonIndex] === "" || r[latIndex] === undefined) {
      missing = missing + 1;
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      badCoords = badCoords + 1;
      return;
    }
    let date = "";
    if (dateIndex >= 0) {
      date = r[dateIndex];
    }
    valid.push({ id: "u" + i, lat: lat, lon: lon, date: date, utc: "0000", lmst: 0, dn: "D", platform: "snpp", sensor: "USER", frp: 1, conf: "user", cls: "USER", country: "" });
  });

  let status = "SIMULATED";
  if (valid.length > 0) {
    status = "USER";
  }
  let step = 1;
  if (rows.length > 0) {
    step = 4;
  }
  if (valid.length > 0) {
    step = 6;
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">User data studio</div>
          <h1>Put your own data on the Earth</h1>
        </div>
        <StatusChip status={status} />
      </div>
      <div className="row" style={{ margin: "10px 0 18px" }}>
        {STEPS.map((s, i) => {
          let cls = "pill";
          if (i + 1 === step) {
            cls = "pill on";
          }
          return <span key={s} className={cls}><span className="mono dim">{i + 1}</span> {s}</span>;
        })}
      </div>
      <div className="split3">
        <div className="panel" style={{ position: "relative", height: 560, overflow: "hidden" }}>
          <GlobeView hostId="studio-globe" points={valid} layers={{ points: true, density: valid.length > 300, rings: false, borders: true }} colorBy="class" basemap="bluemarble" autoRotate={valid.length === 0} pointRadius={0.25} />
        </div>
        <div className="panel" style={{ padding: 16 }}>
          <div className="caps">1 · Upload CSV</div>
          <input type="file" accept=".csv,.tsv,.txt" onChange={onFile} style={{ marginTop: 10 }} />
          <p className="small dim" style={{ marginTop: 6 }}>Stays in your browser. Up to 25 MB, first 20,000 rows. Never sent to an AI model.</p>
          {message && <div className="note err small" style={{ marginTop: 10 }}>{message}</div>}
          {fileName && (
            <div style={{ marginTop: 16 }}>
              <div className="caps">2 · Map columns</div>
              {[["Latitude", latCol, setLatCol], ["Longitude", lonCol, setLonCol], ["Date", dateCol, setDateCol]].map((m) => (
                <div className="kv" key={m[0]}>
                  <span>{m[0]}</span>
                  <select className="pill" style={{ background: "transparent" }} value={m[1]} onChange={(event) => m[2](event.target.value)}>
                    <option value="">—</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
              <div className="caps" style={{ marginTop: 16 }}>3 · Validation</div>
              <div className="kv"><span>File</span><b>{fileName}</b></div>
              <div className="kv"><span>Rows read</span><b>{rows.length.toLocaleString()}</b></div>
              <div className="kv"><span>Valid points on globe</span><b>{valid.length.toLocaleString()}</b></div>
              <div className="kv"><span>Impossible coordinates</span><b>{badCoords}</b></div>
              <div className="kv"><span>Missing coordinates</span><b>{missing}</b></div>
              <div className="note info small" style={{ marginTop: 10 }}>Next (backend, M7): POST /api/studio/compare matches your points to FIRMS detections by distance and time window and returns a match table with lineage.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
