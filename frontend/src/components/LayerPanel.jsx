import { SENSOR_COLORS } from "../lib/colors.js";

const COLOR_MODES = [
  ["frp", "Heat"],
  ["sensor", "Sensor"],
  ["class", "Source"],
];

const QA_LEVELS = [
  ["all", "all detections · no filter"],
  ["nominal", "nominal · MODIS ≥ 30 · VIIRS n, h"],
  ["high", "high · MODIS ≥ 80 · VIIRS h"],
];

const BASEMAPS = [
  ["atlas", "Atlas"],
  ["bluemarble", "Blue Marble"],
  ["night", "Night"],
];

function Switch(props) {
  let cls = "switch";
  if (props.on) {
    cls = "switch on";
  }
  return <button className={cls} role="switch" aria-checked={Boolean(props.on)} aria-label={props.label} disabled={props.disabled} onClick={props.onClick} />;
}

function LayerRow(props) {
  let cls = "lp-row";
  if (props.disabled) {
    cls = "lp-row off";
  }
  let swatch = null;
  if (props.color) {
    swatch = <i style={{ background: props.color }} />;
  }
  let note = null;
  if (props.note) {
    note = <small>{props.note}</small>;
  }
  return (
    <div className={cls} title={props.title || ""}>
      <span className="nm">{swatch}<span>{props.label} {note}</span></span>
      <Switch on={props.on} label={props.label} disabled={props.disabled} onClick={props.onClick} />
    </div>
  );
}

export default function LayerPanel(props) {
  const layers = props.layers;

  function flip(key) {
    const next = Object.assign({}, layers);
    next[key] = !layers[key];
    props.onLayers(next);
  }

  let qaIndex = 1;
  QA_LEVELS.forEach((level, i) => {
    if (level[0] === props.qa) {
      qaIndex = i;
    }
  });

  let activeCount = 0;
  ["viirs", "modis", "density", "terminator", "tracks", "borders"].forEach((key) => {
    if (layers[key]) {
      activeCount = activeCount + 1;
    }
  });

  return (
    <aside className="panel left" aria-label="Layers">
      <div className="panel-h">
        <span className="caps" style={{ color: "var(--text)" }}>Layers</span>
        <span className="mono small faint">{activeCount} active</span>
      </div>
      <div className="panel-b">
        <div className="lp-sec" style={{ marginTop: 4 }}>Fire observations</div>
        <LayerRow label="VIIRS 375 m hotspots" color={SENSOR_COLORS.VIIRS} on={layers.viirs} onClick={() => flip("viirs")} />
        <LayerRow label="MODIS 1 km hotspots" color={SENSOR_COLORS.MODIS} on={layers.modis} onClick={() => flip("modis")} />
        <LayerRow label="H3 density (res 3)" on={layers.density} onClick={() => flip("density")} />

        <div className="lp-sec">Context</div>
        <LayerRow label="Burned area (MCD64A1)" note="needs Earthdata" disabled={true} on={false} title="Needs EARTHDATA login and the archive run (M3/M5)" />
        <LayerRow label="Land cover (WorldCover)" note="needs EE" disabled={true} on={false} title="Needs an Earth Engine project (EE_PROJECT)" />
        <LayerRow label="Clear-sky coverage" note="needs EE" disabled={true} on={false} title="Valid-observation exposure comes from gee_exposure.py" />
        <LayerRow label="Day / night terminator" on={layers.terminator} onClick={() => flip("terminator")} />
        <LayerRow label="Satellite ground tracks" note={props.trackNote} on={layers.tracks} onClick={() => flip("tracks")} />
        <LayerRow label="Country borders" on={layers.borders} onClick={() => flip("borders")} />

        <div className="lp-sec">Colour by</div>
        <div className="seg" role="group" aria-label="Colour by">
          {COLOR_MODES.map((mode) => {
            let cls = "";
            if (props.colorBy === mode[0]) {
              cls = "on";
            }
            return <button key={mode[0]} className={cls} onClick={() => props.onColorBy(mode[0])}>{mode[1]}</button>;
          })}
        </div>

        <div className="lp-sec">Confidence ≥</div>
        <input className="range" type="range" min="0" max="2" step="1" value={qaIndex} aria-label="Confidence rule" onChange={(event) => props.onQa(QA_LEVELS[Number(event.target.value)][0])} />
        <div className="hint-mono">{QA_LEVELS[qaIndex][1]} · sensor-native classes, no fake probability</div>

        <div className="lp-sec">Day / night</div>
        <div className="seg" role="group" aria-label="Day or night passes">
          {[["both", "Both"], ["D", "Day"], ["N", "Night"]].map((opt) => {
            let cls = "";
            if (props.dn === opt[0]) {
              cls = "on";
            }
            return <button key={opt[0]} className={cls} onClick={() => props.onDn(opt[0])}>{opt[1]}</button>;
          })}
        </div>

        <div className="lp-sec">Earth</div>
        <div className="seg" role="group" aria-label="Earth surface">
          {BASEMAPS.map((opt) => {
            let cls = "";
            if (props.basemap === opt[0]) {
              cls = "on";
            }
            return <button key={opt[0]} className={cls} onClick={() => props.onBasemap(opt[0])}>{opt[1]}</button>;
          })}
        </div>

        <div className="lp-sec">Fly to</div>
        <div className="flyto">
          {props.places.map((place) => (
            <button key={place.name} className="pill" onClick={() => props.onFly(place)}>{place.name}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}
