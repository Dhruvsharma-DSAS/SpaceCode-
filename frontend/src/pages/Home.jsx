import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SpaceBackground from "../components/SpaceBackground.jsx";
import { loadDetections, loadCalendar } from "../api/data.js";
import "../styles/home.css";

const SECTIONS = [
  ["how", "01 How it works"],
  ["service", "02 Service"],
  ["satellites", "03 Satellites"],
  ["calendar", "04 Calendar"],
  ["mission", "05 Mission"],
];

const PILL = [
  ["top", "Record"],
  ["service", "Service"],
  ["satellites", "Satellites"],
  ["calendar", "Calendar"],
  ["mission", "Mission Control"],
];

const CLIPS = [
  { name: "pass", url: "chronos / satellites", cap: "CLIP 1 OF 4 · MODIS AND VIIRS DOCK AS YOU SCROLL", title: "Meet the two rulers", text: "Scroll and each satellite rises from its orbit: MODIS (1 km pixels) first, then VIIRS (375 m).", get: "YOU GET · WHY RAW COUNTS DISAGREE" },
  { name: "pick", url: "chronos / explore", cap: "CLIP 2 OF 4 · SEARCH A REGION, PLAY THE DAYS", title: "Pick any place on Earth", text: "Search a region, the globe flies there with its bounding box, and play steps through the latest days.", get: "YOU GET · EVERY HOT PIXEL ON ONE GLOBE" },
  { name: "harm", url: "chronos / calendar", cap: "CLIP 3 OF 4 · RAW VS HARMONISED CALENDAR", title: "We harmonise", text: "Switch the month × year calendar from raw to harmonised. Only colours change, on one fixed scale.", get: "YOU GET · ONE RECORD ACROSS THE 2012 SEAM" },
  { name: "answer", url: "chronos / explore", cap: "CLIP 4 OF 4 · OPEN A 0.1° CELL", title: "Read the answer", text: "Click a fire to open its 0.1° cell: counts, source mix, overpass times and what still needs the archive run.", get: "YOU GET · A NUMBER WITH ITS SOURCE AND STATUS" },
];

const ANSWERS = [
  ["01 · Target", "Any area on Earth", "Default flagship: Punjab + Haryana, Oct–Nov straw burning. The same code runs for California, Mato Grosso or New South Wales."],
  ["02 · Satellites", "MODIS + VIIRS", "Terra and Aqua (MODIS, from 2000). Suomi NPP, NOAA-20 and NOAA-21 (VIIRS, from 2012)."],
  ["03 · Problem", "The record breaks in 2012", "VIIRS sees smaller fires, so raw counts jump. The old MODIS satellites are now ending."],
  ["04 · Who suffers", "People, officials, researchers", "Nobody can say for sure if burning fell, because the two rulers measure differently."],
  ["05 · Solution", "One record, 2000 → 2026", "MODIS years converted to VIIRS units with exchange rate k, each value with its interval."],
  ["06 · You get", "Map · calendar · CSV · brief", "Source labels (crop, forest, industry, unknown) and a warning where late or cloudy fires were missed."],
];

const SERVICE = [
  ["01", "Detect", "MODIS and VIIRS flag pixels whose 4 µm brightness jumps above their neighbours.", "FIRMS · NRT", "/img/earth_limb.webp", { width: "260%", left: "-80%", top: "-30px" }],
  ["02", "Grid", "Every detection becomes a fire cell-day on one 0.1° grid, divided by clear-sky days.", "0.1° · DAILY", "/img/grid.webp", { width: "220%", left: "-40%", top: "0" }],
  ["03", "Harmonise", "The 2012–2025 overlap teaches an exchange rate k. Old MODIS months become VIIRS units with an interval.", "MODIS → VIIRS", "/img/earth_horizon.webp", { width: "300%", left: "-100%", top: "-60px" }],
  ["04", "Deliver", "A calendar, a map and an API — each value labelled farm, forest or industry, with blind-spot flags.", "CSV · API · MAP", "/img/earth_india.webp", { width: "150%", left: "-10%", top: "-40px" }],
];

