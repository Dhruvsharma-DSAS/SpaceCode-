import { useState } from "react";
import { useNavigate } from "react-router-dom";

function readSaved() {
  try {
    const raw = window.localStorage.getItem("fc-saved-views");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    return [];
  }
  return [];
}

export default function Workspace() {
  const navigate = useNavigate();
  const [views, setViews] = useState(readSaved());
  const [name, setName] = useState("");

  function save() {
    const next = views.concat([{ name: name || "View " + (views.length + 1), path: "/calendar/world", saved: new Date().toISOString() }]);
    setViews(next);
    try {
      window.localStorage.setItem("fc-saved-views", JSON.stringify(next));
    } catch (error) {
      console.info("not saved");
    }
    setName("");
  }

  return (
    <div className="page">
      <div className="eyebrow">Personal workspace</div>
      <h1>Saved views</h1>
      <p className="lead">Saved in this browser only. With Supabase auth (later) each saved analysis also stores its config hash and method version so it can be re-run to the same numbers.</p>
      <div className="row" style={{ margin: "16px 0" }}>
        <input className="pill" style={{ background: "transparent", minWidth: 240 }} placeholder="Name this view" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="btn primary small" onClick={save}>Save current calendar view</button>
      </div>
      <div className="cards">
        {views.map((v, i) => (
          <div className="card" key={i}>
            <h3>{v.name}</h3>
            <p className="mono small">{v.path} · {v.saved.slice(0, 16)}</p>
            <button className="btn small" style={{ marginTop: 10 }} onClick={() => navigate(v.path)}>Open</button>
          </div>
        ))}
      </div>
    </div>
  );
}
