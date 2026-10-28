# 07 · Website: pages, sections and design

## Navigation (two tiers, same style as Home)
Top row: FIREWORK brand · pill **Home · Explore · Trust · Your data · Learn** · "Jump to… ⌘K" search · light/dark switch.
Second row: the pages of the current group + the **Source switch** (Demo / Archive / Live — lit by `/api/health`).

| group | pages (route) |
|---|---|
| Home | `/` |
| Explore | Explorer `/explore` · Calendar `/calendar/world` · Sensor Lab `/sensors` · Sources `/sources` · Blind Spot `/blind-spot` |
| Trust | Validation `/validation` · Formulas `/formulas` · Source Health `/sources/health` |
| Your data | Data Studio `/studio` · Workspace `/me` · Brief `/brief/punjab_haryana` |
| Learn | Learn `/learn` |
The groups follow the atlas journeys: primary (Home → area → Calendar → explain → source / blind spot → validation → export), researcher (Explorer → Studio → Formulas → model → method report), learning (Home → satellites → Learn → formula cards).

## Home `/` — one continuous scroll story
Background: **one fixed 3D space scene** behind the whole page (`frontend/src/lib/earth3d.js` + `components/SpaceBackground.jsx`), built with three.js:
- Earth with a day/night shader: NASA Blue Marble day texture, Black Marble city lights on the night side, procedural moving clouds, ocean sun-glint, blue atmosphere, 4,000 stars, and the demo fire points glowing on the surface.
- Two orbits: **amber dashed = MODIS**, **cyan solid = VIIRS** (the "Crossing Orbits" logo idea), each with its **official NASA 3D model** flying on it — **Aqua** (MODIS) and **Suomi NPP** (VIIRS).
- The scene changes **continuously with every scroll** (no per-section background jumps): the Earth glides, grows and turns, always on the right side; the sun flare fades as you leave the hero.

Sections in order (side progress nav 01–05 with a bar):
1. **Hero** — brand + nav pill (Record · Service · Satellites · Calendar · Mission Control); a **record strip** of 27 year ticks (amber 2000–2011 MODIS, cyan from 2012 VIIRS, seam marked) that fills on load; headline "25 YEARS OF FIRE. ONE HONEST RECORD."; lead text; buttons "Begin the story ↓" and "Open explorer +"; region tag "PUNJAB · HARYANA · NOV SEASON · SIMULATED"; rail 25 years · 05 satellites · 02 sensors.
2. **01 How it works** — 4 steps with progress bars + a video player in browser chrome (DEMO DATA tag). Clips recorded from this website: (1) MODIS and VIIRS dock as you scroll, (2) search a region and play the days, (3) raw vs harmonised calendar, (4) open a 0.1° cell. Then 6 answer boxes: Target, Satellites, Problem, Who suffers, Solution, You get.
3. **02 End-to-end** — 4 tall cards Detect · Grid · Harmonise · Deliver + stats 2000 (record starts), 0.1° (common grid), 14 yr (sensor overlap), 95% (stated interval).
4. **03 Satellites (pinned)** — the section sticks while you scroll: the **Aqua model rises from its orbit near the Earth and docks** on the right; a ring pulses and the **MODIS dossier pops in** (36 bands · two passes · the sunset; specs altitude 705 km, swath 2,330 km, fire pixel 1,000 m, 36 bands, MCD14 C6.1). Scroll on: Aqua returns to orbit and **Suomi NPP docks** with the **VIIRS dossier** (I-bands · wide swath · the fleet; 824 km, 3,040 km, 375 m, 22 bands, VNP14 IMG). Snap points stop exactly at each docked state; fast scrolling cannot skip it. Then "Same field · two rulers" comparison (pixel at nadir, overpass, confidence, record).
5. **04 Calendar** — teaser year × month heatmap, raw values (MODIS before the 2012 line, VIIRS after), fixed colour scale, SIMULATED PREVIEW DATA tag, "Open calendar →".
6. **05 Control** — tiles: overpasses over Ludhiana (NOAA-20/21 ~13:30 LST; S-NPP data ends 2 Nov 2026), detections on the latest day (SIM), exchange rate k "— PENDING · needs the archive run", sensor health, blind-spot flag "LATE FIRES · burns after 15:00 may be under-counted".
Footer: NASA Space Apps 2026 · data NASA FIRMS / LANCE · research decision support, not a life-safety alert.
Motion: split-letter headings rise, cards fade up, satellites dock; `prefers-reduced-motion` turns animation off.

