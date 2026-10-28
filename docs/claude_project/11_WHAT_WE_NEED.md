# 11 · What we still need — keys, .env, data and decisions

Everything below is what turns the SIMULATED site into real results. **Never paste a real key into chat, a Claude Project file, a screenshot, a PDF or a commit.** Keys go only in `backend/.env` (git-ignored).

## A. Keys and accounts (in priority order)
| # | what | where to get it | time / cost | unlocks on the site | milestone |
|---|---|---|---|---|---|
| 1 | **FIRMS_MAP_KEY** | https://firms.modaps.eosdis.nasa.gov/api/map_key/ — enter email, key arrives by email | minutes · free | Explorer and Home switch from SIMULATED to **LIVE NRT** real NASA detections for the whole Earth; Source switch shows "Live"; Area API standard (SP) data for small areas | M1 — most important |
| 2 | **NASA Earthdata login** (EARTHDATA_USERNAME / EARTHDATA_PASSWORD) | https://urs.earthdata.nasa.gov — register | minutes · free | FIRMS archive download requests; LAADS granules (backup); burned area MCD64A1 | M2/M3 |
| 3 | **Google Earth Engine project** (EE_PROJECT) | https://code.earthengine.google.com — register a non-commercial project, then run `earthengine authenticate` on your machine | ~1 day approval · free (non-commercial) | **exposure** (clear-sky days from MOD14A1 / MYD14A1 / VNP14A1) → exposure rate, Clear-sky coverage layer, Land cover (WorldCover), Burned area layer | M2/M3 |
| 4 | **Supabase project** (SUPABASE_URL / SUPABASE_SERVICE_KEY / DATABASE_URL) | https://supabase.com → new project → Settings → API / Database | minutes · free tier | database for regions, formulas, sources (now from JSON), and later cell_day / cell_month / calendar_value | M4 |
| 5 | OPENAQ_API_KEY (optional) | https://explore.openaq.org/register | minutes · free | PM2.5 air-quality context panel | optional |
| 6 | GROQ_API_KEY **or** GEMINI_API_KEY (optional) | console.groq.com / aistudio.google.com | minutes · free tier | words for the PDF Brief and the "explain" assistant (never numbers) | M7 |
No key needed: CelesTrak (real satellite positions), Open-Meteo, NASA POWER, Natural Earth.

## B. The exact `backend/.env` (copy `backend/.env.example`, fill only what you have)
```
FIRMS_MAP_KEY=                 # 1 — from the FIRMS map_key page
FIRMS_DAY_RANGE=1              # days per request, 1–10 (5 is a safe default)
EARTHDATA_USERNAME=            # 2
EARTHDATA_PASSWORD=            # 2
EE_PROJECT=                    # 3 — your Earth Engine cloud project id
OPENAQ_API_KEY=                # 5 optional
SUPABASE_URL=                  # 4
SUPABASE_SERVICE_KEY=          # 4 — server only, never in the frontend
DATABASE_URL=                  # 4 — postgres connection string
GROQ_API_KEY=                  # 6 optional (or GEMINI_API_KEY)
GEMINI_API_KEY=
ALLOWED_ORIGINS=http://localhost:5173   # add the deployed frontend URL later
MAX_POINTS=20000               # max dots sent to the globe
```
Frontend `frontend/.env` (only when deployed): `VITE_API_URL=https://<your-backend-url>`.
Check after adding a key: `curl http://localhost:8000/api/health` → FIRMS shows `CONFIGURED` and `meta.firms_live: true`.

## C. Data to request or download
| # | data | how | exact request | why |
|---|---|---|---|---|
| 1 | **FIRMS archive (standard processing)** | https://firms.modaps.eosdis.nasa.gov/download/ (Earthdata login) | sources: MODIS C6.1, VIIRS S-NPP 375 m, VIIRS NOAA-20 375 m · area: Punjab + Haryana bbox **73.8, 27.6, 77.6, 32.6** (W, S, E, N) · dates: **2012–2025** first (overlap), then MODIS **2000–2011** · format CSV | the calendar, k, validation — nothing real exists without it |
| 2 | First small real slice (M2) | `BBOX=73.8,27.6,77.6,32.6 YEARS=2012-2025 MONTHS=10-11 python data/supabase/fetch_and_load.py` | start with **one district × one overlap year** (e.g. Ludhiana 2019) | proves the pipeline end to end before the big run |
| 3 | Exposure | `earthengine authenticate && EE_PROJECT=... python data/supabase/gee_exposure.py` | same bbox and months | denominator of the rate (F09) |
| 4 | Global test regions | same steps | California, Mato Grosso, New South Wales (bboxes in region.csv) | proves the method is global (decision D4) |
| 5 | Burned area | Earth Engine `MODIS/061/MCD64A1` | same bbox, 2001–latest | Layer 3 disagreement flag (F46) — shown PENDING while lagged |
| 6 | District boundaries (optional) | geoBoundaries ADM2 India (CC BY 4.0) | Punjab, Haryana districts | district-level calendars and briefs |
| 7 | Labelled kiln / flare / industrial sites (optional) | lawful public references only (who can provide?) | any verified list for Punjab/Haryana | needed before Layer 2 source classes can be called validated (G11) |
| 8 | Official burn records (optional, research) | state agencies, with permission | field-verified burn events by date/time | R7 ground-truth triangulation |
Outputs land in `csv_real/` (fire_detection.csv, cell_day.csv, cell_month_exposure.csv, firms_raw_unmodified.csv). An empty FIRMS response is written as nothing — it is not a zero-fire result.

## D. Software on your machine
Node 20+ (you have 25) · Python 3.11+ with `pip install -r backend/requirements.txt` and, for the data scripts, `pip install httpx pandas earthengine-api` · Google Chrome + ffmpeg (only for re-recording the Home clips with `tools/record_clips.mjs`).

## E. Decisions still open (yours)
1. Re-read the full 2026 challenge statement and rules (released 28 Oct) — especially rules on code written before the event and the official datasets list.
2. Final regions beyond Punjab–Haryana (proposed: California, Mato Grosso, New South Wales).
3. Headline metric wording on the site: exposure-normalised rate as the KPI, cell-days as the display unit (decision D1, proposed default).
4. Where to deploy (frontend: Vercel / Netlify; backend: a Python host) and the public URL for ALLOWED_ORIGINS.
5. Whether to push the latest local changes (new navigation, Explorer analysis, this pack) to GitHub.

## F. What happens after each item arrives
| you provide | we then build | visible result |
|---|---|---|
| FIRMS_MAP_KEY | "days" selector 1–10 wired to the API | live dots worldwide, LIVE status |
| archive CSVs + EE exposure (one year) | `backend/pipeline/build_calendar.py`: grid (F03), cell-days (F05), exposure (F09), monthly matrix with nulls | real calendar for one region, SOURCE-DERIVED |
| full overlap years | calibration (F14, F18), bands (F24/F25), harmonised MODIS years (F12) | k with 95% interval on Sensor Lab; harmonised calendar; seam fades |
| held-out runs | validation gates G1–G12 computed | Validation page filled, pass/fail per gate |
| Supabase | backend reads static tables from the database | same pages, database-backed |
| LLM key (optional) | RunReport.json → PDF brief with citation guard | one-page brief for a district officer |
