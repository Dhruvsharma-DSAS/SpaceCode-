import { useState } from "react";

const LESSONS = [
  ["How a satellite sees fire", "Fire is much hotter than the land around it, so a pixel with fire shines brightly near 4 µm. Both sensors compare that band with an 11 µm band and with neighbouring pixels.", "Aag 4 micron par chamakti hai, zameen 11 par. Farak = saboot."],
  ["Why pixels differ", "MODIS pixels are ~1 km, VIIRS 375 m. A small farm fire fills more of a VIIRS pixel, so VIIRS sees more small fires. Edge-of-swath pixels are bigger, not hotter.", "Chhota pixel = chhoti aag bhi dikhti hai."],
  ["Why clouds matter", "No view, no detection. Divide fire days by days the ground was visible (exposure) before comparing months.", "Strike rate = runs per ball, fire rate = aag-din per saaf-din."],
  ["Why the 2012 jump is not real", "VIIRS starts in January 2012 and counts jump. The jump is the new instrument, not more fire.", "Naya camera, zyada dots — zyada aag nahi."],
  ["How harmonisation works", "During 2012–2026 both sensors watch the same places. Their ratio k (per month, day/night) converts old MODIS months into VIIRS-equivalent values, with a band.", "Exchange rate tab seekho jab dono dukaan khuli hon."],
  ["How to read a band", "A 95% band says how sure we are about a value. Wide band = few data or unstable k. A band always states its level.", "Band chhota = bharosa zyada."],
];

const MYTHS = [
  ["More dots = more fire", "More dots can mean a finer sensor, more passes or fewer clouds."],
  ["No detection = no fire", "Under cloud or between passes it means unknown."],
  ["Burned area validates hotspots", "MCD64A1 uses MODIS active fire as an input."],
  ["Confidence 0.6 means 60%", "VIIRS classes l/n/h are categories, not probabilities."],
];

export default function Learn() {
  const [index, setIndex] = useState(0);
  const [hinglish, setHinglish] = useState(false);
  const lesson = LESSONS[index];
  let body = lesson[1];
  let enClass = "on";
  let hiClass = "";
  if (hinglish) {
    body = lesson[2];
    enClass = "";
    hiClass = "on";
  }
  return (
    <div className="page">
      <div className="eyebrow">Research & education center</div>
      <h1>Six short lessons</h1>
      <div className="split3" style={{ gridTemplateColumns: "300px 1fr", marginTop: 18 }}>
        <div className="panel" style={{ padding: 8 }}>
          {LESSONS.map((l, i) => {
            let bg = "transparent";
            if (i === index) {
              bg = "var(--panel-2)";
            }
            return <button key={l[0]} onClick={() => setIndex(i)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: 0, borderRadius: 10, background: bg }}><span className="mono dim">0{i + 1}</span> {l[0]}</button>;
          })}
        </div>
        <div className="panel" style={{ padding: 22 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="eyebrow">Lesson 0{index + 1}</span>
            <div className="seg">
              <button className={enClass} onClick={() => setHinglish(false)}>EN</button>
              <button className={hiClass} onClick={() => setHinglish(true)}>Hinglish</button>
            </div>
          </div>
          <h2>{lesson[0]}</h2>
          <p className="lead">{body}</p>
        </div>
      </div>
      <h2>Most misunderstood ideas</h2>
      <div className="cards">
        {MYTHS.map((m) => <div className="card" key={m[0]}><h3>“{m[0]}”</h3><p>{m[1]}</p></div>)}
      </div>
    </div>
  );
}
