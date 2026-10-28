# 09 · Speech, demo and judge Q&A

Rule for every talk: say "detections" or "hot pixels", never "fires counted"; say "simulated" for demo numbers; say "pending" for k, errors and the B flag.

## 2-minute speech (matches the atlas demo storyboard)
**0:00 — Hook (Home hero)**
"For 25 years NASA satellites have recorded every hot spot on Earth. But the record is breaking. The old sensor, MODIS, is ending — Terra in February 2027, Aqua in September 2027 — and the new one, VIIRS, sees with sharper eyes. If you simply join the two, fires seem to jump in 2012. That jump isn't more burning. It's a new ruler."

**0:20 — The problem (scroll to Satellites)**
"Here is MODIS on Aqua — one-kilometre pixels, afternoon pass. Here is VIIRS on Suomi NPP — 375-metre pixels, it catches small farm fires MODIS misses. Same field, two rulers. And the overlap — 2012 to today — is the only time both rulers exist. Calibrating the old record has to happen now."

**0:45 — Our answer (Explorer)**
"FIREWORK CHRONOS puts every hot pixel on one 3D Earth and on one common grid: 0.1-degree cells, local solar days, for any place on the planet. I click a place — the card tells me the cell, its area, how many detections are within 50 kilometres, and which satellites can see it and when."

**1:05 — Honest harmonisation (Calendar)**
"We divide by clear-sky observation days, so a cloudy November isn't mistaken for a quiet one. Then we learn an exchange rate, k, in the overlap years — per month and day/night, with its interval — and convert the MODIS years into VIIRS units. Raw: the 2012 step. Harmonised: the step is meant to fade while the seasons stay."

**1:25 — What satellites miss (Blind Spot)**
"Satellites pass at about 10:30 and 13:30. Nothing passes between 14:00 and 22:00 local time. If burning moves to the late afternoon, counts fall even if burning doesn't. We flag that — we don't pretend to correct it."

**1:40 — Trust (Validation, Source Health)**
"Every number carries a label — official, derived, tested, simulated or proposed. Our pass rules were written down before any real run. Right now the site runs on clearly-labelled demo data; with a free FIRMS key it switches to live NASA data automatically."

**1:55 — Close**
"25 years of fire. One honest record. FIREWORK CHRONOS."

## 5-minute version (add to the 2-minute flow)
1. **Four layers, four questions** (after the hook): how much was detected on a common scale · what is burning · what might the satellite miss · is this month unusual or trending. Four answers, four units — never one magic score.
2. **The science in one breath:** fire shines at 4 µm, land at 11 µm; both sensors look for that contrast; a 375 m pixel needs a smaller fire to stand out than a 1 km pixel — that's why k is above 1.
3. **Exposure:** the daily FireMask product tells us which days a cell was actually observed (classes 3, 5, 7, 8, 9); cloud (class 4) is not observable; missing is null, never zero.
4. **The model:** a negative-binomial count model with exposure offset per sensor; k = exp(γ_VIIRS − γ_MODIS); intervals by block bootstrap over years. Identifiability: we report a VIIRS-equivalent index, not "true fire activity".
5. **Validation we committed to in advance:** leave-one-year-out error ≤ 15% and better than the simple baseline; placebo seams at random years; held-out geography (train Punjab, test Haryana); 95% bands must cover 88–99%.
6. **Simulation evidence (label it):** on 60 simulated worlds with known truth, exposure normalisation cut the median season error from 69% (raw concatenation) to about 24%, and the 95% band covered 94.5%. That is a property of the simulation — the real-data test is the next milestone.
7. **Global by design:** Punjab–Haryana is the flagship, but the same code grids California, Mato Grosso and New South Wales.
8. **What's next:** FIRMS archive + Earth Engine exposure for one overlap year → real k with interval → validation gates on the site → one-page PDF brief for a district officer.

## Live demo click path (current website)
1. `/` Home — let the hero load (3D Earth, both orbits). Click "Begin the story ↓", play clip 1.
2. Scroll to **Satellites** — stop when Aqua docks (MODIS details), scroll on until Suomi NPP docks (VIIRS details). Point at "Same field · two rulers".
3. Click **Explore** in the top pill → Explorer. Read the 5 key figures (say "demo data").
4. Type "Punjab" in the globe search → Enter: India highlights, bbox shows, every number narrows to the region.
5. Click a fire cluster: the location card pins to the spot; read the inspector (cell, 50 km, nearest pixel, sensors over this place, "needs the archive run").
6. Scroll to **What the satellites recorded**: point at the 14–22 h no-overpass window.
7. Sub-nav → **Calendar**: toggle Raw → Harmonised.
8. Pill → **Trust** → Validation (predeclared gates) → Source Health (where every number comes from).

## Judge Q&A (honest answers)
| question | answer |
|---|---|
| Is this real NASA data? | The facts, dates, grids and areas are real. The dots and calendar on screen are simulated and labelled. With a FIRMS map key (free) the backend serves live NASA FIRMS data; the archive run for the calendar is the next milestone. |
| What is k? | The exchange rate: how many VIIRS fire cell-days one MODIS fire cell-day is worth, learned in the overlap years per month and day/night, with a 95% interval. It's pending until the real run; we don't show a number before that. |
| Why not just multiply MODIS by 2.6? | One k for every place and season hides day/night, cloud and drift differences, and has no uncertainty. Our earlier documents did that; the audit replaced it. |
| How do you handle clouds? | Exposure: we divide by days the satellite actually saw the ground (FireMask 3, 5, 7, 8, 9). Cloudy days are "not observable", never zero fire. |
| Isn't a hotspot a fire? | No — a hotspot is one hot pixel at the overpass moment. One fire can make many pixels; a small or late fire can make none. |
| Can burned area (MCD64A1) validate you? | Not independently — it uses MODIS active fire as an input. We use it only as a disagreement flag. |
| What about fires after 3 pm? | No hotspot-only method can count them. We show an overpass clock and a flag ("counts may miss late burning"), not a fake correction. |
| How do you know it works? | Validation gates written before any real run (G1–G12): held-out years, held-out region, placebo seams, band coverage, Bland–Altman agreement. Simulation passes are labelled as simulation. |
| Does it work outside India? | Yes. The grid, local solar time and areas are global; California, Mato Grosso and New South Wales are built in as test regions. |
| Is the AI making numbers up? | The LLM only writes words around computed numbers, behind a citation guard that rejects any number not in the computed result. |
| Is it a fire alert system? | No — research decision support. FIRMS has limited accuracy and is not for protection of life or property. |
| Why 3D satellites? | They're NASA's official models of Aqua and Suomi NPP, used to explain the two rulers: who looks, when, and at what resolution. |

## Hinglish one-liners (for a mixed audience)
- "Aag 4 micron par chamakti hai, zameen 11 micron par — yahi farak satellite pakadta hai."
- "Chhota pixel, chhoti aag bhi dikh jaati hai — isliye VIIRS zyada dots dikhata hai."
- "Purane aur naye satellite ki aag ko ek hi taraazu par tolna — yahi harmonisation hai."
- "Band sirf woh galti dikhata hai jo hum naap sakte hain; jo satellite dekh hi nahi sakta, uske liye alag warning."
- "Ajeeb mahina = apne hi purane mahino se compare."
