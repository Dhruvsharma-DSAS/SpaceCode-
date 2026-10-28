import { useEffect, useState } from "react";
import GlobeView from "../components/GlobeView.jsx";
import LayerPanel from "../components/LayerPanel.jsx";
import Inspector from "../components/Inspector.jsx";
import Legend from "../components/Legend.jsx";
import TimeStrip from "../components/TimeStrip.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { HourChart, DailyChart, FrpChart, SourceBars, CountryBars, DayNight } from "../components/ExplorerCharts.jsx";
import { loadDetections, loadCountries, loadSatellites, loadRegions, loadCalendar } from "../api/data.js";
import { statusOf } from "../api/client.js";
import { cellIndex, cellAreaKm2, haversineKm, nearestPoint, countryAt, isDaylight, inBbox, localSolarHour } from "../lib/geo.js";
import { subsolarPoint } from "../lib/orbits.js";

const PLACES = [
  { name: "Whole Earth", lat: 15, lng: 40, altitude: 2.4 },
  { name: "Africa", lat: -5, lng: 22, altitude: 1.5 },
  { name: "Amazon", lat: -10, lng: -55, altitude: 1.4 },
  { name: "South Asia", lat: 25, lng: 80, altitude: 1.3 },
  { name: "Australia", lat: -22, lng: 134, altitude: 1.5 },
  { name: "Siberia", lat: 60, lng: 110, altitude: 1.5 },
  { name: "N. America", lat: 45, lng: -105, altitude: 1.7 },
];

const WORLD = { id: "world", name: "Whole Earth", country: null, bbox: [-180, -90, 180, 90] };

function passesQa(point, qa) {
  if (qa === "all") {
    return true;
  }
  if (point.sensor === "MODIS") {
    const value = Number(point.conf);
    if (qa === "high") {
      return value >= 80;
    }
    return value >= 30;
  }
  if (qa === "high") {
    return point.conf === "h";
  }
  return point.conf === "n" || point.conf === "h";
}

function bboxText(bbox) {
  return bbox.map((v) => Number(v).toFixed(1)).join(", ");
}

function viewOfBbox(bbox) {
  const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
  let altitude = span / 30;
  if (altitude < 0.85) {
    altitude = 0.85;
  }
  if (altitude > 2.4) {
    altitude = 2.4;
  }
  return { lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2, altitude: altitude };
}

function bboxOfFeature(feature) {
  const box = [180, 90, -180, -90];
  function walk(coords) {
    if (typeof coords[0] === "number") {
      box[0] = Math.min(box[0], coords[0]);
      box[1] = Math.min(box[1], coords[1]);
      box[2] = Math.max(box[2], coords[0]);
      box[3] = Math.max(box[3], coords[1]);
      return;
    }
    coords.forEach(walk);
  }
  walk(feature.geometry.coordinates);
  return box;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function median(values) {
  if (values.length === 0) {
    return null;
  }
  const s = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 0) {
    return (s[mid - 1] + s[mid]) / 2;
  }
  return s[mid];
}

function describeProbe(probe, points, countries) {
  const cell = cellIndex(probe.lat, probe.lon, 0.1);
  const props = countryAt(countries, probe.lat, probe.lon);
  let place = "Open ocean";
  if (props) {
    place = props.name;
  }
  const now = new Date();
  const lst = localSolarHour(now.getUTCHours() + now.getUTCMinutes() / 60, probe.lon);
  const daylight = isDaylight(probe.lat, probe.lon, subsolarPoint(now));
  const near = { n: 0, m: 0, v: 0, night: 0 };
  const nearRows = [];
  const inCell = [];
  points.forEach((p) => {
    if (Math.abs(p.lat - probe.lat) > 1) {
      return;
    }
    const km = haversineKm(probe.lat, probe.lon, p.lat, p.lon);
    if (km <= 50) {
      near.n = near.n + 1;
      nearRows.push(p);
      if (p.sensor === "MODIS") {
        near.m = near.m + 1;
      } else {
        near.v = near.v + 1;
      }
      if (p.dn === "N") {
        near.night = near.night + 1;
      }
    }
    const c = cellIndex(p.lat, p.lon, 0.1);
    if (c && c.id === cell.id) {
      inCell.push(p);
    }
  });
  const days = [];
  const mix = {};
  let maxFrp = 0;
  inCell.forEach((p) => {
    if (days.indexOf(p.date) < 0) {
      days.push(p.date);
    }
    mix[p.cls] = (mix[p.cls] || 0) + 1;
    maxFrp = Math.max(maxFrp, p.frp || 0);
  });
  let mixKey = "UNKNOWN";
  let mixCount = 0;
  Object.keys(mix).forEach((k) => {
    if (mix[k] > mixCount) {
      mixKey = k;
      mixCount = mix[k];
    }
  });
  let nearest = null;
  const np = nearestPoint(points, probe.lat, probe.lon, 150);
  if (np) {
    nearest = { km: haversineKm(probe.lat, probe.lon, np.lat, np.lon), sensor: np.sensor };
  }
  let hex = null;
  if (probe.hex && probe.hex.length > 0) {
    let frp = 0;
    let m = 0;
    probe.hex.forEach((p) => {
      frp = frp + (p.frp || 0);
      if (p.sensor === "MODIS") {
        m = m + 1;
      }
    });
    hex = { n: probe.hex.length, m: m, v: probe.hex.length - m, meanFrp: frp / probe.hex.length };
  }
  const cellTimes = inCell.filter((p) => typeof p.lmst === "number").map((p) => p.lmst).sort((a, b) => a - b);
  return {
    lat: probe.lat,
    lon: probe.lon,
    place: place,
    lst: lst,
    daylight: daylight,
    cell: { id: cell.id, area: cellAreaKm2(cell.row, 0.1), n: inCell.length, days: days.length, maxFrp: maxFrp, mixKey: mixKey, mixShare: Math.round((100 * mixCount) / Math.max(1, inCell.length)) },
    near: near,
    nearRows: nearRows,
    nearest: nearest,
    hex: hex,
    cellTimes: cellTimes,
  };
}