const MODIS_OV = [
  ["36 BANDS", "Visible to thermal infrared. Fires use the 4 µm bands 21/22 and 11 µm band 31."],
  ["TWO PASSES", "Terra ~10:30 and Aqua ~13:30 local time — morning and afternoon looks."],
  ["THE SUNSET", "Both satellites are drifting and near end of mission — the reason the record must move to VIIRS."],
];

const VIIRS_OV = [
  ["I-BANDS", "Fire detection uses I4 (3.74 µm) and I5 (11.45 µm) at 375 m."],
  ["WIDE SWATH", "3,040 km per pass — no gaps between orbits at the equator."],
  ["THE FLEET", "Three satellites in one 13:30 orbit, ~50 min apart, keep the record going after MODIS."],
];

const MODIS_SPEC = [["Altitude", "705", "km"], ["Swath", "2,330", "km"], ["Fire pixel", "1,000", "m"], ["Bands", "36", "0.4–14 µm"], ["Product", "MCD14", "C6.1"]];
const VIIRS_SPEC = [["Altitude", "824", "km"], ["Swath", "3,040", "km"], ["Fire pixel", "375", "m"], ["Bands", "22", "0.4–12 µm"], ["Product", "VNP14", "IMG"]];

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const HEAT_STOPS = [[0, [21, 25, 31]], [0.18, [107, 74, 20]], [0.45, [255, 181, 71]], [0.72, [255, 122, 69]], [1, [255, 77, 94]]];

function heatColor(t) {
  let lower = HEAT_STOPS[0];
  let upper = HEAT_STOPS[HEAT_STOPS.length - 1];
  for (let i = 0; i < HEAT_STOPS.length - 1; i = i + 1) {
    if (t >= HEAT_STOPS[i][0] && t <= HEAT_STOPS[i + 1][0]) {
      lower = HEAT_STOPS[i];
      upper = HEAT_STOPS[i + 1];
    }
  }
  let f = 0;
  if (upper[0] > lower[0]) {
    f = (t - lower[0]) / (upper[0] - lower[0]);
  }
  const rgb = [0, 1, 2].map((i) => Math.round(lower[1][i] + f * (upper[1][i] - lower[1][i])));
  return "rgb(" + rgb.join(",") + ")";
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let behavior = "smooth";
  if (reduce) {
    behavior = "auto";
  }
  target.scrollIntoView({ behavior: behavior, block: "start" });
}

function RecordStrip() {
  const years = [];
  for (let y = 2000; y <= 2026; y = y + 1) {
    years.push(y);
  }
  return (
    <div className="rstrip" role="img" aria-label="Record from 2000 to 2026: MODIS years before 2012, VIIRS from 2012">
      <div className="rstrip-head">
        <span>The record</span>
        <b>2000 — 2026</b>
      </div>
      <div className="rstrip-ticks">
        {years.map((y, i) => {
          let cls = "m";
          if (y >= 2012) {
            cls = "v";
          }
          if (y === 2012) {
            cls = "v seam";
          }
          return <i key={y} className={cls} style={{ animationDelay: 300 + i * 45 + "ms" }} title={String(y)} />;
        })}
      </div>
      <div className="rstrip-foot">
        <span className="m">MODIS · 2000</span>
        <span className="v">VIIRS joins · 2012</span>
        <span>now</span>
      </div>
    </div>
  );
}

