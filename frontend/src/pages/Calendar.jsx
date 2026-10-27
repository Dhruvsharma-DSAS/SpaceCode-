import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CalendarHeatmap, { rampColor } from "../components/CalendarHeatmap.jsx";
import StatusChip from "../components/StatusChip.jsx";
import Badge from "../components/Badge.jsx";
import { loadCalendar } from "../api/data.js";
import { statusOf } from "../api/client.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildValues(data, mode, metric) {
  return data.years.map((year, yi) => {
    return data.modis[yi].map((m, mi) => {
      const v = data.viirs[yi][mi];
      const em = data.exposure_modis[yi][mi];
      const ev = data.exposure_viirs[yi][mi];
      let count = m;
      let exposure = em;
      if (mode === "harmonised") {
        if (year >= 2012) {
          count = v;
          exposure = ev;
        } else {
          count = m * data.k_demo;
        }
      } else if (mode === "viirs") {
        if (year < 2012) {
          return null;
        }
        count = v;
        exposure = ev;
      }
      if (metric === "rate") {
        if (!exposure) {
          return null;
        }
        return count / exposure;
      }
      return count;
    });
  });
}

export default function Calendar() {
  const params = useParams();
  const navigate = useNavigate();
  const region = params.region || "world";
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [mode, setMode] = useState("raw");
  const [metric, setMetric] = useState("count");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadCalendar(region).then((result) => {
      setData(result.data);
      setMeta(result.meta);
    });
  }, [region]);

  if (!data) {
    return <div className="page"><p className="dim">Loading calendar…</p></div>;
  }

  const values = buildValues(data, mode, metric);
  const fixedScale = buildValues(data, "harmonised", metric);
  let maxValue = 1;
  fixedScale.forEach((row) => row.forEach((v) => {
    if (v !== null && v > maxValue) {
      maxValue = v;
    }
  }));

  let unit = "cell-days";
  if (metric === "rate") {
    unit = "cell-days per valid day";
  }

  let detail = <p className="dim small">Click a month to inspect it.</p>;
  if (selected) {
    const yi = data.years.indexOf(selected.year);
    const mi = selected.month;
    const history = data.years.map((y, i) => values[i][mi]).filter((v, i) => v !== null && data.years[i] !== selected.year);
    const sorted = history.slice().sort((a, b) => a - b);
    let median = null;
    if (sorted.length > 0) {
      median = sorted[Math.floor(sorted.length / 2)];
    }
    let valueText = "no valid coverage";
    if (selected.value !== null && selected.value !== undefined) {
      valueText = selected.value.toFixed(2) + " " + unit;
    }
    let viirsRaw = "—";
    if (selected.year >= 2012) {
      viirsRaw = data.viirs[yi][mi];
    }
    let medianText = "—";
    if (median !== null) {
      medianText = median.toFixed(2);
    }
    let source = "MODIS × k (estimate)";
    if (selected.year >= 2012 || mode === "raw") {
      source = "observed";
    }
    if (mode === "raw" && selected.year < 2012) {
      source = "MODIS observed (raw)";
    }
    detail = (
      <div>
        <h3 style={{ fontSize: 22, fontWeight: 300, fontFamily: "var(--font-display)" }}>{MONTH_NAMES[mi]} {selected.year}</h3>
        <div className="kv"><span>Value</span><b>{valueText}</b></div>
        <div className="kv"><span>Origin</span><b>{source}</b></div>
        <div className="kv"><span>MODIS raw</span><b>{data.modis[yi][mi]}</b></div>
        <div className="kv"><span>VIIRS raw</span><b>{viirsRaw}</b></div>
        <div className="kv"><span>Exposure MODIS / VIIRS</span><b>{data.exposure_modis[yi][mi]} / {data.exposure_viirs[yi][mi]} days</b></div>
        <div className="kv"><span>Median same month (others)</span><b>{medianText}</b></div>
        <div className="kv"><span>k used (demo)</span><b>{data.k_demo}</b></div>
        <div className="note warn small" style={{ marginTop: 10 }}>Simulated world from the atlas baseline ladder. Real values come from GET /api/calendar/{region} after the FIRMS archive run.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="eyebrow">Historical fire calendar · {region}</div>
          <h1>25 years, one honest scale</h1>
        </div>
        <div className="row">
          <StatusChip status={statusOf(meta)} />
          <Badge kind="SIMULATED_DEMO" />
        </div>
      </div>
      <p className="lead">Switch from raw to harmonised: the step at 2012 (when VIIRS starts) fades while the seasons stay. Colours use one fixed scale for every year. Hatched cells mean no valid observation — never zero.</p>
      <div className="row" style={{ margin: "18px 0" }}>
        <div className="seg">
          {[["raw", "Raw (each sensor)"], ["harmonised", "Harmonised"], ["viirs", "VIIRS only"]].map((opt) => {
            let cls = "";
            if (mode === opt[0]) {
              cls = "on";
            }
            return <button key={opt[0]} className={cls} onClick={() => setMode(opt[0])}>{opt[1]}</button>;
          })}
        </div>
        <div className="seg">
          {[["count", "Cell-days"], ["rate", "Exposure rate"]].map((opt) => {
            let cls = "";
            if (metric === opt[0]) {
              cls = "on";
            }
            return <button key={opt[0]} className={cls} onClick={() => setMetric(opt[0])}>{opt[1]}</button>;
          })}
        </div>
        <button className="btn small" onClick={() => navigate("/explore")}>Open on the globe</button>
      </div>
      <div className="split3">
        <div className="panel" style={{ padding: 16 }}>
          <CalendarHeatmap years={data.years} values={values} maxValue={maxValue} unit={unit} onSelect={setSelected} selected={selected} seamYear={2012} cell={44} />
          <div className="row small dim" style={{ marginTop: 10 }}>
            <span>low</span>
            <span style={{ width: 160, height: 8, borderRadius: 4, background: "linear-gradient(90deg," + rampColor(0) + "," + rampColor(0.5) + "," + rampColor(1) + ")" }} />
            <span>high (fixed across years)</span>
            <span style={{ width: 14, height: 10, background: "repeating-linear-gradient(45deg,#141b2b 0 3px,#5b6780 3px 5px)", marginLeft: 12 }} />
            <span>no valid coverage</span>
          </div>
        </div>
        <div className="panel" style={{ padding: 16 }}>
          <div className="caps">Cell inspector</div>
          <div style={{ marginTop: 10 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
}