function pinHtml(info) {
  const rows = [
    ["Position", info.lat.toFixed(2) + "°, " + info.lon.toFixed(2) + "°"],
    ["0.1° cell", info.cell.id],
    ["Pixels in cell", String(info.cell.n)],
    ["Pixels ≤ 50 km", String(info.near.n)],
  ];
  if (info.hex) {
    rows.push(["Hex pixels", String(info.hex.n)]);
  }
  let when = "night";
  if (info.daylight) {
    when = "day";
  }
  return '<div class="pc-k">Location · ' + when + "</div>" +
    '<div class="pc-t">' + escapeHtml(info.place) + "</div>" +
    rows.map((r) => '<div class="pc-r"><span>' + r[0] + "</span><b>" + escapeHtml(r[1]) + "</b></div>").join("");
}

export default function Explorer() {
  const [all, setAll] = useState([]);
  const [meta, setMeta] = useState(null);
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState("");
  const [layers, setLayers] = useState({ viirs: true, modis: true, density: true, terminator: true, tracks: true, borders: true, rings: true, points: true });
  const [dn, setDn] = useState("both");
  const [qa, setQa] = useState("nominal");
  const [colorBy, setColorBy] = useState("frp");
  const [basemap, setBasemap] = useState("atlas");
  const [day, setDay] = useState("all");
  const [probe, setProbe] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [region, setRegion] = useState(WORLD);
  const [query, setQuery] = useState("Whole Earth");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    document.title = "Explorer · FIREWORK CHRONOS";
    loadDetections("VIIRS_NOAA20_NRT,VIIRS_SNPP_NRT,MODIS_NRT", 7)
      .then((result) => {
        setAll(result.data);
        setMeta(result.meta);
      })
      .catch((err) => setError(String(err)));
    loadCountries().then((result) => setCountries(result.data.features)).catch(() => setCountries([]));
    loadSatellites().then((result) => setSatellites(result.data)).catch(() => setSatellites([]));
    loadRegions().then((result) => setRegions(result.data)).catch(() => setRegions([]));
    loadCalendar("world").then((result) => setCalendar(result.data)).catch(() => setCalendar(null));
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        setProbe(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const days = [];
  all.forEach((p) => {
    if (days.indexOf(p.date) < 0) {
      days.push(p.date);
    }
  });
  days.sort();

  const filtered = all.filter((p) => {
    if (p.sensor === "VIIRS" && !layers.viirs) {
      return false;
    }
    if (p.sensor === "MODIS" && !layers.modis) {
      return false;
    }
    if (dn !== "both" && p.dn !== dn) {
      return false;
    }
    if (day !== "all" && p.date !== day) {
      return false;
    }
    return passesQa(p, qa);
  });

  let scope = filtered;
  let scopeName = "Whole Earth";
  if (region.id !== "world") {
    scope = filtered.filter((p) => inBbox(p, region.bbox));
    scopeName = query;
  }

  const counts = {};
  all.forEach((p) => {
    if (!counts[p.date]) {
      counts[p.date] = { total: 0, MODIS: 0, VIIRS: 0 };
    }
    counts[p.date].total = counts[p.date].total + 1;
    counts[p.date][p.sensor] = counts[p.date][p.sensor] + 1;
  });

  let period = "7 days";
  if (days.length > 0) {
    period = days[0].slice(5) + " → " + days[days.length - 1].slice(5);
  }
  if (day !== "all") {
    period = day;
  }

  let highlight = "";
  if (region.country) {
    const match = countries.find((f) => f.properties.name === region.country);
    if (match) {
      highlight = match.properties.iso3;
    }
  }
  if (region.iso3) {
    highlight = region.iso3;
  }

  let info = null;
  let pin = null;
  if (probe) {
    info = describeProbe(probe, filtered, countries);
    pin = { lat: probe.lat, lon: probe.lon, html: pinHtml(info) };
  }

  const m = scope.filter((p) => p.sensor === "MODIS").length;
  const v = scope.length - m;
  const night = scope.filter((p) => p.dn === "N").length;
  const total = Math.max(1, scope.length);
  const medFrp = median(scope.map((p) => p.frp || 0));
  let medFrpText = "—";
  if (medFrp !== null) {
    medFrpText = medFrp.toFixed(1);
  }

  const q = query.trim().toLowerCase();
  const options = [];
  if (searching) {
    [WORLD].concat(regions.filter((r) => r.id !== "world")).forEach((r) => {
      let label = r.name;
      if (r.country && r.country !== r.name) {
        label = r.name + ", " + r.country;
      }
      if (!q || label.toLowerCase().indexOf(q) >= 0) {
        options.push({ key: "r-" + r.id, label: label, note: "region", region: r });
      }
    });
    if (q.length > 1) {
      countries.filter((f) => f.properties.name.toLowerCase().indexOf(q) >= 0).slice(0, 6).forEach((f) => {
        options.push({ key: "c-" + f.properties.iso3, label: f.properties.name, note: "country", region: { id: f.properties.iso3, name: f.properties.name, iso3: f.properties.iso3, bbox: bboxOfFeature(f) } });
      });
    }
  }

  function chooseRegion(next) {
    setRegion(next);
    let label = next.name;
    if (next.country && next.country !== next.name) {
      label = next.name + ", " + next.country;
    }
    setQuery(label);
    setSearching(false);
    setProbe(null);
    setFlyTo(viewOfBbox(next.bbox));
  }

  function onSearchKey(event) {
    if (event.key === "Enter" && options.length > 0) {
      chooseRegion(options[0].region);
    }
    if (event.key === "Escape") {
      setSearching(false);
    }
  }

  let trackNote = "illustrative";
  if (satellites.length > 0 && satellites[0].tle1) {
    trackNote = "TLE";
  }

  let errorNote = null;
  if (error) {
    errorNote = <div className="note err small">Detections could not load ({error}). Nothing is drawn rather than zeros.</div>;
  }

  let searchList = null;
  if (searching && options.length > 0) {
    searchList = (
      <ul className="search-list" role="listbox">
        {options.slice(0, 9).map((opt) => (
          <li key={opt.key}><button onMouseDown={(event) => { event.preventDefault(); chooseRegion(opt.region); }}>{opt.label}<span>{opt.note}</span></button></li>
        ))}
      </ul>
    );
  }

  let selectedPoint = null;
  if (probe && probe.point) {
    selectedPoint = probe.point;
  }

  return (
    <div className="ex-page">
      <header className="ex-head">
        <div>
          <div className="eyebrow">Analysis · {scopeName}</div>
          <h1 className="ex-title" aria-label="Explorer">Explorer</h1>
        </div>
        <div>
          <p className="ex-lede">Every hot pixel from MODIS and VIIRS on one 3D Earth. Columns rise with fire radiative power and density hexes show where detections cluster. Click any place to read its 0.1° cell, its 50 km neighbourhood and which satellites can see it.</p>
          <div className="ex-tags">
            <StatusChip status={statusOf(meta)} />
            <span className="chip"><span className="dot" />{period}</span>
            <span className="chip"><span className="dot" style={{ background: "var(--modis)" }} />MODIS 1 km</span>
            <span className="chip"><span className="dot" style={{ background: "var(--viirs)" }} />VIIRS 375 m</span>
          </div>
        </div>
      </header>

      {errorNote}

      <div className="ex-kpis">
        <div className="kpi"><div className="k">Hot pixels in scope</div><div className="v">{scope.length.toLocaleString()}</div><div className="s">{scopeName} · {period}</div></div>
        <div className="kpi"><div className="k">MODIS · 1 km</div><div className="v" style={{ color: "var(--modis)" }}>{m.toLocaleString()}</div><div className="s">{Math.round((100 * m) / total)}% of scope</div></div>
        <div className="kpi"><div className="k">VIIRS · 375 m</div><div className="v" style={{ color: "var(--viirs)" }}>{v.toLocaleString()}</div><div className="s">{Math.round((100 * v) / total)}% of scope</div></div>
        <div className="kpi"><div className="k">Night detections</div><div className="v">{Math.round((100 * night) / total)}%</div><div className="s">{night.toLocaleString()} night-pass pixels</div></div>
        <div className="kpi"><div className="k">Median FRP</div><div className="v">{medFrpText}<span className="faint" style={{ fontSize: 16 }}> MW</span></div><div className="s">sensor-native, not harmonised</div></div>
      </div>

      <div className="ex-work">
        <LayerPanel
          layers={layers}
          onLayers={setLayers}
          dn={dn}
          onDn={setDn}
          qa={qa}
          onQa={setQa}
          colorBy={colorBy}
          onColorBy={setColorBy}
          basemap={basemap}
          onBasemap={setBasemap}
          trackNote={trackNote}
          places={PLACES}
          onFly={(place) => {
            setProbe(null);
            setRegion(WORLD);
            setQuery(place.name);
            setFlyTo(place);
          }}
        />
        <section className="ex-globe" aria-label="Interactive 3D Earth with fire detections">
          <GlobeView
            hostId="explorer-globe"
            points={filtered}
            countries={countries}
            satellites={satellites}
            layers={layers}
            colorBy={colorBy}
            basemap={basemap}
            highlight={highlight}
            terminator={layers.terminator}
            selected={selectedPoint}
            keepCamera={true}
            pin={pin}
            onProbe={setProbe}
            autoRotate={!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !probe && region.id === "world"}
            flyTo={flyTo}
            startLat={18}
            startLng={60}
            startAltitude={2.2}
            pointRadius={0.16}
          />
          <div className="ex-globe-top">
            <div className="searchbox">
              <span aria-hidden="true">⌕</span>
              <input value={query} aria-label="Search a region or country" onFocus={(event) => { setSearching(true); event.target.select(); }} onBlur={() => setSearching(false)} onChange={(event) => { setQuery(event.target.value); setSearching(true); }} onKeyDown={onSearchKey} />
              <span className="bbox" title="Bounding box west, south, east, north">{bboxText(region.bbox)}</span>
              {searchList}
            </div>
          </div>
          <div className="ex-globe-bottom">
            <span className="ex-hint">Drag to rotate · scroll to zoom · click a place · Esc clears · © Natural Earth · tracks {trackNote}</span>
            <Legend colorBy={colorBy} density={layers.density} />
          </div>
        </section>
        <Inspector points={scope} info={info} onClear={() => setProbe(null)} status={statusOf(meta)} period={period} scopeName={scopeName} />
      </div>

      <div className="ex-strip">
        <TimeStrip calendar={calendar} days={days} day={day} onDay={setDay} counts={counts} />
      </div>

      <section className="ex-section" aria-label="Analysis of the current scope">
        <div className="ex-section-head">
          <div>
            <div className="eyebrow">Analysis of the scope · {scopeName}</div>
            <h2>What the satellites recorded</h2>
          </div>
          <div className="ex-tags" style={{ marginTop: 0 }}>
            <StatusChip status={statusOf(meta)} />
            <span className="chip"><span className="dot" />{scope.length.toLocaleString()} hot pixels · {period}</span>
          </div>
        </div>
        <div className="ex-grid">
          <div className="chart-card wide">
            <h3>When the satellites look</h3>
            <p className="sub">Detections by local solar hour (F01). Dashed lines are the overpass times; nothing passes between 14 and 22 h.</p>
            <div className="legend-row"><span><i style={{ background: "#c98418" }} />MODIS</span><span><i style={{ background: "#1a9dba" }} />VIIRS</span></div>
            <HourChart points={scope} />
          </div>
          <div className="chart-card">
            <h3>Day and night passes</h3>
            <p className="sub">Share of hot pixels from day and night overpasses.</p>
            <DayNight points={scope} />
            <h3 style={{ marginTop: 26 }}>What is burning</h3>
            <p className="sub">Probable source class (demo labels, abstains as UNKNOWN).</p>
            <SourceBars points={scope} />
          </div>
          <div className="chart-card">
            <h3>Detections per day</h3>
            <p className="sub">Hot pixels by acquisition date, stacked by sensor.</p>
            <DailyChart points={scope} days={days} />
          </div>
          <div className="chart-card">
            <h3>Fire radiative power</h3>
            <p className="sub">Pixels per FRP band (MW). Raw FRP is not comparable across sensors.</p>
            <FrpChart points={scope} />
          </div>
          <div className="chart-card">
            <h3>Where in the scope</h3>
            <p className="sub">Countries with the most hot pixels, split MODIS / VIIRS.</p>
            <CountryBars points={scope} limit={7} />
          </div>
        </div>
      </section>
    </div>
  );
}