function scrollToPin(fraction, fallbackId) {
  const pin = document.getElementById("satpin");
  if (!pin) {
    scrollToId(fallbackId);
    return;
  }
  const r = pin.getBoundingClientRect();
  const range = r.height - window.innerHeight;
  if (range < window.innerHeight * 0.5) {
    scrollToId(fallbackId);
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let behavior = "smooth";
  if (reduce) {
    behavior = "auto";
  }
  window.scrollTo({ top: r.top + window.scrollY + range * fraction, behavior: behavior });
}

function Split(props) {
  const letters = props.text.split("").map((ch, i) => {
    let text = ch;
    if (ch === " ") {
      text = " ";
    }
    return <span key={i} style={{ transitionDelay: i * 35 + "ms" }}>{text}</span>;
  });
  return <h2 className="split" aria-label={props.text}>{letters}</h2>;
}

function Dossier(props) {
  const vis = (
    <div className="vis" style={{ order: props.visOrder }} role="img" aria-label={props.imgAlt}>
      <span className="burst" />
      <span className="lbl">{props.imgLabel}</span>
    </div>
  );
  return (
    <div className="dossier" id={props.id} style={{ "--halo": props.halo, "--c": props.color }}>
      {vis}
      <div className="info">
        <div className="eyebrow" style={{ color: props.color }}>{props.eyebrow}</div>
        <div className="sensor">{props.name}</div>
        <div className="carriers" style={{ color: props.color }}>{props.carriers}</div>
        <p className="desc" style={{ marginTop: 22 }}>{props.text}</p>
        <ul className="ov">
          {props.overview.map((row, i) => (
            <li key={row[0]}><span className="n">{"0" + (i + 1)}</span><b>{row[0]}</b><p>{row[1]}</p></li>
          ))}
        </ul>
        <div className="spec" style={{ "--c": props.color }}>
          {props.spec.map((row) => (
            <div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b><small>{row[2]}</small></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [calendar, setCalendar] = useState(null);
  const [today, setToday] = useState(null);
  const [fires, setFires] = useState(null);
  const [active, setActive] = useState(-1);
  const [clip, setClip] = useState(0);
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);
  const [satTab, setSatTab] = useState("modis");

  useEffect(() => {
    document.title = "FIREWORK CHRONOS · 25 years of fire, one honest record";
    loadCalendar("world").then((result) => setCalendar(result.data)).catch(() => setCalendar(null));
    loadDetections("VIIRS_NOAA20_NRT", 1)
      .then((result) => {
        let last = "";
        result.data.forEach((p) => {
          if (p.date > last) {
            last = p.date;
          }
        });
        const count = result.data.filter((p) => p.date === last).length;
        setToday({ count: count, date: last, demo: Boolean(result.meta && result.meta.demo) });
        setFires(result.data.map((p) => {
          let color = "#ff7a3d";
          if (p.frp > 20) {
            color = "#ffd08a";
          }
          return { lat: p.lat, lon: p.lon, color: color };
        }));
      })
      .catch(() => setToday(null));
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.prototype.slice.call(document.querySelectorAll(".home .split, .home .rv, .home .vis"));
    if (reduce || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("in"));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [calendar]);

  useEffect(() => {
    function onScroll() {
      const mid = window.innerHeight * 0.45;
      let found = -1;
      SECTIONS.forEach((section, i) => {
        const el = document.getElementById(section[0]);
        if (el && el.getBoundingClientRect().top < mid) {
          found = i;
        }
      });
      setActive(found);
      const pinEl = document.getElementById("satpin");
      const viirsEl = document.getElementById("dossier-viirs");
      const cmpEl = document.getElementById("dossier-compare");
      if (pinEl && viirsEl && cmpEl) {
        const pr = pinEl.getBoundingClientRect();
        const range = Math.max(1, pr.height - window.innerHeight);
        let viirsNow = viirsEl.getBoundingClientRect().top < mid;
        if (pr.height > window.innerHeight * 1.5) {
          viirsNow = -pr.top / range > 0.5;
        }
        if (cmpEl.getBoundingClientRect().top < mid) {
          setSatTab("compare");
        } else if (viirsNow) {
          setSatTab("viirs");
        } else {
          setSatTab("modis");
        }
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const box = document.getElementById("howplayer");
    if (!box || !("IntersectionObserver" in window)) {
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => setInView(entry.isIntersecting));
    }, { threshold: 0.35 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = document.getElementById("howvid");
    if (!video) {
      return undefined;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ext = "mp4";
    if (!video.canPlayType('video/mp4; codecs="avc1.42E01E"') && video.canPlayType("video/webm")) {
      ext = "webm";
    }
    const name = CLIPS[clip].name;
    if (video.getAttribute("data-clip") !== name) {
      video.setAttribute("data-clip", name);
      video.poster = "/vid/" + name + ".jpg";
      video.src = "/vid/" + name + "." + ext;
      setProgress(0);
    }
    video.controls = reduce;
    function onTime() {
      if (video.duration) {
        setProgress(video.currentTime / video.duration);
      }
    }
    function onEnd() {
      setClip((clip + 1) % CLIPS.length);
    }
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnd);
    if (inView && !reduce) {
      const p = video.play();
      if (p && p.catch) {
        p.catch(() => setProgress(0));
      }
    } else {
      video.pause();
    }
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnd);
    };
  }, [clip, inView]);

  let heat = null;
  if (calendar) {
    const rows = calendar.years.map((year, yi) => {
      if (year < 2012) {
        return calendar.modis[yi];
      }
      return calendar.viirs[yi];
    });
    let max = 1;
    rows.forEach((row) => row.forEach((v) => {
      if (v !== null && v > max) {
        max = v;
      }
    }));
    const cells = [<span key="h0" />];
    MONTHS.forEach((m, i) => cells.push(<span key={"m" + i} className="m">{m}</span>));
    calendar.years.forEach((year, yi) => {
      if (year === 2012) {
        cells.push(<div key="seam" className="seamline"><span>2012 · VIIRS JOINS — THE SEAM</span></div>);
      }
      cells.push(<span key={"y" + year} className="y">{year}</span>);
      rows[yi].forEach((v, mi) => {
        const key = year + "-" + mi;
        if (v === null) {
          cells.push(<i key={key} className="null" title={year + " " + (mi + 1) + ": no coverage (null)"} />);
          return;
        }
        cells.push(<i key={key} style={{ background: heatColor(v / max) }} title={year + "-" + String(mi + 1).padStart(2, "0") + ": " + v + " cell-days (SIMULATED)"} />);
      });
    });
    heat = (
      <div>
        <div className="heat" role="img" aria-label="Year by month heatmap of simulated fire cell-days with the 2012 seam">{cells}</div>
        <div className="cal-foot">
          <span className="cal-ramp">0<b />{Math.round(max)} cell-days · fixed scale</span>
          <button className="b2" onClick={() => navigate("/calendar/world")}>Open calendar →</button>
        </div>
      </div>
    );
  }

  let todayValue = "—";
  let todayNote = "detections feed unavailable";
  if (today) {
    todayValue = today.count.toLocaleString();
    todayNote = "NOAA-20 · " + today.date;
    if (today.demo) {
      todayNote = todayNote + " · SIM";
    }
  }

  const tabCls = { modis: "", viirs: "", compare: "" };
  if (satTab === "modis") {
    tabCls.modis = "on";
  } else if (satTab === "viirs") {
    tabCls.viirs = "on v";
  } else {
    tabCls.compare = "on c";
  }

  let sideCls = "sidenav";
  if (active >= 0) {
    sideCls = "sidenav show";
  }
  let progressHeight = 0;
  if (active >= 0) {
    progressHeight = ((active + 1) / SECTIONS.length) * 120;
  }

  return (
    <div className="home" id="top">
      <SpaceBackground fires={fires} />
      <ul className={sideCls} aria-label="Sections">
        {SECTIONS.map((section, i) => {
          let cls = "";
          if (i === active) {
            cls = "on";
          }
          return <li key={section[0]}><a href={"#" + section[0]} className={cls} onClick={(event) => { event.preventDefault(); scrollToId(section[0]); }}>{section[1]}</a></li>;
        })}
        <li><div className="prog"><i style={{ height: progressHeight }} /></div></li>
        <li className="tot">{"0" + Math.max(1, active + 1) + " / 05"}</li>
      </ul>

      <div className="frame">
        <nav className="hnav" aria-label="Home">
          <a className="hbrand" href="/" onClick={(event) => { event.preventDefault(); scrollToId("top"); }}>
            <img src="/logo_mark.png" alt="" />
            <span><b>FIREWORK</b><small>CHRONOS · FIRE RECORD</small></span>
          </a>
          <div className="hpill">
            {PILL.map((item, i) => {
              let cls = "";
              if (i === 0) {
                cls = "on";
              }
              return <a key={item[0]} href={"#" + item[0]} className={cls} onClick={(event) => { event.preventDefault(); scrollToId(item[0]); }}>{item[1]}</a>;
            })}
          </div>
          <div className="hic">
            <button onClick={() => navigate("/explore")} aria-label="Open the Earth explorer" title="Open the Earth explorer">⌕</button>
            <button onClick={() => navigate("/learn")} aria-label="Learn how satellites see fire" title="Learn">◐</button>
          </div>
        </nav>
        <div className="hero">
          <div className="copy">
            <RecordStrip />
            <h1><b>25 years of fire.</b><br />One honest<br /><em>record.</em></h1>
            <p className="hlead">Twenty-five years of NASA fire observations from MODIS and VIIRS, joined into one calendar you can trust.</p>
            <div className="cta">
              <a className="b1" href="#how" onClick={(event) => { event.preventDefault(); scrollToId("how"); }}>Begin the story ↓</a>
              <a className="b2" href="/explore" onClick={(event) => { event.preventDefault(); navigate("/explore"); }}>Open explorer +</a>
            </div>
          </div>
          <div className="htag">
            <div className="eyebrow">● Region</div>
            <b>PUNJAB · HARYANA</b>
            <small>NOV SEASON · SIMULATED</small>
          </div>
          <div className="hrail">
            <div><b>25</b><span>Years</span></div>
            <div><b>05</b><span>Satellites</span></div>
            <div><b>02</b><span>Sensors</span></div>
          </div>
        </div>
      </div>

      <section className="scene" id="how">
        <div className="eyebrow">Product tour · four short clips</div>
        <Split text="How it works" />
        <div className="svc-head rv">
          <p className="title">Watch what Chronos does, <b>click by click</b>, in under a minute.</p>
          <p className="desc">Each clip is the prototype running on demo data. Pick a step on the left, or let them play in order.</p>
        </div>
        <div className="how">
          <ol className="steps rv">
            {CLIPS.map((c, i) => {
              let cls = "step";
              let scale = 0;
              if (i === clip) {
                cls = "step on";
                scale = progress;
              }
              return (
                <li key={c.name}>
                  <button className={cls} onClick={() => setClip(i)} aria-pressed={i === clip}>
                    <span className="sn">{"0" + (i + 1)}</span>
                    <span className="st">{c.title}</span>
                    <span className="sd">{c.text}</span>
                    <span className="sg">{c.get}</span>
                    <i className="sp"><b style={{ transform: "scaleX(" + scale.toFixed(3) + ")" }} /></i>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="player rv" id="howplayer">
            <div className="chrome"><i /><i /><i /><span className="url">{CLIPS[clip].url}</span><span className="demo">DEMO DATA</span></div>
            <div className="vidbox"><video id="howvid" muted playsInline preload="metadata" poster="/vid/pass.jpg" aria-label={CLIPS[clip].cap} /></div>
            <div className="cap">{CLIPS[clip].cap}</div>
          </div>
        </div>
        <div className="ans">
          {ANSWERS.map((row) => (
            <div className="a rv" key={row[0]}><span className="ak">{row[0]}</span><b>{row[1]}</b><p>{row[2]}</p></div>
          ))}
        </div>
      </section>

      <section className="scene" id="service">
        <div className="eyebrow">Fire record as a service</div>
        <Split text="End-to-end" />
        <div className="svc-head rv">
          <p className="title">From a hot pixel in orbit to <b>one number you can compare</b> across 25 years.</p>
          <p className="desc">You pick a region and a season. Chronos handles the rest — the satellites, the grid, the cloud gaps, the sensor switch in 2012 — and hands back a calendar with its uncertainty attached.</p>
        </div>
        <div className="svc">
          {SERVICE.map((card, i) => (
            <div className="sc rv" key={card[0]} style={{ transitionDelay: i * 90 + "ms" }}>
              <img src={card[4]} alt="" style={card[5]} />
              <span className="n">{card[0]}</span>
              <h3>{card[1]}</h3>
              <p>{card[2]}</p>
              <span className="hchip">{card[3]}</span>
            </div>
          ))}
        </div>
        <div className="stats rv">
          <div><b>2000</b><span>Record starts · Terra</span></div>
          <div><b>0.1°</b><span>Common grid</span></div>
          <div><b>14 yr</b><span>Sensor overlap</span></div>
          <div><b>95%</b><span>Stated interval</span></div>
        </div>
      </section>

      <section className="scene" id="satellites">
        <div className="eyebrow">Two sensors · one record</div>
        <Split text="Satellites" />
        <div className="tabs">
          <a href="#dossier-modis" className={tabCls.modis} onClick={(event) => { event.preventDefault(); scrollToPin(0.25, "dossier-modis"); }}>MODIS · 2000 →</a>
          <a href="#dossier-viirs" className={tabCls.viirs} onClick={(event) => { event.preventDefault(); scrollToPin(0.8, "dossier-viirs"); }}>VIIRS · 2012 →</a>
          <a href="#dossier-compare" className={tabCls.compare} onClick={(event) => { event.preventDefault(); scrollToId("dossier-compare"); }}>Compare</a>
        </div>
        <div className="satpin" id="satpin">
          <span className="snap" style={{ top: "calc(var(--pin-range) * 0.25)" }} />
          <span className="snap" style={{ top: "calc(var(--pin-range) * 0.8)" }} />
          <div className="satpin-stick">
        <Dossier
          id="dossier-modis"
          visOrder={2}
          halo="rgba(255,181,71,.16)"
          imgAlt="Aqua satellite (NASA 3D model)"
          imgLabel="AQUA · OFFICIAL NASA 3D MODEL · NASA/B. KUMANCHIK, C. LOPEZ"
          color="var(--hmodis)"
          eyebrow="The old ruler · since 2000"
          name="MODIS"
          carriers="TERRA (1999) · AQUA (2002)"
          text="The Moderate Resolution Imaging Spectroradiometer started the global fire record. Two copies fly on two satellites, so every place on Earth is seen up to four times a day — but each fire pixel is 1 km wide."
          overview={MODIS_OV}
          spec={MODIS_SPEC}
        />
        <Dossier
          id="dossier-viirs"
          visOrder={2}
          halo="rgba(61,214,245,.14)"
          imgAlt="Suomi NPP satellite (NASA 3D model)"
          imgLabel="SUOMI NPP · OFFICIAL NASA 3D MODEL · NASA/B. KUMANCHIK, C. LOPEZ"
          color="var(--hviirs)"
          eyebrow="The new ruler · since 2012"
          name="VIIRS"
          carriers="SUOMI NPP (2011) · NOAA-20 (2017) · NOAA-21 (2022)"
          text="The Visible Infrared Imaging Radiometer Suite sees fire at 375 m — small farm burns MODIS misses become visible. Sharper eyes mean more fires counted, which is exactly why the two records cannot simply be stacked."
          overview={VIIRS_OV}
          spec={VIIRS_SPEC}
        />
            <div className="satpin-hud" aria-hidden="true">
              <span className={tabCls.modis}>01 · MODIS docks</span>
              <span className={tabCls.viirs}>02 · VIIRS docks</span>
            </div>
          </div>
        </div>
        <div className="cmp rv" id="dossier-compare">
          <div className="eyebrow">Same field · two rulers</div>
          <div className="cmp-row" style={{ marginTop: 14 }}>
            <span className="k">Pixel at nadir</span>
            <div className="pix">
              <svg width="80" height="80" aria-hidden="true"><rect x="1" y="1" width="78" height="78" fill="rgba(255,181,71,.12)" stroke="#FFB547" /><circle cx="52" cy="30" r="4" fill="#FF4D5E" /></svg>
              <span className="mono" style={{ color: "var(--hmodis)" }}>MODIS · 1 km</span>
            </div>
            <div className="pix">
              <svg width="80" height="80" aria-hidden="true"><g stroke="#3DD6F5" fill="none" opacity=".7"><rect x="1" y="1" width="78" height="78" /><path d="M28 1V79M54 1V79M1 28H79M1 54H79" /></g><rect x="45" y="20" width="9" height="8" fill="#FF4D5E" /></svg>
              <span className="mono" style={{ color: "var(--hviirs)" }}>VIIRS · 375 m (≈7× more detail)</span>
            </div>
          </div>
          <div className="cmp-row"><span className="k">Overpass</span><span>~10:30 (Terra) · ~13:30 (Aqua)</span><span>~13:30 (all three)</span></div>
          <div className="cmp-row"><span className="k">Confidence</span><span>0–100 (sensor-native)</span><span>low · nominal · high</span></div>
          <div className="cmp-row"><span className="k">Record</span><span>2000 → ending (Terra Feb 2027, Aqua Sep 2027)</span><span>2012 → 2030s</span></div>
        </div>
      </section>

      <section className="scene" id="calendar">
        <div className="eyebrow">Historical fire calendar · whole Earth</div>
        <Split text="Calendar" />
        <p className="desc rv" style={{ maxWidth: 640, marginTop: 30 }}>Each row is a year, each cell a month. Raw values: MODIS before the line, VIIRS after it. The jump at the line is the seam Chronos removes.</p>
        <div className="cal rv">
          <div className="cal-top">
            <span className="eyebrow" style={{ fontSize: 11 }}>Fire cell-days · raw</span>
            <span className="sim">SIMULATED PREVIEW DATA</span>
          </div>
          {heat}
        </div>
      </section>

      <section className="scene" id="mission">
        <div className="eyebrow">Mission control</div>
        <Split text="Control" />
        <div className="mc">
          <div className="mtile big rv">
            <img src="/img/earth_quarter.webp" alt="" />
            <div>
              <div className="eyebrow">Overpasses</div>
              <b style={{ fontSize: 30 }}>LUDHIANA</b>
              <small>NOAA-20 / 21 · ~13:30 LST · SUOMI NPP data ends 02 NOV 2026</small>
            </div>
          </div>
          <div className="mtile rv"><div className="eyebrow">Detections · latest day</div><b>{todayValue}</b><small>{todayNote}</small></div>
          <div className="mtile rv"><div className="eyebrow">Exchange rate k</div><b>—</b><small>PENDING · needs the archive run (M5)</small></div>
          <div className="mtile rv"><div className="eyebrow">Sensor health</div><b style={{ color: "var(--hok)", fontSize: 32 }}>● NOMINAL</b><small>live status: open Source Health</small></div>
          <div className="mtile rv"><div className="eyebrow">Blind-spot flag</div><b style={{ color: "var(--hmodis)", fontSize: 32 }}>LATE FIRES</b><small>burns after 15:00 may be under-counted</small></div>
        </div>
      </section>

      <footer className="hfoot">
        <span className="fl"><img src="/logo_mark.png" alt="" />FIREWORK</span>
        <span>NASA Space Apps 2026 · data: NASA FIRMS / LANCE · research decision support, not a life-safety alert</span>
      </footer>
    </div>
  );
}