## Explorer `/explore` — the 3D globe analysis workspace
1. **Page header** — "Analysis · {scope}", big EXPLORER title, explanation, tags (status, period, MODIS 1 km, VIIRS 375 m).
2. **Five key figures for the scope:** hot pixels · MODIS 1 km count and share · VIIRS 375 m count and share · night detections % · median FRP (MW, sensor-native, not harmonised).
3. **Workspace:**
   - **Layers panel:** Fire observations (VIIRS 375 m, MODIS 1 km, **H3 density hex columns — on by default**); Context (burned area MCD64A1 "needs Earthdata", land cover "needs EE", clear-sky coverage "needs EE" — disabled until keys; day/night terminator; satellite ground tracks; country borders); Colour by Heat (FRP) / Sensor / Source; Confidence rule slider (all · nominal = MODIS ≥ 30 & VIIRS n,h · high = MODIS ≥ 80 & VIIRS h); Day/night filter; Earth style (Atlas navy · Blue Marble · Night); Fly to.
   - **3D globe** (globe.gl): point columns (height = log(1 + FRP)), H3 density hex columns, rings on the strongest fires, country borders, live satellite labels and dashed ground tracks, night-side shading. Search box with bounding box (any region or country; highlights the country and narrows every number to that bbox).
   - **Click anywhere** (a column, a hex or empty land/sea): a **location card pins to that exact spot** and moves with the globe — place, day/night, position, 0.1° cell id, pixels in the cell, pixels within 50 km, hex pixels. Esc clears.
   - **Location inspector:** Location (lat/lon, local solar time now, day or night) · density hex (pixels, MODIS/VIIRS, mean FRP) · this 0.1° cell (area F04, fire cell-days, pixels, max FRP, source mix) · within 50 km (pixels, MODIS/VIIRS, night share, nearest pixel) · "Needs the archive run" (clear-sky cell-days, rate F09, harmonised value with k F14 — shown as "—") · Open calendar · Export CSV. Second card: sensors over this place (Terra ~10:30/22:30, Aqua ~13:30/01:30, VIIRS ~13:30/01:30 local solar) + the local times detections were seen there.
4. **Time strip:** Play · Day / Month / Year · bars coloured MODIS era → VIIRS era · seam 2012 · Day mode filters the globe to one of the 7 days.
5. **Analysis "What the satellites recorded":** detections by local solar hour with overpass lines (01:30, 10:30, 13:30, 22:30) and the **14–22 h no-overpass window** · day vs night passes · what is burning (source mix, UNKNOWN shown) · detections per day stacked by sensor · fire radiative power bands by sensor · countries with most detections (MODIS/VIIRS split).

## Other pages
| page | key question | sections |
|---|---|---|
| Calendar `/calendar/:region` | Which months and years were unusual, on one honest scale? | "25 years, one honest scale"; raw / harmonised / VIIRS-only; cell-days / exposure rate; year × month heatmap, fixed scale, hatched nulls, 2012 seam line; cell inspector |
| Sensor Lab `/sensors` | How was k learned and how stable is it? | "Same Earth, two rulers"; MODIS/VIIRS globe switch; detections by platform; exchange rate k per stratum (PENDING) |
| Sources `/sources` | What is burning here, and how sure? | globe by class with UNKNOWN visible; evidence card (persistence, night share) |
| Blind Spot `/blind-spot` | When might the satellites miss burning? | 24-h coverage clock with scenario slider; detections by local solar hour; four reasons fires go unseen: timing, clouds & smoke, too small or cool, canopy |
| Validation `/validation` | How far can each result be trusted? | predeclared gates G1–G12 (all "pending" until the real run); simulated method test from the atlas |
| Formulas `/formulas/:id` | What does this formula do? | 46 formulas audited; V1 as registered vs V2 revised (LaTeX); audit verdict and finding; code hook; where shown |
| Source Health `/sources/health` | Where does every number come from, right now? | source table with status; status labels |
| Data Studio `/studio` | Does my own data agree with the satellite record? | upload CSV → map columns → validation → points on the globe (USER label, never mixed into public data) |
| Workspace `/me` | Can I reproduce last week's analysis? | saved views (browser storage) |
| Brief `/brief/:id` | What happened this season, in one page? | printable light template; headline written from RunReport.json |
| Learn `/learn` | How do satellites see fire? | six short lessons EN/Hinglish; most misunderstood ideas |

## Honesty rules in the UI
- SIMULATED data always shows a SIMULATED DEMO tag; k, errors and B stay "—" / PENDING until the archive run.
- Missing = hatched / null with status, never 0. Layers that need keys are visibly disabled with the reason.
- "A dot is a hot pixel, not a fire or its size." Research decision support, not a life-safety alert system.

## Design system
- Look: dark mission-control. Home = cinematic space story; data pages = calm, framed panels on the same tokens.
- Fonts: **Sora** (display, split-letter caps), **Inter** (UI), **JetBrains Mono** (labels, numbers).
- Tokens (`frontend/src/styles/tokens.css`): space #05070A · surface #0A0E14 · ink #E6EDF3 · dim #9AA6B5 · lines rgba(230,237,243,.11).
- **One sensor palette everywhere (decision D2): MODIS amber #FFB547 (marks #C98418), VIIRS cyan #3DD6F5 (marks #1A9DBA)**; fire/alert coral #FF4D5E; model estimate violet #A99CFF; crop/validated mint #5BD69A; industrial #C47DFF; UNKNOWN grey #8A93A6. Palette validator (atlas Ch. 25): lightness, chroma, colour-blind ΔE ≥ 15 and contrast ≥ 3:1 all PASS on dark and light.
- Status tags are squared, not glowing pills: LIVE (green), ARCHIVE (cyan), CACHED (grey), SIMULATED (amber), UNAVAILABLE (red), USER (violet).
- Motion: hover 120 ms · panels 240 ms · value tweens 280–320 ms · camera 1,200 ms; none under reduced motion.
- Logo: "Crossing Orbits" — Earth crossed by an amber dashed (MODIS) and a cyan solid (VIIRS) orbit meeting at one red fire.
- Code style (team rule): React with useState / useEffect / useParams / useNavigate, props, map/filter/find, if/else before return; no ternaries for branching, no custom hooks, no useRef, no comments in frontend code; no new packages without asking.
