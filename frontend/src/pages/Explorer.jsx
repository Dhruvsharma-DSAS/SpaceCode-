import { useEffect, useState } from "react";
import GlobeView from "../components/GlobeView.jsx";
import LayerPanel from "../components/LayerPanel.jsx";
import Inspector from "../components/Inspector.jsx";
import Legend from "../components/Legend.jsx";
import TimeStrip from "../components/TimeStrip.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { loadDetections, loadCountries, loadSatellites, loadRegions, loadCalendar } from "../api/data.js";
import { statusOf } from "../api/client.js";

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

export default function Explorer() {
  const [all, setAll] = useState([]);
  const [meta, setMeta] = useState(null);
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [error, setError] = useState("");
  const [layers, setLayers] = useState({ viirs: true, modis: true, density: false, terminator: true, tracks: true, borders: true, rings: true, points: true });
  const [dn, setDn] = useState("both");
  const [qa, setQa] = useState("nominal");
  const [colorBy, setColorBy] = useState("frp");
  const [basemap, setBasemap] = useState("atlas");
  const [day, setDay] = useState("all");
  const [selected, setSelected] = useState(null);
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
    setSelected(null);
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

  let banner = null;
  if (meta && meta.demo) {
    banner = (
      <div className="note warn small" style={{ maxWidth: 440 }}>
        <b>SIMULATED DEMO DATA.</b> Dots sit in real fire regions but every value is synthetic. Add FIRMS_MAP_KEY to backend/.env and this switches to live NASA FIRMS automatically.
      </div>
    );
  }
  if (error) {
    banner = <div className="note err small">Could not load detections: {error}. Showing nothing rather than zeros.</div>;
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

  return (
    <div className="explorer">
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
          setSelected(null);
          setRegion(WORLD);
          setQuery(place.name);
          setFlyTo(place);
        }}
      />
      <section className="center" aria-label="Interactive Earth with fire detections">
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
          selected={selected}
          onSelect={setSelected}
          autoRotate={!window.matchMedia("(prefers-reduced-motion: reduce)").matches && !selected && region.id === "world"}
          flyTo={flyTo}
          startLat={18}
          startLng={60}
          startAltitude={2.2}
          pointRadius={0.16}
        />
        <div className="overlay-top">
          <div style={{ display: "grid", gap: 10, width: "min(500px, 100%)" }}>
            <div className="searchbox">
              <span aria-hidden="true">⌕</span>
              <input value={query} aria-label="Search a region or country" onFocus={(event) => { setSearching(true); event.target.select(); }} onBlur={() => setSearching(false)} onChange={(event) => { setQuery(event.target.value); setSearching(true); }} onKeyDown={onSearchKey} />
              <span className="bbox" title="Bounding box west, south, east, north">{bboxText(region.bbox)}</span>
              {searchList}
            </div>
            <div className="row">
              <StatusChip status={statusOf(meta)} />
              <span className="chip"><span className="dot" style={{ background: "var(--modis)" }} />MODIS</span>
              <span className="chip"><span className="dot" style={{ background: "var(--viirs)" }} />VIIRS</span>
            </div>
            {banner}
          </div>
        </div>
        <div className="overlay-bottom">
          <span className="attrib">© Natural Earth · NASA FIRMS (format) · tracks {trackNote}</span>
          <Legend colorBy={colorBy} density={layers.density} />
        </div>
      </section>
      <Inspector points={filtered} selected={selected} onClear={() => setSelected(null)} status={statusOf(meta)} period={period} />
      <TimeStrip calendar={calendar} days={days} day={day} onDay={setDay} counts={counts} />
    </div>
  );
}
