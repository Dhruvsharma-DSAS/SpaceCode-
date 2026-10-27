# Data guide

## Two kinds of data
| kind | where | real? | how it updates |
|---|---|---|---|
| **Static** (no API, just facts) | `data/supabase/csv/*.csv` (19 files) | yes — satellites, products, FIRMS columns, confidence classes, FireMask codes, WorldCover classes, regions, 46 formulas, sources | edit the CSV, re-import to Supabase |
| **Dynamic** (needs a key / request) | FIRMS fire detections, CelesTrak TLEs, Open-Meteo/POWER weather, Earth Engine exposure | yes, once keys are added | backend fetches and caches (`backend/app/firms.py`, `orbits.py`) |
| **Demo fixtures** | `frontend/public/data/detections_demo.json`, `calendar_demo.json` | **no — SIMULATED** | `python tools/make_fixtures.py` |
| **Browser fixtures of real facts** | `frontend/public/data/countries.json` (Natural Earth 110m), `regions.json`, `satellites.json`, `formulas.json`, `health.json` | yes | made from the CSVs by `tools/make_fixtures.py` |

The frontend always calls the backend first (`/api/...`). If the backend is down or has no key, it falls back to the fixture and shows the correct status chip.

## Detection point (one dot on the globe)
```json
{ "id": "d000123", "lat": -12.41, "lon": 27.83, "date": "2026-10-26", "utc": "11:42",
  "lmst": 13.6, "dn": "D", "platform": "noaa20", "sensor": "VIIRS",
  "frp": 14.2, "conf": "n", "cls": "UNKNOWN", "country": "Zambia", "iso3": "ZMB" }
```
- `platform`: terra, aqua, snpp, noaa20, noaa21. `sensor`: MODIS or VIIRS.
- `conf`: VIIRS l/n/h, MODIS 0–100 — kept native.
- `lmst` = local solar hour = UTC + lon/15.
- `cls` (crop / wildland / industrial / UNKNOWN) is a probable source class; live FIRMS rows come as UNKNOWN until a land-cover join is run.

## API contract
Every backend response: `{ "data": ..., "meta": { "status", "provenance", "source", "fetched_at", "fallback_used", ... } }`.
Status values: LIVE_NRT, ARCHIVE_STANDARD, CACHED, SIMULATED, UNAVAILABLE, USER.

## Supabase
`data/supabase/schema_v2.sql` → run first. Then import CSVs in the order listed in `data/supabase/README_DB.md`.
`data/supabase/fetch_and_load.py` pulls FIRMS into the `detection` table once you have the key; `gee_exposure.py` computes valid-observation exposure with Earth Engine.

## Reference material
- `docs/spec/FIREWORK_CHRONOS_V2_Research_Atlas.pdf` — 188-page atlas (formulas, audits, design).
- `docs/spec/formula_registry/F01–F46.yaml` — every formula, inputs, units, verdict.
- `docs/spec/python_reference/v2/chronos_core.py` — tested Python versions of the core formulas.
- `docs/spec/docs_v2/` — claim ledger, conflicts, open questions, error budget, source register.
