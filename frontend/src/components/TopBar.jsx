import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchJson } from "../api/client.js";

const LINKS = [
  ["/", "Home"],
  ["/explore", "Explorer"],
  ["/calendar/world", "Calendar"],
  ["/sensors", "Sensor Lab"],
  ["/studio", "Data Studio"],
  ["/formulas", "Formulas"],
  ["/validation", "Validation"],
  ["/sources", "Sources"],
  ["/blind-spot", "Blind Spot"],
  ["/learn", "Learn"],
];

const PAGES = [
  ["/", "Home", "story"],
  ["/explore", "Explorer", "globe"],
  ["/calendar/world", "Calendar", "month × year"],
  ["/sensors", "Sensor Lab", "k by stratum"],
  ["/studio", "Data Studio", "your data"],
  ["/formulas", "Formulas", "F01–F46"],
  ["/validation", "Validation", "gates"],
  ["/sources", "Sources", "what is burning"],
  ["/blind-spot", "Blind Spot", "overpass clock"],
  ["/learn", "Learn", "lessons"],
  ["/me", "Workspace", "saved views"],
  ["/brief/punjab_haryana", "Research Brief", "print"],
  ["/sources/health", "Source Health", "status"],
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

  const q = query.trim().toLowerCase();
  const matches = PAGES.filter((page) => {
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

export default function TopBar() {
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

  const SOURCES = [
    ["SIMULATED", "Demo", "Simulated fixtures: no key yet, numbers are not results"],
    ["ARCHIVE_STANDARD", "Archive", "Standard-processing archive from the backend"],
    ["LIVE_NRT", "Live", "Near-real-time NASA FIRMS feed"],
  ];
  let activeIndex = 0;
  SOURCES.forEach((source, i) => {
    if (source[0] === status) {
      activeIndex = i;
    }
  });
  const activeTitle = SOURCES[activeIndex][2];

  let palette = null;
  if (open) {
    palette = <Palette onClose={() => setOpen(false)} />;
  }

  return (
    <header className="topbar">
      <NavLink to="/" className="brand">
        <img src="/logo_mark.png" alt="" />
        <div>
          <b>FIREWORK CHRONOS</b>
          <small>EARTH INTELLIGENCE ATLAS</small>
        </div>
      </NavLink>
      <nav className="nav" aria-label="Main">
        {LINKS.map((link) => (
          <NavLink key={link[0]} to={link[0]} end={link[0] === "/"}>
            {link[1]}
          </NavLink>
        ))}
      </nav>
      <div className="spacer" />
      <div className={"srcswitch at-" + activeIndex} role="status" aria-label={"Data source: " + SOURCES[activeIndex][1]} title={activeTitle}>
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
      <button className="kfield" onClick={() => setOpen(true)} aria-label="Search pages">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        <span className="kfield-t">Jump to…</span>
        <kbd>⌘K</kbd>
      </button>
      <button className="iconbtn" onClick={switchTheme} aria-label="Switch colour theme">{themeLabel}</button>
      {palette}
    </header>
  );
}
