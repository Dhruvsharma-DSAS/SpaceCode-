import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Badge from "../components/Badge.jsx";
import { loadFormulas } from "../api/data.js";

function verdictColor(verdict) {
  if (verdict.indexOf("FIX") === 0) {
    return "var(--fire)";
  }
  if (verdict.indexOf("REVISE") === 0) {
    return "var(--modis)";
  }
  return "var(--mint)";
}

export default function Formulas() {
  const params = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");

  useEffect(() => {
    loadFormulas().then((result) => setItems(result.data));
  }, []);

  const families = [];
  items.forEach((f) => {
    if (families.indexOf(f.family) < 0) {
      families.push(f.family);
    }
  });
  const shown = items.filter((f) => {
    if (family !== "all" && f.family !== family) {
      return false;
    }
    const text = (f.formula_id + " " + f.name + " " + f.audit_finding).toLowerCase();
    return text.indexOf(query.toLowerCase()) >= 0;
  });
  let current = items.find((f) => f.formula_id === params.id);
  if (!current && shown.length > 0) {
    current = shown[0];
  }

  let card = null;
  if (current) {
    card = (
      <div className="panel" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow">{current.family} · layer {current.layer}</span>
          <Badge kind="RUN_TESTED_LOCALLY" text={current.v2_status} />
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 14, marginTop: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 200, fontSize: 52, color: "var(--modis)" }}>{current.formula_id}</span>
          <h2 style={{ margin: 0 }}>{current.name}</h2>
        </div>
        <div className="caps" style={{ marginTop: 16 }}>V1 as registered</div>
        <pre className="mono small" style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 10, background: "var(--panel-2)", color: "var(--dim)", marginTop: 6 }}>{current.equation_v1}</pre>
        <div className="caps" style={{ marginTop: 14 }}>V2 revised (LaTeX)</div>
        <pre className="mono small" style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 10, background: "#0b1530", border: "1px solid var(--line-strong)", marginTop: 6 }}>{current.equation_v2}</pre>
        <div className="note" style={{ marginTop: 14, borderColor: verdictColor(current.audit_verdict) }}>
          <b style={{ color: verdictColor(current.audit_verdict) }}>Audit · {current.audit_verdict}</b>
          <div style={{ marginTop: 6 }}>{current.audit_finding}</div>
        </div>
        <div className="kv" style={{ marginTop: 10 }}><span>Code hook (V2)</span><b>{current.code_hook_v2}</b></div>
        <div className="kv"><span>Shown on</span><b>{current.ui_surface}</b></div>
        <p className="small dim" style={{ marginTop: 12 }}>Full derivation, worked example, tests and Hinglish note: V2 Research Atlas, formula spread {current.formula_id}. Add KaTeX to render the LaTeX.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="eyebrow">Scientific formula explorer</div>
      <h1>46 formulas, audited</h1>
      <p className="lead">Every formula with its original and revised definition and the audit verdict. FIX = defect found, REVISE = definition changed, OK = kept.</p>
      <div className="row" style={{ margin: "16px 0" }}>
        <input className="pill" style={{ minWidth: 260, background: "transparent" }} placeholder="Search F09, bootstrap, exposure…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="pill" style={{ background: "transparent" }} value={family} onChange={(event) => setFamily(event.target.value)}>
          <option value="all">All families</option>
          {families.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="split3" style={{ gridTemplateColumns: "360px 1fr" }}>
        <div className="panel" style={{ padding: 8, maxHeight: "70vh", overflowY: "auto" }}>
          {shown.map((f) => {
            let bg = "transparent";
            if (current && current.formula_id === f.formula_id) {
              bg = "var(--panel-2)";
            }
            return (
              <button key={f.formula_id} onClick={() => navigate("/formulas/" + f.formula_id)} style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "left", padding: "9px 10px", border: 0, borderRadius: 10, background: bg }}>
                <span className="mono" style={{ color: "var(--modis)", width: 34 }}>{f.formula_id}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{f.name}</span>
                <span className="mono small" style={{ color: verdictColor(f.audit_verdict) }}>{f.audit_verdict.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        {card}
      </div>
    </div>
  );
}
