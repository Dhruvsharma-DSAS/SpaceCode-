# 05 · Data sources and database

## Two kinds of data
| kind | where | real? | how it updates |
|---|---|---|---|
| Static facts (no API needed) | `data/supabase/csv/*.csv` (19 files) | **yes** — satellites, products, FIRMS columns, confidence classes, FireMask codes, WorldCover classes, regions, 20,990 grid cells, 46 formulas, data sources, claims, conflicts | edit the CSV, re-import to Supabase |
| Dynamic (needs a key / request) | FIRMS fire detections, CelesTrak orbits, Open-Meteo / NASA POWER weather, Earth Engine exposure | yes, once keys are added | backend fetches and caches |
| Demo fixtures | `frontend/public/data/detections_demo.json`, `calendar_demo.json` | **no — SIMULATED** | `python tools/make_fixtures.py` |
| Browser copies of real facts | `frontend/public/data/countries.json` (Natural Earth 110m), `regions.json`, `satellites.json`, `formulas.json`, `health.json` | yes | built from the CSVs by `tools/make_fixtures.py` |

Rule: the frontend always calls the backend first (`/api/...`); if the backend is down or has no key it falls back to the fixture and shows the correct status chip (SIMULATED DEMO).

## All data sources (data_source.csv, verified 27 Oct 2026 where stated)

| id | input | role | provider | product | key (env var) | cadence | backup of | limits | licence | note |
|---|---|---|---|---|---|---|---|---|---|---|
| firms_area_api | x_fire_points | primary (recent / small areas) | NASA FIRMS | MODIS_SP/NRT, VIIRS_SNPP_SP/NRT, VIIRS_NOAA20_SP/NRT, VIIRS_NOAA21_NRT | FIRMS_MAP_KEY | NRT ~3 h; SP after ~5 months |  | DAY_RANGE: page says 1-10 on 27 Oct 2026 (older notes said 1-5; keep 5 as safe default); transaction quota via MAP_KEY status | NASA open data; cite FIRMS | Area API page fetched; DAY_RANGE conflict logged C-01 |
| firms_archive | x_fire_points | primary (history 2000->) | NASA FIRMS | MODIS C6.1, VIIRS S-NPP/NOAA-20/NOAA-21 375 m | Earthdata login or email code | on request |  | starts: MODIS 2000-11-01, S-NPP 2012-01-20, NOAA-20 2018-04-01, NOAA-21 2023-03-01 | NASA open data | download page fetched |
| laads_earthaccess | x_fire_points | backup | NASA LAADS DAAC | MCD14ML, VNP14IMG, VJ114IMG | EARTHDATA_USERNAME/PASSWORD (~/.netrc) | daily | firms_archive | large files | NASA open data | not re-verified this session |
| gee_mod14a1 | x_clear_days | primary exposure | Google Earth Engine | MODIS/061/MOD14A1, MODIS/061/MYD14A1 | EE_PROJECT (+ earthengine authenticate) | daily |  | noncommercial quota | NASA open data via GEE | catalogue fetched; FireMask classes stored in firemask_class.csv; end date shown inconsistently on page |
| gee_vnp14a1 | x_clear_days | primary exposure (VIIRS) | Google Earth Engine | NASA/VIIRS/002/VNP14A1 (1 km, not 375 m) | EE_PROJECT | daily |  |  | NASA open data via GEE | catalogue fetched |
| planetary_computer_14a1 | x_clear_days | backup | Microsoft Planetary Computer | modis-14A1-061 | none for STAC read | daily | gee_mod14a1 |  | NASA open data | not re-verified |
| gee_mcd64a1 | x_burned_area | primary | Google Earth Engine | MODIS/061/MCD64A1 500 m monthly | EE_PROJECT | monthly |  |  | NASA open data | uses MODIS active fire as input (not independent) |
| esa_worldcover | x_land_cover | primary | ESA | WorldCover 10 m v200 (2021) | EE_PROJECT | static epoch 2021 |  |  | CC BY 4.0 | epoch fixed; land change after 2021 not captured |
| osm_overpass | x_industry | primary | OpenStreetMap | landuse=industrial, man_made=kiln, industrial=brickyard | none | live |  | fair use; bbox order S,W,N,E | ODbL | India kiln coverage incomplete -> NULL not 0 |
| open_meteo_archive | x_weather | context only | Open-Meteo | ERA5-based archive | none | daily/hourly |  | fair use; set timezone=UTC | CC BY 4.0 | weather is context, never a fire label |
| nasa_power | x_weather | backup | NASA LaRC | POWER daily point | none | daily | open_meteo_archive |  | NASA open data | not re-verified |
| openaq_v3 | x_air_quality | impact panel | OpenAQ | PM2.5 stations | OPENAQ_API_KEY | hourly |  | 60/min, 2000/h (prior note) | varies by provider | station coverage sparse |
| celestrak_gp | x_orbits | primary | CelesTrak | GP elements (NORAD 25994, 27424, 37849, 43013, 54234) | none | daily |  | polite use | public | derive overpass times; or from FIRMS acq_time |
| natural_earth | x_boundaries | STATIC CSV (included) | Natural Earth | admin-1 10m | none | static |  |  | public domain | downloaded and gridded into region.csv / region_cell.csv |
| geoboundaries | x_boundaries | backup (districts) | geoBoundaries | ADM2 | none | static | natural_earth |  | CC BY 4.0 (gbOpen) | not reachable from this sandbox |
| cmr_search | x_granule_index | health/archive | NASA CMR | granule search | none | live |  |  | public |  |


