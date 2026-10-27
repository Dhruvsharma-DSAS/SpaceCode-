# Prompt to paste into Claude Code

Copy everything inside the box into Claude Code, opened in the root of this folder (or your clone of https://github.com/Dhruvsharma-DSAS/FIREWORK).

```
You are working on FIREWORK CHRONOS (NASA Space Apps 2026 — Harmonization of MODIS and VIIRS Hot Spots).
The app is a global 3D Earth: every satellite fire detection is a visible dot on a globe, plus a month × year calendar.

Before you change anything:
1. Read CLAUDE.md, then docs/DESIGN.md, docs/DATA.md, docs/API_KEYS.md.
2. Look at design/screenshots/*.png — that is the current, approved look. Keep it.
3. Run the app: `cd frontend && npm install && npm run dev` and `cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`.
   Without keys the site runs on SIMULATED demo data and shows the amber SIMULATED DEMO chip. That is expected.

Rules: follow CLAUDE.md code style literally (no ternaries, no custom hooks, no useRef, no comments in frontend, full files,
store globe.gl instances with setGlobe(() => g)). Keys only in backend/.env. Never fabricate numbers. One git branch per
milestone, never push to main without my OK. Ask before adding any npm/pip package.

Do the milestones in docs/CLAUDE_CODE_PROMPT.md in order. After each one: run `npx vite build`, run `pytest` in backend,
open the page in a browser, and tell me what changed in 5 lines or fewer.
Start with Milestone 1.
```

## Milestones

### M1 — Live fires on the globe (needs `FIRMS_MAP_KEY`)
- Put the key in `backend/.env` (see API_KEYS.md). `GET /api/detections?area=world&days=1` must return `meta.status = LIVE_NRT`.
- Explorer: the chip switches from SIMULATED DEMO to LIVE NRT automatically (already wired through `fetchApiOrFixture`).
- Add a "days" selector 1–10 in the Layer panel that passes `days` to the API.
- Done when: the whole-Earth globe shows today's real dots (Africa, South America, SE Asia, Australia) and the chip says LIVE NRT.

### M2 — Real satellite positions
- `backend/app/orbits.py` already fetches CelesTrak TLEs (Terra 25994, Aqua 27424, S-NPP 37849, NOAA-20 43013, NOAA-21 54234). Confirm `/api/satellites` returns `tle1/tle2`; the globe then uses satellite.js automatically and the "illustrative" label disappears.

### M3 — Archive calendar for any area of Earth
- New script `backend/pipeline/build_calendar.py`: download FIRMS archive (SP) CSVs per sensor for a bbox, grid to 0.1° × local day (F01, F03 in `frontend/src/lib/geo.js` and `docs/spec/python_reference/v2/chronos_core.py`), count cell-days per month, write `data/processed/calendar_{region}.json` in the same shape as `frontend/public/data/calendar_demo.json` but with `meta.provenance = SOURCE_DERIVED`.
- Region `world` is the default. Missing months are `null`, not 0.
- `/api/calendar/{region}` already serves those files.

### M4 — Supabase
- Run `data/supabase/schema_v2.sql` in the Supabase SQL editor, import `data/supabase/csv/*.csv` (order in `data/supabase/README_DB.md`).
- Backend reads regions, formulas and sources from Supabase when `SUPABASE_URL` is set, otherwise from the JSON fixtures.

### M5 — Harmonisation panel (k with an interval)
- Overlap years 2012–2026, same cells, same days: fit k = VIIRS / MODIS (F-series in the atlas, Part III). Show k only with its 90 % interval and `RUN_TESTED_LOCALLY` label; until then it stays "—".

### M6 — Formula pages with maths
- Render formula expressions (ask me before adding KaTeX). Source: `docs/spec/formula_registry/*.yaml`.

### M7 — Brief (auto-PDF) and optional RAG
- `/brief/:id` prints a one-page report from computed numbers only. If an LLM is added (GROQ/GEMINI key), it writes sentences around numbers and never invents numbers.

### Never
- Do not replace the globe with a flat map. Do not narrow the default view to one country — the default is the whole Earth.
- Do not remove the SIMULATED DEMO chip while demo data is on screen.
