# FIREWORK CHRONOS — project rules for Claude Code

NASA Space Apps 2026 · Harmonization of MODIS and VIIRS Hot Spots.
A global Earth fire record: MODIS (2000→) and VIIRS (2012→) on one ruler, shown on a 3D globe and a month × year calendar.

Read in this order before any task:
1. `CLAUDE.md` (this file)
2. `docs/CLAUDE_CODE_PROMPT.md` (milestones, what to build next)
3. `docs/DESIGN.md` (look, tokens, globe spec, every page)
4. `docs/DATA.md` (static vs dynamic data, schemas, fixtures)
5. `docs/API_KEYS.md` (which key unlocks what)
6. `docs/spec/FIREWORK_CHRONOS_V2_Research_Atlas.pdf` — open only the chapter you need (formulas: Part III spreads).

## Stack (already working)
- `frontend/` React 19 + Vite 7 + React Router 7 + **globe.gl 2.41 / three 0.179** (3D Earth) + satellite.js 6 (orbits).
- `backend/` FastAPI. Every response is `{data, meta}`.
- `data/supabase/` Postgres/PostGIS schema + 19 real static CSVs + fetch scripts.
- Run: `cd frontend && npm install && npm run dev` · `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload`.

## Code style (team rules — obey literally)
- React: only `useState`, `useEffect`, `useParams`, `useNavigate`, props, `.map()`, `.filter()`, `.find()`, and `if/else` before `return`.
- No ternaries for branching, no custom hooks, no comments in frontend code, no heavy abstractions, no `useRef` (use `document.getElementById` inside `useEffect`, as `GlobeView.jsx` does).
- **globe.gl instances are functions: store them with `setGlobe(() => g)`, never `setGlobe(g)`** (React would call it and crash with "Cannot set properties of null").
- Always output full files, not snippets. No new npm/pip packages without asking the user.
- Python: plain functions, type hints, one docstring per function stating the formula.

## Truth policy (non-negotiable)
- Five provenance labels on every number: OFFICIAL_DOCUMENTED, SOURCE_DERIVED, RUN_TESTED_LOCALLY, SIMULATED_DEMO, PROPOSED_UNVALIDATED.
- `frontend/public/data/detections_demo.json` and `calendar_demo.json` are **SIMULATED**. They must always show the amber SIMULATED DEMO chip. Never present them as results.
- Missing coverage, failed sources and unprocessed months are `null` + a status, never `0`.
- A hotspot is a pixel, not a fire; a cell-day is not burned area; harmonised values are estimates with a band.
- Keys live only in `backend/.env`. The browser never sees a key. Never commit `.env`.
- The LLM (if added) writes words around computed numbers; it never creates or edits a number.
- This is research decision support, not a life-safety alert system — keep the caveat on Explorer, Brief and Blind Spot.

## Domain facts verified 27 Oct 2026
- FIRMS Area API: `/api/area/csv/{MAP_KEY}/{SOURCE}/{world | W,S,E,N}/{DAY_RANGE}[/{YYYY-MM-DD}]`, DAY_RANGE 1–10 (older notes said 1–5), bbox order west,south,east,north.
- Sources: MODIS_NRT, MODIS_SP, VIIRS_SNPP_NRT, VIIRS_SNPP_SP, VIIRS_NOAA20_NRT, VIIRS_NOAA20_SP, VIIRS_NOAA21_NRT.
- Archive starts: MODIS 2000-11-01, S-NPP 2012-01-20, NOAA-20 2018-04-01, NOAA-21 2023-03-01. NRT is replaced by SP after ~5 months.
- VIIRS confidence l/n/h and MODIS 0–100 are sensor-native. Do not convert them to fake probabilities.
- Local solar time = UTC + lon/15 (not IST). Grid index must round before floor (see `frontend/src/lib/geo.js`).
- S-NPP new data ends 2 Nov 2026; Terra end of science Feb 2027, Aqua Sep 2027 (NASA plans).

## Git
One branch per milestone. Never push to main without the user's OK.
