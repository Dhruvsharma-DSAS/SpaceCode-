import { useEffect, useState } from "react";
import { SENSOR_COLORS } from "../lib/colors.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildSeries(calendar, mode) {
  const series = [];
  if (!calendar) {
    return series;
  }
  calendar.years.forEach((year, yi) => {
    let row = calendar.viirs[yi];
    let sensor = "VIIRS";
    if (year < 2012) {
      row = calendar.modis[yi];
      sensor = "MODIS";
    }
    if (mode === "year") {
      let total = 0;
      let missing = false;
      row.forEach((v) => {
        if (v === null) {
          missing = true;
        } else {
          total = total + v;
        }
      });
      let value = total;
      if (missing) {
        value = null;
      }
      series.push({ key: String(year), label: String(year), value: value, sensor: sensor });
      return;
    }
    row.forEach((v, mi) => {
      series.push({ key: year + "-" + mi, label: MONTH_NAMES[mi] + " " + year, value: v, sensor: sensor });
    });
  });
  return series;
}

export default function TimeStrip(props) {
  const [mode, setMode] = useState("month");
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(-1);

  const series = buildSeries(props.calendar, mode);
  let cursor = index;
  if (cursor < 0 || cursor >= series.length) {
    cursor = series.length - 2;
  }

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const timer = setInterval(() => {
      if (mode === "day") {
        const order = ["all"].concat(props.days);
        const at = order.indexOf(props.day);
        props.onDay(order[(at + 1) % order.length]);
        return;
      }
      setIndex((current) => {
        let start = current;
        if (start < 0) {
          start = series.length - 2;
        }
        return (start + 1) % Math.max(1, series.length);
      });
    }, 600);
    return () => clearInterval(timer);
  }, [playing, mode, series.length, props.day, props.days]);

  function chooseMode(next) {
    setMode(next);
    setIndex(-1);
    if (next !== "day") {
      props.onDay("all");
    }
  }

  let max = 1;
  series.forEach((item) => {
    if (item.value !== null && item.value > max) {
      max = item.value;
    }
  });

  let nowLabel = "";
  if (mode === "day") {
    nowLabel = "Latest 7 days · " + props.day;
    if (props.day === "all") {
      nowLabel = "Latest 7 days · all";
    }
  } else if (series[cursor]) {
    nowLabel = series[cursor].label;
  }

  let playLabel = "▶ Play";
  if (playing) {
    playLabel = "❚❚ Pause";
  }

  let allCls = "";
  if (props.day === "all") {
    allCls = "on";
  }

  let bars = null;
  if (mode === "day") {
    bars = (
      <div className="ts-days">
        <button className={allCls} onClick={() => props.onDay("all")}>All days<div className="bar" /></button>
        {props.days.map((d) => {
          const c = props.counts[d] || { total: 0, MODIS: 0, VIIRS: 0 };
          let cls = "";
          if (d === props.day) {
            cls = "on";
          }
          const peak = Math.max(1, c.MODIS, c.VIIRS);
          return (
            <button key={d} className={cls} onClick={() => props.onDay(d)} aria-pressed={d === props.day}>
              {d.slice(5)} · {c.total}
              <div className="bar">
                <span style={{ height: (100 * c.MODIS) / peak + "%", background: SENSOR_COLORS.MODIS }} />
                <span style={{ height: (100 * c.VIIRS) / peak + "%", background: SENSOR_COLORS.VIIRS }} />
              </div>
            </button>
          );
        })}
      </div>
    );
  } else {
    bars = (
      <div className="ts-bars" role="img" aria-label="Monthly record: MODIS era before 2012, VIIRS era after">
        {series.map((item, i) => {
          let cls = "";
          if (item.value === null) {
            cls = "null";
          }
          if (i === cursor) {
            cls = cls + " on";
          }
          let height = 0;
          if (item.value !== null) {
            height = Math.max(4, 100 * Math.sqrt(item.value / max));
          }
          return <i key={item.key} className={cls} title={item.label + ": " + item.value + " cell-days (" + item.sensor + " raw, SIMULATED)"} style={{ height: height + "%", background: SENSOR_COLORS[item.sensor] }} onClick={() => setIndex(i)} />;
        })}
      </div>
    );
  }

  return (
    <section className="panel timestrip" aria-label="Time">
      <div className="ts-top">
        <button className="btn small" onClick={() => setPlaying(!playing)} aria-pressed={playing}>{playLabel}</button>
        <div className="seg" role="group" aria-label="Time step">
          {[["day", "Day"], ["month", "Month"], ["year", "Year"]].map((opt) => {
            let cls = "";
            if (mode === opt[0]) {
              cls = "on";
            }
            return <button key={opt[0]} className={cls} onClick={() => chooseMode(opt[0])}>{opt[1]}</button>;
          })}
        </div>
        <span className="ts-now">{nowLabel}</span>
        <div className="ts-eras">
          <span className="era m">MODIS era</span>
          <span className="era v">VIIRS era</span>
          <span className="mono small faint">seam: 2012 · record SIMULATED</span>
        </div>
      </div>
      {bars}
    </section>
  );
}