## The 19 static CSVs (real data, in `data/supabase/csv/`)
| file | rows | what it holds |
|---|---|---|
| audit_check.csv | 36 | checks executed in the V2 formula audit (old vs new, verdict) |
| claim_ledger.csv | 20 | every factual claim with its source URL, date verified and status |
| conflict_log.csv | 15 | disagreements between old documents and new evidence, with decisions |
| data_source.csv | 16 | every input source, endpoint, key, cadence, backup, licence |
| data_status.csv | 6 | the six data status values |
| firemask_class.csv | 20 | FireMask classes of MOD14A1/MYD14A1/VNP14A1 and the exposure rule for each |
| firms_column.csv | 16 | meaning and unit of every FIRMS CSV column |
| formula.csv | 46 | the 46 formulas (equations V1/V2, verdict, code hook, UI surface) |
| formula_alias.csv | 8 | old formula names → registry IDs |
| grid_cell.csv | 20,990 | 0.1° grid cells over the regions with centre, exact area (km²) and polygon |
| milestone.csv | 10 | milestones M0–M9 with done-when |
| modis_type_code.csv | 4 | MODIS FIRMS type codes (0 vegetation, 1 volcano, 2 static land, 3 offshore) |
| product.csv | 5 | the five fire products and what they measure |
| provenance_label.csv | 5 | the five provenance labels |
| region.csv | 8 | 8 regions with ISO code, role, bbox, gridded area, boundary source |
| region_cell.csv | 22,060 | which cells belong to which region and the fraction inside |
| satellite.csv | 5 | the 5 satellites: NORAD id, launch, archive start, crossing time, planned end |
| viirs_confidence_class.csv | 3 | VIIRS l/n/h and how V2 uses each |
| worldcover_class.csv | 11 | ESA WorldCover classes and their role in Layer 2 |

Cell areas are computed on a sphere R = 6371.0088 km (F04): a 0.1° cell is ~123.6 km² at the equator and ~106 km² in Punjab; it shrinks toward the poles. Boundaries: Natural Earth 10m admin-1 (de facto, public domain, downloaded 27 Oct 2026).

## Satellites (satellite.csv — OFFICIAL DOCUMENTED)

| id | name | sensor | NORAD | launch | FIRMS archive start | equator crossing (local solar) | planned end (as of 27 Oct 2026) | FIRMS sources |
|---|---|---|---|---|---|---|---|---|
| terra | Terra | MODIS | 25994 | 1999-12-18 | 2000-11-01 | ~10:30 descending (drifted earlier; ~10:15 by fall 2022) | Feb 2027 end of science (NASA, 29 Dec 2025); Jan 2027 end of data collection (CAMS, 25 Feb 2026) | MODIS_SP / MODIS_NRT (Terra+Aqua combined as MODIS C6.1) |
| aqua | Aqua | MODIS | 27424 | 2002-05-04 | 2002-07-04 | ~13:30 ascending (drifting) | Sep 2027 end of science (NASA); ~Sep 2027 (CAMS) | MODIS_SP / MODIS_NRT |
| snpp | Suomi NPP | VIIRS | 37849 | 2011-10-28 | 2012-01-20 | ~13:30 ascending | Delivery of new data ceases 2 Nov 2026 (NASA Earthdata) - future event as of 27 Oct 2026 | VIIRS_SNPP_SP / VIIRS_SNPP_NRT |
| noaa20 | NOAA-20 (JPSS-1) | VIIRS | 43013 | 2017-11-18 | 2018-04-01 | ~13:30 ascending (about half an orbit from S-NPP) | operational | VIIRS_NOAA20_SP / VIIRS_NOAA20_NRT |
| noaa21 | NOAA-21 (JPSS-2) | VIIRS | 54234 | 2022-11-10 | 2023-03-01 | ~13:30 ascending | operational | VIIRS_NOAA21_NRT (no SP source listed in Area API on 27 Oct 2026) |


