import { SENSOR_COLORS, PLATFORM_COLORS, PLATFORM_LABELS, CLASS_COLORS, CLASS_LABELS, DAYNIGHT_COLORS } from "../lib/colors.js";

function Items(props) {
  return (
    <div>
      {props.items.map((item) => (
        <div className="item" key={item[0]}>
          <span className="sw" style={{ background: item[1] }} />
          <span>{item[0]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Legend(props) {
  let title = "Colour = sensor";
  let body = <Items items={[["MODIS (Terra, Aqua) · 1 km", SENSOR_COLORS.MODIS], ["VIIRS (S-NPP, NOAA-20, NOAA-21) · 375 m", SENSOR_COLORS.VIIRS]]} />;
  if (props.colorBy === "platform") {
    title = "Colour = platform";
    body = <Items items={Object.keys(PLATFORM_COLORS).map((key) => [PLATFORM_LABELS[key], PLATFORM_COLORS[key]])} />;
  } else if (props.colorBy === "class") {
    title = "Colour = probable source (demo labels)";
    body = <Items items={Object.keys(CLASS_LABELS).filter((key) => key !== "USER").map((key) => [CLASS_LABELS[key], CLASS_COLORS[key]])} />;
  } else if (props.colorBy === "frp") {
    title = "Colour = fire radiative power";
    body = (
      <div>
        <div className="ramp" />
        <div className="row small dim" style={{ justifyContent: "space-between", marginTop: 4 }}>
          <span>0</span>
          <span>5</span>
          <span>20</span>
          <span>80+ MW</span>
        </div>
      </div>
    );
  } else if (props.colorBy === "daynight") {
    title = "Colour = day / night pass";
    body = <Items items={[["Day pass", DAYNIGHT_COLORS.D], ["Night pass", DAYNIGHT_COLORS.N]]} />;
  }
  return (
    <div className="legend">
      <div className="caps">{title}</div>
      {body}
      {props.density && <div className="small dim" style={{ marginTop: 8 }}>Columns = detections per hexagon (height and colour)</div>}
      <div className="small faint" style={{ marginTop: 8 }}>A dot is a hot pixel, not a fire or its size.</div>
    </div>
  );
}
