# 06 · Backend and API

## Stack
- **Backend:** Python FastAPI 0.116 + Uvicorn, httpx (HTTP client), python-dotenv, pytest. Folder `backend/app/` (main.py, firms.py, orbits.py, config.py), tests in `backend/tests/`.
- **Frontend:** React 19 + Vite 7 + React Router 7, globe.gl 2.41 / three.js 0.179 (3D Earth, Explorer globe), satellite.js 6 (orbit propagation). The Vite dev server proxies `/api` → `http://localhost:8000`.
- **Database (planned use):** Supabase Postgres + PostGIS with pgvector for RAG.
- **Rule:** every backend response is `{ "data": ..., "meta": { ... } }`. Missing data is never returned as zero. Keys live only in `backend/.env`; the browser never sees a key.

## Run it
```bash
cd frontend && npm install && npm run dev          # http://localhost:5173
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && cp .env.example .env
uvicorn app.main:app --reload --port 8000          # http://localhost:8000
pytest
```
Without keys the site still works on SIMULATED demo data and shows the DEMO status.

## Endpoints that exist today (backend/app/main.py)
| route | what it does | without keys |
|---|---|---|
| `GET /api/health` | lists every data source and whether its key is configured (CONFIGURED / MISSING_KEY / NO_KEY_NEEDED / NOT_CHECKED); `meta.firms_live` = true when FIRMS_MAP_KEY is set | works |
| `GET /api/detections?source=&area=&days=` | NASA FIRMS Area API detections. `source` = comma list of MODIS_NRT, MODIS_SP, VIIRS_SNPP_NRT, VIIRS_SNPP_SP, VIIRS_NOAA20_NRT, VIIRS_NOAA20_SP, VIIRS_NOAA21_NRT (default VIIRS_NOAA20_NRT,VIIRS_SNPP_NRT,MODIS_NRT). `area` = `world` or `west,south,east,north`. `days` = 1–10 | **503 UNAVAILABLE** ("FIRMS_MAP_KEY not set") → the frontend shows its labelled demo fixture |
| `GET /api/satellites` | static satellite facts + real TLEs from CelesTrak (NORAD 25994, 27424, 37849, 43013, 54234), cached 6 h | facts always; TLE null if CelesTrak unreachable |
| `GET /api/regions` | region list with bbox and area | works |
| `GET /api/formulas` | the 46-formula registry as JSON | works |
| `GET /api/calendar/{region}` | serves `data/processed/calendar_{region}.json` written by the pipeline | **404** until a real run exists (the site shows the SIMULATED calendar) |

Errors: 422 with the field and the allowed values for an invalid `source` or `area`; 503 with `status: UNAVAILABLE` when FIRMS fails; 404 for a calendar not yet processed.

## How `/api/detections` works (backend/app/firms.py)
1. URL: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}` (DAY_RANGE 1–10, verified 27 Oct 2026; older notes said 1–5).
2. One request per source, **3 retries with exponential backoff** (1 s, 2 s, 4 s); a response starting with "Invalid" or "<" is treated as an error.
3. Each CSV row becomes a point: `{id, lat, lon, date, utc, lmst, dn, platform, sensor, frp, conf, cls, country, firms_source, version}`.
   - `lmst` = local solar hour via **F01**: (UTC + lon/15) mod 24.
   - `platform` from the source name (snpp, noaa20, noaa21) or the MODIS satellite column (T → terra, A → aqua).
   - `conf` kept **sensor-native** (MODIS 0–100, VIIRS l/n/h) — never converted to a fake probability.
   - `cls` = UNKNOWN until a land-cover join is run; `country` filled later.
4. Results cached for 600 s per (sources, area, days); a cache hit returns `status: CACHED`.
5. If more than `MAX_POINTS` (default 20,000) points, a reproducible random sample (seed 0) is returned and `meta.sampled = true`, `meta.rows_total` keeps the real total.
6. `meta.status` = LIVE_NRT, or ARCHIVE_STANDARD when all sources are SP. `meta.provenance` = OFFICIAL_DOCUMENTED. `meta.unit` = "detections (pixels), not fires". `meta.warnings` = "FIRMS detections have limited accuracy; not for protection of life or property."

## Frontend data flow (frontend/src/api/)
`fetchApiOrFixture(apiPath, fixturePath)`: call the API; if it fails or has no `meta`, load the fixture and set `meta.fallback_used = true`. `statusOf(meta)` → LIVE_NRT / ARCHIVE_STANDARD / CACHED / SIMULATED / UNAVAILABLE / USER, which drives every status chip and the top-bar Source switch (Demo / Archive / Live). Loaders: loadDetections, loadSatellites, loadRegions, loadCalendar, loadFormulas, loadHealth, loadCountries.

## Environment variables (backend/.env — never committed)
| variable | unlocks | where to get it | milestone |
|---|---|---|---|
| FIRMS_MAP_KEY | live + archive fire detections for the whole Earth | https://firms.modaps.eosdis.nasa.gov/api/map_key/ (free, email) | M1 — most important |
| FIRMS_DAY_RANGE | default days per request (1–10) | — | M1 |
| EARTHDATA_USERNAME / EARTHDATA_PASSWORD | MODIS/VIIRS granules (MOD14A1, VNP14A1, MCD64A1) | https://urs.earthdata.nasa.gov | M3/M5 |
| EE_PROJECT | Google Earth Engine exposure (valid observations) | https://code.earthengine.google.com | M3/M5 |
| OPENAQ_API_KEY | air-quality context | https://explore.openaq.org/register | optional |
| SUPABASE_URL / SUPABASE_SERVICE_KEY / DATABASE_URL | database | Supabase project → Settings → API | M4 |
| GROQ_API_KEY or GEMINI_API_KEY | words for the Brief/RAG (never numbers) | console.groq.com / aistudio.google.com | M7, optional |
| ALLOWED_ORIGINS | CORS (default http://localhost:5173) | your frontend URL | deploy |
| MAX_POINTS | max dots sent to the globe (default 20000) | — | performance |
No key needed: CelesTrak, Open-Meteo, NASA POWER, Natural Earth. Frontend: `VITE_API_URL` (optional API base URL).

## Planned API contract (atlas Ch. 27 — PROPOSED, not all built yet)
Every response:
```json
{ "data": { },
  "meta": { "data_source": {"fire_points": "FIRMS VIIRS_SNPP_SP", "exposure": "GEE NASA/VIIRS/002/VNP14A1"},
            "provider": "NASA FIRMS", "product": "VNP14IMG", "version": "2", "processing": "SP",
            "status": "ARCHIVE_STANDARD", "generated_at_utc": "…", "observation_period": ["2024-11-01", "2024-11-30"],
            "region": "punjab_haryana", "unit": "VIIRS-eq cell-days", "method_version": "calib-0.4", "config_hash": "…",
            "coverage": 0.73, "uncertainty": {"level": 0.95, "type": "predictive"},
            "provenance": "RUN_TESTED_LOCALLY", "demo": false, "fallback_used": false, "warnings": [], "citation_urls": [] } }