## Products (product.csv)

| id | name | geometry | record start | latency |
|---|---|---|---|---|
| firms_modis_c61 | FIRMS MODIS C6.1 active fire (MCD14ML-derived) | point (1 km nominal pixel centre) | 2000-11-01 | NRT ~3 h; SP replaces NRT after ~5 months |
| firms_viirs_375 | FIRMS VIIRS 375 m active fire (VNP14IMG / VJ114IMG / VJ214IMG) | point (375 m I-band pixel centre) | 2012-01-20 | NRT; SP for S-NPP and NOAA-20 |
| mod14a1_myd14a1 | MODIS MOD14A1/MYD14A1 v061 daily thermal anomaly | raster 1 km daily | 2000-02-24 | GEE catalogue end date inconsistent on page (2025-10 vs 2026-10) |
| vnp14a1 | VIIRS VNP14A1 v002 daily thermal anomaly | raster 1 km daily (NOT the 375 m FIRMS points) | 2012-01-19 | GEE catalogue end date inconsistent on page |
| mcd64a1 | MODIS MCD64A1 v061 burned area | raster 500 m monthly | 2000-11-01 | monthly, lagged; catalogue end date inconsistent |


## FIRMS columns (firms_column.csv)

| column | sensor | meaning | unit |
|---|---|---|---|
| latitude | both | pixel centre latitude | deg |
| longitude | both | pixel centre longitude | deg |
| brightness | MODIS | channel 21/22 brightness temperature | K |
| bright_t31 | MODIS | channel 31 brightness temperature | K |
| bright_ti4 | VIIRS | I-4 brightness temperature | K |
| bright_ti5 | VIIRS | I-5 brightness temperature | K |
| scan | both | along-scan pixel size | km |
| track | both | along-track pixel size | km |
| acq_date | both | acquisition date | UTC date |
| acq_time | both | acquisition time HHMM | UTC |
| satellite | both | Terra/Aqua or N/1/2 code | - |
| confidence | both | MODIS 0-100; VIIRS l/n/h | - |
| version | both | collection/processing version (NRT/SP) | - |
| frp | both | fire radiative power | MW |
| daynight | both | D or N | - |
| type | MODIS archive | 0 veg, 1 volcano, 2 static, 3 offshore | - |


## FireMask classes and exposure rule (firemask_class.csv)

| product | value | meaning (catalogue 27 Oct 2026) | exposure rule V2 |
|---|---|---|---|
| MOD14A1 | 0 | not defined on catalogue page | exclude |
| MOD14A1 | 1 | not processed (obsolete) | exclude |
| MOD14A1 | 2 | not processed (other reason) | exclude |
| MOD14A1 | 3 | non-fire water | exclude_water |
| MOD14A1 | 4 | cloud (land or water) | not_observable |
| MOD14A1 | 5 | non-fire land | valid |
| MOD14A1 | 6 | unknown (land or water) | exclude |
| MOD14A1 | 7 | fire, low confidence | valid |
| MOD14A1 | 8 | fire, nominal confidence | valid |
| MOD14A1 | 9 | fire, high confidence | valid |
| VNP14A1 | 0 | not processed (no/poor data) | exclude |
| VNP14A1 | 1 | not processed (bowtie deletion) | exclude |
| VNP14A1 | 2 | unused | exclude |
| VNP14A1 | 3 | water | exclude_water |
| VNP14A1 | 4 | cloud | not_observable |
| VNP14A1 | 5 | land | valid |
| VNP14A1 | 6 | unclassified | exclude |
| VNP14A1 | 7 | low-confidence fire | valid |
| VNP14A1 | 8 | nominal-confidence fire | valid |
| VNP14A1 | 9 | high-confidence fire | valid |


## VIIRS confidence and MODIS type codes

| code | meaning | use_v2 |
|---|---|---|
| l | low | sensitivity runs only |
| n | nominal | default keep |
| h | high | default keep |



