# FIREWORK CHRONOS V2 — Supabase data package

## Static (real, no dummy) — load now
1. In Supabase SQL editor run `schema_v2.sql`.
2. Table editor → Import CSV, in this order:
   provenance_label, data_status, satellite, product, firemask_class, modis_type_code,
   viirs_confidence_class, worldcover_class, firms_column, region, grid_cell, region_cell,
   data_source, formula, formula_alias, claim_ledger, conflict_log, audit_check, milestone.
   (Tables modis_type_code, viirs_confidence_class, worldcover_class, firms_column, audit_check, milestone
   are simple: create them with the CSV importer's "create new table" option.)
3. Run the commented UPDATE lines at the end of schema_v2.sql to fill geometry from WKT.

Sources: Natural Earth 10m admin-1 (public domain, downloaded 27 Oct 2026); official FIRMS / GEE / NASA pages read 27 Oct 2026 (see claim_ledger.csv). Cell areas computed on a sphere R = 6371.0088 km.

## Dynamic (fetch with your keys) — never pre-filled
```bash
pip install httpx pandas earthengine-api
export FIRMS_MAP_KEY=...            # https://firms.modaps.eosdis.nasa.gov/api/map_key/
BBOX=73.8,27.6,77.6,32.6 YEARS=2012-2025 MONTHS=10-11 python fetch_and_load.py
earthengine authenticate && EE_PROJECT=... python gee_exposure.py
```
Outputs land in `csv_real/` (fire_detection.csv, cell_day.csv, cell_month_exposure.csv, firms_raw_unmodified.csv).
An empty FIRMS response is written as nothing — it is not a zero-fire result.
