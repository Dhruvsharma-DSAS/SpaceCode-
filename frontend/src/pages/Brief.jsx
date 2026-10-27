import { useParams } from "react-router-dom";
import Badge from "../components/Badge.jsx";

export default function Brief() {
  const params = useParams();
  const region = params.id || "world";
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div style={{ background: "#fafaf7", color: "#1b1b1f", borderRadius: 16, padding: 32 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="mono" style={{ color: "#3949ab", letterSpacing: "0.15em", fontSize: 11 }}>RESEARCH BRIEF · {region.toUpperCase()}</span>
          <Badge kind="SIMULATED_DEMO" text="TEMPLATE · NO REAL NUMBERS YET" />
        </div>
        <h1 style={{ color: "#1a237e", fontSize: 28 }}>[Headline written from RunReport.json]</h1>
        <div className="split3" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16 }}>
          {["robust z vs normal", "fire cell-days per valid day", "blind-spot flag"].map((l) => (
            <div key={l} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 28, fontFamily: "var(--font-display)", color: "#1a237e" }}>—</div>
              <div style={{ fontSize: 12, color: "#555" }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 18, lineHeight: 1.6, color: "#333" }}><b>What it means.</b> Sentences are filled from computed numbers only (template first, AI may translate). Every number in the text must exist in RunReport.json.</p>
        <p style={{ marginTop: 10, fontSize: 12, color: "#c62828" }}><b>Not for life-safety decisions.</b> Satellite fire detections have limited accuracy and miss fires under cloud, between passes, or below detection size.</p>
        <p style={{ marginTop: 10, fontSize: 11, color: "#777" }}>Sources: NASA FIRMS (VIIRS 375 m, MODIS C6.1) · exposure: MOD14A1/VNP14A1 · method version · run hash · generated date.</p>
        <button className="btn small" style={{ marginTop: 14, color: "#1b1b1f" }} onClick={() => window.print()}>Print / save as PDF</button>
      </div>
    </div>
  );
}