| code | meaning | use_v2 |
|---|---|---|
| 0 | presumed vegetation fire | keep |
| 1 | active volcano | exclude from crop calendar |
| 2 | other static land source | exclude from calibration; keep in source layer |
| 3 | offshore | exclude |


## ESA WorldCover classes (Layer 2 context)

| value | class | role_in_L2 |
|---|---|---|
| 10 | Tree cover | forest |
| 20 | Shrubland | wildland |
| 30 | Grassland | wildland |
| 40 | Cropland | crop |
| 50 | Built-up | industrial/urban context |
| 60 | Bare / sparse vegetation | other |
| 70 | Snow and ice | other |
| 80 | Permanent water bodies | mask |
| 90 | Herbaceous wetland | wildland |
| 95 | Mangroves | forest |
| 100 | Moss and lichen | other |


## Regions (region.csv — SOURCE-DERIVED)

| id | name | country | ISO | role | W | S | E | N | area km² |
|---|---|---|---|---|---|---|---|---|---|
| california | California | United States of America | US-CA | global_test | -124.4092 | 32.5317 | -114.1191 | 41.9995 | 409602.6 |
| mato_grosso | Mato Grosso | Brazil | BR-MT | global_test | -61.6113 | -18.0316 | -50.2357 | -7.3391 | 906655.5 |
| punjab | Punjab | India | IN-PB | flagship | 73.8423 | 29.5598 | 76.9104 | 32.5167 | 50444.3 |
| new_south_wales | New South Wales | Australia | AU-NSW | global_test | 141.0001 | -37.5103 | 153.6306 | -28.1493 | 802466.5 |
| delhi | Delhi | India | IN-DL | air_quality_context | 76.8337 | 28.4326 | 77.3375 | 28.8821 | 1480.9 |
| chandigarh | Chandigarh | India | IN-CH | flagship | 76.6937 | 30.6723 | 76.8273 | 30.799 | 120.1 |
| haryana | Haryana | India | IN-HR | flagship | 74.4594 | 27.6704 | 77.588 | 30.9343 | 43996.8 |
| punjab_haryana | Punjab + Haryana + Chandigarh (flagship) | India | IN-PB+IN-HR+IN-CH | flagship | 73.8423 | 27.6704 | 77.588 | 32.5167 | 94561.2 |


## Data status values (data_status.csv)

| status | meaning |
|---|---|
| LIVE_NRT | FIRMS near-real-time feed fetched in the last 24 h |
| ARCHIVE_STANDARD | FIRMS standard processing (SP) archive |
| CACHED | last good copy served because the source failed; shows its observation date |
| SIMULATED | demo fixture |
| UNAVAILABLE | source failed and no cache; value stays null |
| USER | user-uploaded data |


## Claim ledger — every fact and where it comes from (claim_ledger.csv)

