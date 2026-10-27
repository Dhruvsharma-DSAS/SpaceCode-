import Badge from "../components/Badge.jsx";

const GATES = [
  ["G1", "Held-out years", "LOYO over 2012–2025, Oct–Nov totals", "median relative error ≤ 15% and better than B1"],
  ["G2", "Held-out geography", "train one region, test another", "error ≤ 1.5 × in-region error"],
  ["G3", "Seam", "3-year windows, log scale, bootstrap CI", "seam ratio upper CI ≤ 0.25"],
  ["G4", "Placebo seams", "Pettitt / PELT at 20 random years", "false-positive rate ≤ 10%"],
  ["G5", "Platform seams", "2018 and 2023 additions", "no break after harmonisation (α = 0.05)"],
  ["G6", "Coverage", "95% predictive bands, held-out", "achieved 88–99%"],
  ["G7", "Agreement", "Bland–Altman on log scale", "|bias| ≤ 0.1"],
  ["G8", "Zero / empty", "empty months, E = 0, one region", "no crash; status, never 0"],
  ["G9", "Negatives", "water and urban cells", "≈ 0 with status"],
  ["G10", "Persistent heat", "known flares / kilns", "excluded from calibration"],
  ["G11", "Classifier", "held-out sites (GroupKFold)", "macro-F1 + abstain rate reported"],
  ["G12", "API provenance", "every response", "meta.data_source, status, version present"],
];

export default function Validation() {
  return (
    <div className="page">
      <div className="eyebrow">Accuracy & validation</div>
      <h1>How far can each result be trusted?</h1>
      <p className="lead">Pass rules were written down on 27 Oct 2026, before any real-data run. Values stay "—" until the archive pipeline fills them. Nothing synthetic is shown as a result.</p>
      <div className="cards" style={{ marginTop: 18 }}>
        {[["LOYO error", "G1"], ["Seam ratio", "G3"], ["Placebo false alarms", "G4"], ["Band coverage", "G6"], ["Bland–Altman bias", "G7"]].map((t) => (
          <div className="tile" key={t[0]}>
            <div className="big">—</div>
            <div className="lbl">{t[0]} · gate {t[1]} · pending real run</div>
          </div>
        ))}
      </div>
      <h2>Predeclared gates</h2>
      <div className="panel" style={{ padding: 8 }}>
        <table className="grid">
          <thead><tr><th>gate</th><th>test</th><th>design</th><th>pass rule</th><th>result</th></tr></thead>
          <tbody>
            {GATES.map((g) => (
              <tr key={g[0]}><td className="mono">{g[0]}</td><td>{g[1]}</td><td className="dim">{g[2]}</td><td>{g[3]}</td><td className="mono faint">pending</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Simulated method test (from the V2 atlas)</h2>
      <div className="note warn">In 60 simulated worlds with known truth, exposure normalisation (B2) gave most of the gain over raw counts and the B3 95% predictive band covered 94.5% of held-out seasons. This tests the method, not real-world accuracy. <Badge kind="RUN_TESTED_LOCALLY" text="RUN · SIMULATED" /></div>
    </div>
  );
}
