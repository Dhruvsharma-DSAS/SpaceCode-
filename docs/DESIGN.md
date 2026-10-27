# FIREWORK CHRONOS — design system and page specs (V3, globe-first)

Screenshots of the working build are in `design/screenshots/`. Approved identity references are in `design/reference/` (Concept A v2 Home, Crossing Orbits logo). The code in `frontend/` is the ground truth for layout; this file explains the intent so Claude Code can extend it without breaking it.

## 1. Look
- Dark mission-control surfaces; the Earth is the hero on every analysis page. A light theme exists (toggle in the top bar) for print and daylight.
- Fonts: **Sora** 200–400 (display, split-letter caps on Home), **Inter** (UI), **JetBrains Mono** (labels, numbers, chips). Loaded from Google Fonts in `index.html`.
- Tokens: `frontend/src/styles/tokens.css`. Component classes: `frontend/src/styles/app.css`.

| token | value | meaning |
|---|---|---|
| `--space` | #05070A | page background |
| `--panel` | rgba(14,20,34,.82) | glass panels |
| `--text` / `--dim` | #E6EDF3 / #9AA6BD | ink |
| `--modis` | #FFB547 | MODIS everywhere (brand); marks #C98418 |
| `--viirs` | #3DD6F5 | VIIRS everywhere (brand); marks #1A9DBA |
| `--fire` | #FF5D6C | alerts, pulses, scenario curves |
| `--model` | #A99CFF | model estimates |
| `--user` | #B18CFF | user-uploaded data |
| classes | crop #5BD69A · wildland #FF8A3D · industrial #C47DFF · UNKNOWN #8A93A6 | probable source |

One sensor palette on every page (decision D2): **amber = MODIS, cyan = VIIRS**. Never colour-only: legends + labels.

Status chips (top bar and every data panel), driven by `meta`: LIVE NRT (green), ARCHIVE (cyan), CACHED (grey), SIMULATED DEMO (amber), UNAVAILABLE (red), USER DATA (violet).

Motion: hover 120 ms, panels 240 ms, value tweens 300 ms, camera flights 1200 ms, globe auto-rotate 0.45 (pauses on drag, resumes after 10 s). `prefers-reduced-motion` turns transitions off.

## 2. The globe (`frontend/src/components/GlobeView.jsx`)
Built on globe.gl (three.js). One component, reused on Home, Explorer, Sensor Lab, Sources, Studio.

| layer | API | look | why |
|---|---|---|---|
| Earth | `globeImageUrl` | Blue Marble · Night lights · Day · Dark (`public/textures`) | real NASA imagery, no tile server needed |
| relief | `bumpImageUrl` | topology bump | depth |
| sky + atmosphere | `backgroundImageUrl`, `atmosphereColor #6FC3FF` | glow | cinematic but calm |
| detections | `pointsData` | small columns, height ∝ log(1+FRP) (max 0.02), radius 0.17°, merged above 3,500 points | dots stay visible at whole-Earth zoom |
| density | `hexBinPointsData` (H3 res 3, merged) | extruded hex columns, cyan → amber → coral → cream | global pattern at a glance |
| pulses | `ringsData` | coral rings on the 10 strongest FRP + the selection | draws the eye |
| borders | `polygonsData` | thin 30% white strokes (Natural Earth 110m) | orientation |
| satellite tracks | `pathsData` + `htmlElementsData` | dashed animated tracks + live labels (amber MODIS, cyan VIIRS) | shows when and where sensors look |

Interaction: drag rotate, scroll zoom, click a dot/hex/anywhere → nearest detection within 150 km → inspector; camera flies there in 1.2 s. "Fly to" buttons for continents. Tooltips on hover.

Satellite positions: real TLEs from `/api/satellites` (CelesTrak, propagated with satellite.js) when the backend can reach CelesTrak; otherwise an illustrative circular sun-synchronous orbit (labelled "illustrative" in the layer panel).

Performance: points merge above 3,500; hexes always merged; backend samples to ≤ 20,000 points. Measure FPS before claiming numbers.

## 3. Pages (all implemented)
| route | page | main view | data |
|---|---|---|---|
| `/` | Home | split-letter hero + rotating night globe + 4 steps + satellite dossiers + calendar teaser + why-now | detections, satellites, calendar |
| `/explore` | Explorer | layer panel · globe · inspector · 7-day time strip with play | `/api/detections` → fixture |
| `/calendar/:region` | Calendar | year × month heatmap, fixed scale, hatched null, 2012 seam, raw/harmonised/VIIRS, cell-days/exposure rate, inspector | `/api/calendar/:region` → fixture |
| `/sensors` | Sensor Lab | MODIS/VIIRS switch on globe + per-platform bars + k panel (pending) | detections |
| `/studio` | Data Studio | CSV upload in browser → column mapping → validation → points on globe (USER) | user file |
| `/formulas/:id` | Formulas | 46-formula index + V1/V2 + audit verdict | `/api/formulas` |
| `/validation` | Validation | predeclared gates G1–G12, tiles "—" until real run | static |
| `/sources` | Sources | globe by class + evidence card (persistence, night share) | detections |
| `/blind-spot` | Blind Spot | 24-h coverage clock with scenario slider + detections by local hour | detections |
| `/learn` | Learn | 6 lessons EN/Hinglish + myths | static |
| `/me` | Workspace | saved views (localStorage) | browser |
| `/brief/:id` | Brief | printable light page template | RunReport.json later |
| `/sources/health` | Health | source table + status labels | `/api/health` |

## 4. Responsive
≥1200 px: three columns (layers · globe · inspector). 860–1200: inspector moves under. <860: globe first, then panels; Home hero stacks. Check at 1600×1000, 1440×900 and 390×844 (see `design/screenshots/m_*.png`).

## 5. Do not
- Do not replace the globe with a flat map on Explorer (the user asked for a globe).
- Do not colour MODIS anything other than amber or VIIRS anything other than cyan.
- Do not hide the SIMULATED chip while any fixture is on screen.
- Do not show k, errors or B as numbers until the archive run (they stay "—" / PENDING).