| claim_id | claim | value | region | status | source_url | verified_on |
|---|---|---|---|---|---|---|
| CL-01 | FIRMS MODIS C6.1 archive start | 2000-11-01 | global | OFFICIAL DOCUMENTED | https://firms.modaps.eosdis.nasa.gov/download/ | 2026-10-27 |
| CL-02 | FIRMS VIIRS S-NPP archive start | 2012-01-20 | global | OFFICIAL DOCUMENTED | https://firms.modaps.eosdis.nasa.gov/download/ | 2026-10-27 |
| CL-03 | FIRMS VIIRS NOAA-20 archive start | 2018-04-01 | global | OFFICIAL DOCUMENTED | https://firms.modaps.eosdis.nasa.gov/download/ | 2026-10-27 |
| CL-04 | FIRMS VIIRS NOAA-21 archive start | 2023-03-01 | global | OFFICIAL DOCUMENTED | https://firms.modaps.eosdis.nasa.gov/download/ | 2026-10-27 |
| CL-05 | NRT replaced by standard data | ~5 months lag | global | OFFICIAL DOCUMENTED | https://firms.modaps.eosdis.nasa.gov/download/ | 2026-10-27 |
| CL-06 | S-NPP new data delivery ceases | 2 Nov 2026 (future as of 27 Oct) | global | OFFICIAL DOCUMENTED (plan) | https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs | 2026-10-27 |
| CL-07 | Terra end of science | Feb 2027 (NASA); data collection Jan 2027 (CAMS) | global | OFFICIAL DOCUMENTED (plan) | https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/ | 2026-10-27 |
| CL-08 | Aqua end of science | Sep 2027 | global | OFFICIAL DOCUMENTED (plan) | same | 2026-10-27 |
| CL-09 | Terra equator crossing by fall 2022 | ~10:15 | global | OFFICIAL DOCUMENTED | same | 2026-10-27 |
| CL-10 | CAMS GFAS added VIIRS | 4 Dec 2025 | global | OFFICIAL DOCUMENTED | https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system | 2026-10-27 |
| CL-11 | MOD14A1 FireMask 4 = cloud, 5 = non-fire land, 6 = unknown, 7-9 fire | classes | global | OFFICIAL DOCUMENTED | https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD14A1 | 2026-10-27 |
| CL-12 | VNP14A1 is 1 km daily (not 375 m) | 1000 m | global | OFFICIAL DOCUMENTED | https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP14A1 | 2026-10-27 |
| CL-13 | MCD64A1 uses 1 km MODIS active fire as input | yes | global | OFFICIAL DOCUMENTED | https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD64A1 | 2026-10-27 |
| CL-14 | Punjab large farm fires after 3 pm | >90% in 2024-25 (3% in 2021) | Punjab | SOURCE-DERIVED (secondary report) | iFOREST 2025 via Tribune (secondary) | 2026-10-15 |
| CL-15 | Punjab burnt area | ~31,447 km2 (2022) -> ~20,000 km2 (2025) | Punjab | SOURCE-DERIVED (secondary report) | iFOREST 2025 via Tribune (secondary) | 2026-10-15 |
| CL-16 | Kiln Watch seam reduction 2.9% | self-reported | Bangladesh | UNREVIEWED | github.com/Aalvee-Aarham/kiln-watch | 2026-10-15 |
| CL-17 | FireCal LOYO 1.6-5% | self-reported | global | UNREVIEWED | github.com/samuelakosaonyejekwe/firecal | 2026-10-15 |
| CL-18 | Gridded area Punjab (Natural Earth) | 50,444 km2 | Punjab | SOURCE-DERIVED | computed, region.csv | 2026-10-27 |
| CL-19 | VIIRS I4 saturates on ~8% of daytime fire pixels | ~8% | global | OFFICIAL DOCUMENTED (paper, via project notes) | Schroeder et al. 2014 | 2026-10-15 |
| CL-20 | MODIS confidence field is experimental | - | global | OFFICIAL DOCUMENTED | https://firms2.modaps.eosdis.nasa.gov/alerts/notes.php | 2026-10-27 |


## Conflict log — old position vs new evidence (conflict_log.csv)

| conflict_id | topic | old_position | new_position | decision | status |
|---|---|---|---|---|---|
| C-01 | FIRMS Area API DAY_RANGE | Book 2 + user audit: 1-5 days; code MAX_DAYS_PER_CALL=5 | Area API page fetched 27 Oct 2026 shows 1-10 | Keep 5 as default (valid under both), make it config FIRMS_DAY_RANGE | RESOLVED (reversible) |
| C-02 | Sensor colours | Home amber MODIS / cyan VIIRS; data pages blue MODIS / orange VIIRS | One semantic palette proposed: MODIS amber, VIIRS cyan everywhere, dark-surface tints #FFB547/#3DD6F5, light-surface #A86A00/#0B7F99 | PROPOSED: unify on amber/cyan; needs user approval | OPEN (user decision) |
| C-03 | F24 interval level | Spec: 95% (2.5-97.5) | Book 3 + code: 5-95 (90%) | Explicit alpha parameter; UI legend states level | RESOLVED |
| C-04 | F27 scale | code: raw counts; atlas: ln(1+x); visual guide: ln(rate) | log((F+0.5)/(E+1)), leave-target-out | Adopt v2 | RESOLVED (pending real-data check) |
| C-05 | F14 meaning | described as an independent check of F11 | intercept-only offset GLM equals ratio of totals | Rename B3b 'ratio of totals'; GLM proper uses exposure offset | RESOLVED |
| C-06 | Layer 4 name | Atlas: 'Your-data Studio' | Strategy: unusual/trend | L4 = 'Is this month unusual or trending?'; Studio is a tool, not a layer | RESOLVED |
| C-07 | Formula families | Build Spec says 8 families | tables list 7 groups | 7 families | RESOLVED |
| C-08 | MODIS end dates | Build Spec: Terra Jan 2027 | NASA (Dec 2025): end of science Feb 2027; CAMS (Feb 2026): data collection Jan 2027; Aqua Sep 2027 | Show both with source and as-of date | RESOLVED |
| C-09 | VIIRS confidence numbers | UI 'nominal (0.6) same rule both sensors' | categorical sensor-native classes | Remove numeric label | OPEN (touches locked page copy) |
| C-10 | B ratio meaning | 'B = 2.4 means real burning ~2x the dots' | B is a disagreement flag | Flag only | RESOLVED |
| C-11 | Calendar zeros | calendar_matrix fill_value=0 | null + status | mask-aware cells | RESOLVED |
| C-12 | Grid area claim | '0.1 deg cell ~ 106 km2' used as if constant | area varies 123.6 (equator) to 0.1 km2 (pole) | store area per cell | RESOLVED |
| C-13 | Explorer 60 fps claim | Build Spec: 60 fps at 100k cells | Final contract measured 60 fps on ~hundreds of cells only | Claim only what was measured | OPEN (measure) |
| C-14 | Overpass times | fixed Terra 10:30 / Aqua 13:30 | Terra ~10:15 by fall 2022 (NASA) | use observed acq_time per year | RESOLVED |
| C-15 | Formula IDs in chats | chat walkthroughs: 'F09 calibration', 'F16 bootstrap' | registry: F09 exposure rate, F16 delta interval, F24 bootstrap | alias table, IDs never used alone | RESOLVED |


