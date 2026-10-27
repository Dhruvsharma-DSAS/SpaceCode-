import { useEffect, useState } from "react";
import { loadHealth } from "../api/data.js";
import StatusChip from "../components/StatusChip.jsx";
import { statusOf } from "../api/client.js";

const LABELS = [
  ["LIVE_NRT", "FIRMS near-real-time fetched in the last 24 h"],
  ["ARCHIVE_STANDARD", "FIRMS standard processing (replaces NRT after ~5 months)"],
  ["CACHED", "last good copy, shown with its observation date"],
  ["SIMULATED", "demo fixture — never a result"],
  ["UNAVAILABLE", "source failed and no cache — value stays empty, never 0"],
  ["USER", "data you uploaded in the Studio"],
];

export default function Health() {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    loadHealth().then((result) => {
      setData(result.data);
      setMeta(result.meta);
    });
  }, []);

  let rows = [];
  if (data) {
    rows = data.sources;
  }

  return (
    <div className="page">
      <div className="eyebrow">Data sources & system health</div>
      <h1>Where every number comes from</h1>
      <div className="row" style={{ margin: "10px 0 18px" }}>
        <StatusChip status={statusOf(meta)} />
        <span className="dim small">Status column fills in when the backend /api/health is running.</span>
      </div>
      <div className="panel" style={{ padding: 8, overflowX: "auto" }}>
        <table className="grid">
          <thead>
            <tr><th>source</th><th>input</th><th>role</th><th>provider</th><th>endpoint</th><th>key (env)</th><th>verified</th><th>status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.input}</td>
                <td className="dim">{r.role}</td>
                <td>{r.provider}</td>
                <td className="mono small" style={{ wordBreak: "break-all", maxWidth: 320 }}>{r.endpoint}</td>
                <td className="mono small">{r.auth}</td>
                <td className="mono small">{r.verified_on}</td>
                <td className="mono small">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Status labels</h2>
      <div className="cards">
        {LABELS.map((l) => (
          <div className="card" key={l[0]}>
            <StatusChip status={l[0]} />
            <p style={{ marginTop: 10 }}>{l[1]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