```
(The values inside this example are illustrative of the shape only.)

| route | returns |
|---|---|
| GET /api/regions | region list + bbox + area (**built**) |
| GET /api/cells?bbox&date&res | aggregates for the map |
| GET /api/cells/:cell?month | inspector payload |
| GET /api/calendar/:region?metric&sensor&dn | matrix with value / lo / hi / coverage / status (**route built, serves pipeline output**) |
| GET /api/calibration/:region | k per stratum + diagnostics |
| GET /api/validation/:region | gates + results |
| GET /api/source/:cell | features, probabilities, prediction set |
| GET /api/blindspot/:region | overpass windows, scenario, B flag |
| GET /api/formulas/:id | registry YAML as JSON (list **built**) |
| GET /api/satellite/:platform | static facts (list **built** as /api/satellites) |
| GET /api/health | status per source (**built**) |
| POST /api/studio/upload · /config · /compare | user data flow |
| GET /api/brief/:region?season | RunReport.json + PDF link |
| POST /api/explain | retrieval + citations only |
Security: keys server-side only; rate limit per IP; bbox ≤ 25° × 25° per request; uploads ≤ 25 MB, type allow-list, isolated, TTL, never executed or sent to an LLM. Performance target: p95 300 ms cached — to be measured, not claimed.

## RAG knowledge base (design — milestone M7)
A RAG system retrieves passages and cites them; it must **never compute fire statistics**. Three separate tools:
1. **Document RAG** — NASA guides, papers, the atlas, formula registry, API docs; chunks by section with page/URL/version; returns cited passages.
2. **Numeric query service** — allow-listed, parameterised SQL/DuckDB templates; returns numbers with interval and status. The LLM never edits them.
3. **Explanation layer** — templates with slots for computed numbers; the LLM may translate to English/Hinglish and explain provenance, never assert new facts.
Answer flow: question → intent parse (numeric or explanatory) → SQL template or hybrid search (BM25 + 384-d embeddings in pgvector) → compose → **citation guard** (drop sentences without a chunk id; refuse any number not in the computed result) → reply with sources and conflicts.
Trust tiers: 1 official product pages / ATBDs · 2 peer-reviewed papers · 3 audited project docs · 4 teaching books (explain only). If sources disagree (e.g. DAY_RANGE 1–5 vs 1–10), show both with dates — never average.
Gold test questions: "What is the denominator of F09?" → valid FireMask days {3,5,7,8,9} per platform · "Is VNP14A1 the same as FIRMS VIIRS?" → no, 1 km daily vs 375 m points · "How many fires burned in Punjab in Nov 2024?" → refuse: hotspots are not fires; offer computed cell-days · "Is B a multiplier?" → no, a disagreement flag.

## Automatic PDF briefs (design — milestone M7)
User picks area + period + metric + audience → server computes first → writes **RunReport.json** (schema runreport/1: request, results {calendar, z, trend, source_mix, blindspot}, quality {coverage, fallbacks, pending}, provenance {products, formulas, code_sha, citations}, text_slots) → plots from arrays in the JSON → HTML template (dark online / light print) → PDF via Chromium → checks (snapshot test; every number in the text must appear in RunReport.json). Pages: cover with 3 findings · map · observed vs harmonised trend with band · calendar with hatched gaps · source mix with UNKNOWN · missed-observation warning · anomaly and trend · data-quality table · lineage (formula IDs, sources, run command) · limitations + "not a life-safety warning".

## Reference code you can quote
- `docs/spec/python_reference/v2/chronos_core.py` — tested V2 functions of the core formulas; `audit_run.py` → audit_results.json; `sim_ladder.py` → sim_ladder.json.
- `docs/spec/python_reference/v1/harmonize.py`, `calendar_build.py` — the old v1 code the audit fixed.
- `frontend/src/lib/geo.js` — F01 local solar hour, F03 cell index (rounded floor, antimeridian clamp), F04 spherical cell area (R = 6371.0088 km), haversine distance, nearest detection, country lookup, day/night test.
- `frontend/src/lib/orbits.js` — illustrative sun-synchronous orbits, ground tracks, sub-solar point (day/night terminator).
