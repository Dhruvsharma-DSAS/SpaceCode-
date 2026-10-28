import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchJson } from "../api/client.js";

const GROUPS = [
  { id: "explore", label: "Explore", pages: [
    ["/explore", "Explorer", "globe"],
    ["/calendar/world", "Calendar", "month × year"],
    ["/sensors", "Sensor Lab", "MODIS vs VIIRS"],
    ["/sources", "Sources", "what burns"],
    ["/blind-spot", "Blind Spot", "missed fires"],
  ] },
  { id: "trust", label: "Trust", pages: [
    ["/validation", "Validation", "gates G1–G12"],
    ["/formulas", "Formulas", "F01–F46"],
    ["/sources/health", "Source Health", "feeds"],
  ] },
  { id: "data", label: "Your data", pages: [
    ["/studio", "Data Studio", "upload"],
    ["/me", "Workspace", "saved views"],
    ["/brief/punjab_haryana", "Brief", "print"],
  ] },
  { id: "learn", label: "Learn", pages: [
    ["/learn", "Learn", "6 lessons"],
  ] },
];

const SOURCES = [
  ["SIMULATED", "Demo", "Simulated fixtures: no key yet, numbers are not results"],
  ["ARCHIVE_STANDARD", "Archive", "Standard-processing archive from the backend"],
  ["LIVE_NRT", "Live", "Near-real-time NASA FIRMS feed"],
];

function readTheme() {
  try {
    const saved = window.localStorage.getItem("fc-theme");
    if (saved === "light") {
      return "light";
    }
  } catch (error) {
    return "dark";
  }
  return "dark";
}

function Palette(props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const input = document.getElementById("palette-input");
    if (input) {
      input.focus();
    }
  }, []);

  const all = [["/", "Home", "story"]];
  GROUPS.forEach((g) => g.pages.forEach((p) => all.push(p)));
  const q = query.trim().toLowerCase();
  const matches = all.filter((page) => {
    if (!q) {
      return true;
    }
    return page[1].toLowerCase().indexOf(q) >= 0 || page[2].toLowerCase().indexOf(q) >= 0;
  });

  function go(path) {
    props.onClose();
    navigate(path);
  }

  function onKey(event) {
    if (event.key === "Enter" && matches.length > 0) {
      go(matches[0][0]);
    }
  }

  return (
    <div className="palette-back" onClick={props.onClose}>
      <div className="palette" role="dialog" aria-label="Search pages" onClick={(event) => event.stopPropagation()}>
        <input id="palette-input" placeholder="Jump to a page…" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKey} />
        <ul>
          {matches.map((page, index) => {
            let cls = "";
            if (index === 0) {
              cls = "on";
            }
            return (
              <li key={page[0]}>
                <button className={cls} onClick={() => go(page[0])}>
                  {page[1]}
                  <span>{page[2]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function TopBar(props) {
  const [theme, setTheme] = useState(readTheme());
  const [status, setStatus] = useState("SIMULATED");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      window.localStorage.setItem("fc-theme", theme);
    } catch (error) {
      console.info("theme not saved");
    }
  }, [theme]);

  useEffect(() => {
    let active = true;
    fetchJson((import.meta.env.VITE_API_URL || "") + "/api/health")
      .then((result) => {
        if (!active) {
          return;
        }
        if (result && result.meta && result.meta.firms_live) {
          setStatus("LIVE_NRT");
        } else {
          setStatus("ARCHIVE_STANDARD");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("SIMULATED");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function switchTheme() {
    if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }

  let themeLabel = "☀";
  if (theme === "light") {
    themeLabel = "☾";
  }

  let activeIndex = 0;
  SOURCES.forEach((source, i) => {
    if (source[0] === status) {
      activeIndex = i;
    }
  });

  let current = GROUPS.find((g) => g.id === props.group);
  if (!current) {
    current = GROUPS[0];
  }

  let palette = null;
  if (open) {
    palette = <Palette onClose={() => setOpen(false)} />;
  }

  return (
    <header className="tb">
      <div className="tb-row">
        <NavLink to="/" className="tb-brand" aria-label="FIREWORK CHRONOS home">
          <img src="/logo_mark.png" alt="" />
          <span><b>FIREWORK</b><small>CHRONOS · FIRE RECORD</small></span>
        </NavLink>
        <nav className="tb-pill" aria-label="Sections">
          <NavLink to="/" end>Home</NavLink>
          {GROUPS.map((g) => {
            let cls = "";
            if (g.id === props.group) {
              cls = "on";
            }
            return <NavLink key={g.id} to={g.pages[0][0]} className={cls}>{g.label}</NavLink>;
          })}
        </nav>
        <div className="tb-tools">
          <button className="kfield" onClick={() => setOpen(true)} aria-label="Search pages">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            <span className="kfield-t">Jump to…</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="iconbtn" onClick={switchTheme} aria-label="Switch colour theme">{themeLabel}</button>
        </div>
      </div>
      <div className="tb-sub">
        <nav className="tb-pages" aria-label={current.label + " pages"}>
          <span className="tb-group">{current.label}</span>
          {current.pages.map((p) => (
            <NavLink key={p[0]} to={p[0]}>
              {p[1]}
              <small>{p[2]}</small>
            </NavLink>
          ))}
        </nav>
        <div className={"srcswitch at-" + activeIndex} role="status" aria-label={"Data source: " + SOURCES[activeIndex][1]} title={SOURCES[activeIndex][2]}>
          <span className="srcswitch-k">Source</span>
          <div className="srcswitch-track">
            {SOURCES.map((source, i) => {
              let cls = "";
              if (i === activeIndex) {
                cls = "on";
              }
              return <span key={source[0]} className={cls}>{source[1]}</span>;
            })}
            <i className="srcswitch-bar" />
          </div>
        </div>
      </div>
      {palette}
    </header>
  );
}