## Database (Supabase / Postgres + PostGIS, `data/supabase/schema_v2.sql`)
Static tables (filled from the CSVs now): provenance_label, data_status, region, grid_cell, region_cell, satellite, product, firemask_class, data_source, formula, formula_alias, claim_ledger, conflict_log (+ modis_type_code, viirs_confidence_class, worldcover_class, firms_column, audit_check, milestone created by the CSV importer).

Dynamic tables (filled only by the real pipeline — never pre-filled with dummy rows):
| table | key columns |
|---|---|
| fire_detection | platform_id, firms_source, processing NRT/SP, lat, lon, acq_date, acq_time_utc, daynight, confidence_raw, frp, scan, track, brightness, firms_type, version, cell_id |
| cell_day | cell_id, acq_date, platform_id, daynight, n_detections, n_nominal_or_high, max_frp |
| cell_month | cell_id, month, platform, dn, fire_cell_days, valid_obs_days, cloud_days, status, exposure_product |
| calibration | region, stratum, method, k, k_lo, k_hi, n_years, dispersion, heldout_deviance, status, method_version, hash |
| calendar_value | region_id, month, metric, value (NULLABLE), lo, hi, level, coverage, status, provenance, method_version, config_hash |
| validation_run | test, metric, value, threshold, passed, predeclared_on |
| lineage | inputs, code_sha, params |
| doc_chunk (RAG) | doc_id, source_url, tier, page, heading_path, checksum, body, embedding vector(384) |

Import order: run schema_v2.sql → import enums (provenance_label, data_status, satellite, product, firemask_class, modis_type_code, viirs_confidence_class, worldcover_class, firms_column) → region, grid_cell, region_cell (then run the commented UPDATE lines to build geometry from WKT) → data_source, formula, formula_alias, claim_ledger, conflict_log, audit_check, milestone → later the real pipeline outputs.

Real-data scripts (need keys): `data/supabase/fetch_and_load.py` (FIRMS archive → fire_detection, cell_day; `BBOX=73.8,27.6,77.6,32.6 YEARS=2012-2025 MONTHS=10-11`) and `data/supabase/gee_exposure.py` (Earth Engine valid-observation exposure → cell_month). An empty FIRMS response is written as nothing — it is not a zero-fire result.

## Website fixtures (`frontend/public/data/`)
| file | content | label |
|---|---|---|
| detections_demo.json | 7,375 synthetic detections 20–26 Oct 2026 in real fire regions (FIRMS-shaped: lat, lon, date, utc, lmst, dn, platform, sensor, frp, conf, cls, country) | SIMULATED |
| calendar_demo.json | monthly MODIS and VIIRS cell-days 2003–2025 + exposure, from the simulated world (sim_ladder.py) | SIMULATED |
| satellites.json | the five satellites with illustrative orbits (real TLEs come from /api/satellites) | real facts |
| regions.json, formulas.json, health.json, countries.json | built from the CSVs / Natural Earth | real facts |
| /satellites/aqua.glb, suomi_npp.glb, terra.glb | official NASA 3D models (NASA/Brian E. Kumanchik; NASA/Christian A. Lopez), Draco-compressed, shape unchanged | official |

## Research results (`data/research/`)
- `sim_ladder.json` — the B0–B4 leave-one-year-out simulation (60 simulated worlds; numbers in file 03).
- `audit_results.json` — the 36 audit checks executed for the formula audit.
