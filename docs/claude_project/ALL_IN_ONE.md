# FIREWORK CHRONOS — Claude Project knowledge pack

NASA Space Apps 2026 · Challenge: **Harmonization of MODIS and VIIRS Hot Spots**
Team: Dhruv Sharma and team · Pack written 28 Oct 2026 from the Spacecode 3 code, data and the V2 Research Atlas (27 Oct 2026).
Code: https://github.com/Dhruvsharma-DSAS/SpaceCode-

## What this pack is
Everything about the project in plain Markdown so a Claude Project can answer questions, write speeches and explain formulas, the backend and the data **without inventing anything**. Upload every file in this folder (or just `ALL_IN_ONE.md`).

| file | what is inside |
|---|---|
| 01_PROJECT_OVERVIEW.md | the problem, our answer, four layers, users, why now, what is real vs simulated |
| 02_SCIENCE_AND_SATELLITES.md | how satellites see fire, MODIS vs VIIRS, seams, orbits and time, products, masks, myths |
| 03_METHOD_PIPELINE.md | 9-step pipeline, unified model, combined algorithm, baseline ladder, validation gates, error budget, four layers, R1–R10 |
| 04_FORMULAS_F01_F46.md | all 46 formulas: purpose, equation, inputs, audit verdict, worked example, code, where it appears |
| 05_DATA_SOURCES_AND_DATABASE.md | every data source, the 19 static CSVs, database tables, satellites, regions, claims and conflicts |
| 06_BACKEND_AND_API.md | the FastAPI backend as built, planned API contract, keys, RAG design, automatic briefs |
| 07_WEBSITE_PAGES_AND_DESIGN.md | navigation, every page and its sections, Home 3D flow, Explorer analysis, design system |
| 08_CHANGELOG.md | what was built and changed, in order |
| 09_SPEECH_AND_DEMO.md | 2-minute and 5-minute speech, demo click path, judge Q&A with honest answers |
| 10_GLOSSARY_AND_FAQ.md | terms, quotable numbers with labels, FAQ |
| 11_WHAT_WE_NEED.md | every key, `.env` line, data request and decision still needed — and what each unlocks |
| ALL_IN_ONE.md | all of the above in one file (upload this alone if you prefer one file) |

## Suggested Project instructions (paste into the Claude Project "instructions" box)
> You are the FIREWORK CHRONOS assistant. Answer only from the project files. Every number you say must come from a file and keep its label (OFFICIAL DOCUMENTED, SOURCE-DERIVED, RUN / TESTED LOCALLY, SIMULATED DEMO, PROPOSED / UNVALIDATED). Never present a SIMULATED number as a result. A hotspot is a pixel, not a fire. Missing data is "null / not observed", never zero. The exchange rate k, held-out errors and the B ratio are PENDING until the real archive run. If something is not in the files, say "not in the project files". Explain in simple English; give Hinglish when asked.

## The seven truth rules (from the atlas — never break them)
1. A hotspot is a pixel, not a fire; a cell-day is not burned area; harmonised cell-days are not hectares or biomass.
2. Missing coverage, failed sources and unprocessed months are **null**, never 0.
3. Official documentation and validated runs outrank project PDFs, whatever their date.
4. Formulas are identified by name + equation + version, never by number alone (old chat numbering differs — see aliases in file 04).
5. Every interval states its level (90% or 95%) and whether it is a confidence or predictive band.
6. AI writes words around computed numbers; it never creates or edits a measurement.
7. FIRMS products have limited accuracy; this is research decision support, **not a life-safety alert system**.

## The five provenance labels
| label | meaning |
|---|---|
| OFFICIAL DOCUMENTED | matches a first-party NASA/NOAA/ESA/Earth Engine page or a peer-reviewed paper (URL + access date stored) |
| SOURCE-DERIVED | computed deterministically from an official dataset by project code (e.g. Punjab gridded area 50,444 km²) |
| RUN / TESTED LOCALLY | code executed while making the atlas; if inputs were synthetic it is a property test, not field accuracy |
| SIMULATED DEMO | synthetic numbers for layout, teaching or method tests — never a result about real fires |
| PROPOSED / UNVALIDATED | an idea or method not yet validated on held-out real data |

## Status in one line (28 Oct 2026)
The website, the backend, the static reference database (19 real CSVs), the 46-formula audit and the method design are done. **No real fire numbers exist yet**: the globe dots and calendar on the site are SIMULATED until `FIRMS_MAP_KEY` is added (live dots) and the FIRMS archive + Earth Engine exposure run is done (calendar, k, validation).


---

# 01 · Project overview

## The challenge (NASA Space Apps 2026)
"Harmonization of MODIS and VIIRS Hot Spots." NASA asks for a web application that harmonises MODIS and VIIRS hotspot records into a **burning-activity calendar for a selected area**, so responders, scientists and land managers can see historical patterns, unusual conditions and critical periods.

## The problem in plain words
- Two generations of satellites watch fires. **MODIS** (Terra 1999, Aqua 2002) has 1 km fire pixels; its FIRMS record starts 1 Nov 2000. **VIIRS** (Suomi NPP 2011, NOAA-20 2017, NOAA-21 2022) has 375 m pixels; its FIRMS record starts 20 Jan 2012.
- VIIRS sees much smaller fires, so raw counts **jump in 2012** — an instrument effect, not more burning. Simply joining the two records invents a fake rise ("the 2012 seam"). NOAA-20 (2018) and NOAA-21 (2023) add more passes, so there are smaller seams too.
- MODIS is ending: Terra end of science Feb 2027, Aqua Sep 2027 (NASA plans). Suomi NPP new-data delivery ends 2 Nov 2026 (NASA Earthdata). **The overlap years (2012–2026) are the only time both rulers exist** — the old record must be calibrated against VIIRS now. (Copernicus CAMS added VIIRS to its fire assimilation on 4 Dec 2025 for the same reason.)
- Burning can also move to hours when no satellite passes (secondary report: >90% of large Punjab farm fires after 3 pm in 2024–25 vs ~3% in 2021), so a count drop is not automatically a burning drop.

## Our answer: FIREWORK CHRONOS
A web application that turns MODIS (2000→) and VIIRS (2012→) active-fire hotspots into **one month-by-year calendar on a common grid** (0.1° cells, local solar days), with:
- an **exposure-normalised rate** (fire cell-days ÷ valid clear observation days),
- a **harmonised VIIRS-equivalent value with an interval** (MODIS months converted with exchange rate k learned per stratum in the overlap),
- the **sensor split**, and **data-quality status** for every cell (missing is never 0).

Tagline: **"25 years of fire. One honest record."**

## Four layers, four questions (never combined into one score)
| layer | question | output | formulas |
|---|---|---|---|
| L1 | How much activity was detected on a common scale? | exposure rate; VIIRS-eq cell-days with 95% band; sensor split; coverage | F01–F07, F09–F16, F18, F24–F26 |
| L2 | What kind of heat source is this? | crop / forest / industrial / UNKNOWN with probability and evidence; abstains when unsure | F08, F21, F39–F44 |
| L3 | What might the satellite miss? | overpass clock (scenario), observation opportunity, B disagreement flag | F01, F09, F45, F46 |
| L4 | Is this month unusual or trending? | robust z with n, season dates, Mann–Kendall + Sen + BH | F27–F32, F37 |

Rejected idea: the SIH deck's single "fire truth score" FIS = 0.45T + 0.30I + 0.15WCS + 0.10C — weights were never fitted and it had no unit.

## Who uses it
| persona | question | page | must never see |
|---|---|---|---|
| District officer (Punjab) | Was this November worse than normal, and can I trust it? | Brief, Calendar | a count drop presented as a burning drop |
| Pollution-board analyst | When does the season open and peak? | Calendar, Blind Spot | season dates without the detection-timing caveat |
| Fire scientist | How was k estimated and how wrong is it on held-out years? | Sensor Lab, Validation | in-sample fit called accuracy |
| Journalist | Is the 2024 "record low" real? | Blind Spot, Brief | the B ratio used as a multiplier |
| Student | How do satellites see fire? | Learn, Formulas | teaching numbers without the SIMULATED label |
| Researcher elsewhere (e.g. California) | Can I run the same method on my region? | Explorer, Studio | India-only assumptions |

## Testable jobs (a job is done only when it passes on real archive data)
J1 pick any area (incl. antimeridian, area in km²) · J2 common grid & local time · J3 transparent harmonisation (k per stratum with interval + method version) · J4 observation support (exposure E + status per cell-month) · J5 25-year month × year calendar, fixed colour scale, null hatched · J6 raw vs harmonised toggle changes colours only · J7 sensor split per platform and day/night · J8 unusual/critical periods (robust z with n, season dates) · J9 download (CSV/JSON = API = chart) · J10 validation page (held-out errors, seam test, coverage) — all MVP. Valuable: J11 source class with abstain, J12 missed-burning diagnostic, J13 briefs/Learn/Studio/RAG.

## Global by design
Punjab–Haryana is the **flagship story**, not a hard-coded assumption. The same code grids any polygon on Earth. Real test regions with gridded areas (SOURCE-DERIVED from Natural Earth): California 409,603 km², Mato Grosso 906,656 km², New South Wales 802,466 km², Punjab 50,444 km², Haryana 43,997 km², Chandigarh 120 km², Delhi 1,481 km², Punjab + Haryana + Chandigarh 94,561 km².

## Judging criteria and our evidence
| criterion | evidence |
|---|---|
| Influence | Punjab–Haryana story with an honest blind-spot flag; printable briefs |
| Creativity | exposure-aware calendar, source abstention, overpass clock, placebo-seam validation, 3D Earth with docking NASA satellites |
| Validity | held-out real-data errors (pending), predeclared thresholds, provenance labels on every number |
| Relevance | J1–J10 for any area on Earth |
| Presentation | Home → Explorer → Calendar "aha" (the 2012 seam disappears) in under two minutes |

## What is real and what is not (say this honestly)
- **Real now:** satellite facts and dates, product definitions, FIRMS column meanings, FireMask classes, region polygons and 20,990 grid cells with exact areas, the 46-formula audit (17 FIX, 19 REVISE, 10 OK), the reference Python with tests, the simulation study, the website, the backend, the official NASA 3D satellite models.
- **Simulated now:** globe dots (until FIRMS_MAP_KEY), calendar values, KPI numbers on Explorer, the "How it works" clips (recorded from the site on demo data).
- **Pending:** k with interval, held-out errors, seam ratios, coverage, B ratio — all shown as "—" on the site until the archive run.

## Decisions already made
D1 headline KPI = exposure-normalised rate (cell-days as display unit) · D2 one sensor palette, MODIS amber / VIIRS cyan on every page (implemented) · D3 confidence control = sensor-native rule picker ("MODIS ≥ 30 · VIIRS n, h"), no fake 0.6 · D4 test regions California, Mato Grosso, New South Wales · D5 95% intervals everywhere, stated in legends.


---

# 02 · Science and satellites

## How satellites see fire
A fire is far hotter than the land around it. Hot objects shine most strongly at short infrared wavelengths (Wien: λmax = 2898 µm·K / T → 800 K fire peaks near 3.6 µm, 300 K land near 9.7 µm). So a pixel with even a small fire looks much brighter near 4 µm than at 11 µm. Both MODIS and VIIRS look for that contrast:
1. Measure brightness temperature in a mid-infrared band (MODIS band 21/22 ≈ 4 µm; VIIRS I-4 ≈ 3.7 µm) and a thermal band (MODIS 31 ≈ 11 µm; VIIRS I-5 ≈ 11.5 µm).
2. Mask clouds, water and sun glint — those pixels are **not observable** for fire.
3. Contextual test: a pixel is a candidate if it is much hotter, and hotter at 4 µm than 11 µm, than the valid background around it.
4. Assign confidence: MODIS 0–100 (FIRMS calls it experimental); VIIRS low / nominal / high (categories, not probabilities).

Why pixel size matters: a 1 km MODIS pixel needs a larger or hotter fire to stand out than a 375 m VIIRS pixel, because the fire covers a smaller share of it. That is why VIIRS detects many more small farm fires and why the exchange rate k is usually > 1.

## MODIS vs VIIRS (OFFICIAL DOCUMENTED; FIRMS download page, NASA Terra article, Earthdata transition page, read 27 Oct 2026; pixel sizes Giglio et al. 2016, Schroeder et al. 2014)
| | MODIS (Terra, Aqua) | VIIRS (S-NPP, NOAA-20, NOAA-21) |
|---|---|---|
| fire pixel at nadir | ~1 km | 375 m (I-band) |
| edge pixel | ~2 × 4.8 km | ~0.8 × 0.8 km |
| swath | 2,330 km | ~3,000 km (3,040) |
| bands for fire | 21/22 (~4 µm), 31 (~11 µm) | I-4 (3.74 µm), I-5 (11.45 µm) |
| confidence | 0–100 % (experimental) | l / n / h |
| FIRMS record starts | Terra 1 Nov 2000; Aqua 4 Jul 2002 | S-NPP 20 Jan 2012; NOAA-20 1 Apr 2018; NOAA-21 1 Mar 2023 |
| overpass (local solar) | Terra ~10:30 descending (drifted ~10:15 by fall 2022); Aqua ~13:30 ascending | ~13:30 ascending, all three (~50 min apart) |
| FRP caveat | 1 km mixes fire and background | I-4 saturates on ~8% of daytime fire pixels |
| planned end | Terra Feb 2027 end of science (data collection Jan 2027 per CAMS); Aqua Sep 2027 | S-NPP new-data delivery ends 2 Nov 2026 |
| altitude | 705 km | 824 km |
| FIRMS product | MODIS C6.1 (MCD14ML-derived) | VNP14IMG / VJ114IMG / VJ214IMG |
| NORAD id | Terra 25994, Aqua 27424 | S-NPP 37849, NOAA-20 43013, NOAA-21 54234 |

## Four reasons raw MODIS and VIIRS counts disagree
1. **Pixel size** — VIIRS 375 m sees small fires that MODIS 1 km misses. Same field, more dots.
2. **Timing** — Terra looks in the morning, Aqua and VIIRS early afternoon; drift moves these times; burning after 15:00 is missed by all.
3. **Exposure** — clouds, smoke, swath gaps and bow-tie deletion remove different observations for each sensor.
4. **Processing** — different algorithms, confidence scales, collections (C6.1 vs C2), NRT vs standard versions.
Counting **presence per cell-day** removes most of the pixel-size effect but not timing or exposure.

## The seams
- **2012:** S-NPP VIIRS starts; raw counts jump. If MODIS-before and VIIRS-after are simply joined, every trend test "finds" a rise in 2012. Harmonisation removes this artificial step while keeping real change.
- **2018 and 2023:** NOAA-20 and NOAA-21 add afternoon passes. If platforms are merged in one cell-day, exposure rises then too. V2 stores platforms separately and decides the merge rule explicitly.

## Orbits and time
- All five satellites are sun-synchronous polar orbiters: each crosses the equator at about the same local solar time daily. Terra and Aqua stopped orbit-maintenance burns to save fuel, so their crossing times drift. V2 always uses the **actual acquisition times** in FIRMS, never a fixed 10:30.
- **Local solar time is not IST.** t_LMST = t_UTC + longitude/15. Ludhiana (75.85°E): 08:06 UTC = 13:09 LMST = 13:36 IST (IST is fixed to 82.5°E). All time-of-day analysis uses LMST.
- **NRT vs Standard (SP):** NRT arrives in ~3 h; SP replaces it after ~5 months. NRT for the live map and last-7-days; SP for the calendar, calibration and validation. Never mix NRT and SP in one calibration. A fallback copy is ARCHIVE or CACHED, never "live".
- Dates: acq_date / acq_time are UTC; burning dates and calendar months are in local solar time; rates divide by exposure, so a 29-day February is handled automatically.

## Products — four different things (mixing them silently is the most common error)
| product | geometry | measures | does NOT measure |
|---|---|---|---|
| FIRMS VIIRS 375 m (VNP14IMG / VJ114IMG / VJ214IMG) | points (pixel centres) | where/when a fire was hot at overpass | fire size, burned area, clear-sky days |
| FIRMS MODIS C6.1 (MCD14ML) | points (1 km pixels) | same, coarser | same |
| MOD14A1 / MYD14A1 / VNP14A1 | 1 km daily raster | FireMask class per pixel-day → **exposure** | 375 m detections (VNP14A1 is 1 km, not 375 m) |
| MCD64A1 burned area | 500 m monthly raster | burn date of scars | not an independent check (uses MODIS active fire as input); small field burns often missed |

### FireMask classes (MOD14A1/MYD14A1, Earth Engine catalogue, 27 Oct 2026)
0 not defined · 1 not processed (obsolete) · 2 not processed (other) → unknown · **3 non-fire water → observed, no fire** · **4 cloud → not observable** · **5 non-fire land → observed, no fire** · 6 unknown → unknown · **7/8/9 fire low/nominal/high**.
VNP14A1: 0 not processed · 1 bow-tie deletion · 2 unused → unknown · 3 water · 4 cloud · 5 land · 6 unclassified · 7/8/9 fire.
Traps: class 6 is unknown (not clear land); class 0 means different things in the two products.

### Exposure (the denominator)
Valid observation days E for platform s, cell g, month m = days with FireMask ∈ {3, 5, 7, 8, 9}; cloud days = days with FireMask = 4. A cloudy month looks quiet in counts; the rate removes most of that effect. Subtleties: thick smoke may be flagged as cloud exactly when burning peaks; one clear composite day can hide several passes (R2 tests this); a 0.1° cell holds ~100 MODIS 1 km pixels, so exposure is a mean over pixels.

### Burned area and its limits
MCD64A1 maps burn scars at 500 m monthly (BurnDate 0 = unburned, 1–366 = day of year; Uncertainty; QA; FirstDay/LastDay). It is a different physical quantity (area burned) from hotspots (heat at an instant), so it is shown in its own unit and **never added to cell-days**. It is monthly and lagged → recent months are PENDING, not low. Small burns (< 25 ha) are often missed at 500 m. V2 uses it only as a disagreement diagnostic (Layer 3, F46).

### Context data (never fire ground truth)
ESA WorldCover 10 m (2021 epoch) for crop/tree/built-up (L2) · OpenStreetMap Overpass for industry, kilns, flares (India kilns are under-mapped → NULL not 0) · Open-Meteo / NASA POWER weather (context only, never a class input) · OpenAQ v3 PM2.5 (impact panel, sparse) · CelesTrak orbital elements (overpass prediction; use FIRMS acq_time for history) · Natural Earth / geoBoundaries regions (de facto boundaries).

## Myths to unlearn
- "More dots = more fire" → more dots can mean a finer sensor, more passes, or fewer clouds.
- "Counts fell 90%, burning fell 90%" → burning moved after the overpasses (secondary report); burned area fell much less.
- "Burned area validates hotspots" → MCD64A1 uses MODIS active fire as input; agreement is partly built in.
- "Confidence 0.6 is 60%" → VIIRS classes are categories.
- "Bigger pixel, bigger fire" → edge pixels are bigger footprints, not bigger fires.
- "No detection = no fire" → no detection under cloud or outside a pass is **unknown**.


---

# 03 · Method: pipeline, model, validation

## The 9-step pipeline (science is computed once in the backend; charts never recompute it)
Raw immutable data → normalised → gridded → exposure-joined → calibrated → uncertainty → validated → published, with a config hash at every arrow.

| step | what happens | formulas |
|---|---|---|
| 01 Ingest | FIRMS SP archive + NRT, checksum, columns kept as returned | — |
| 02 Normalise | sensor-native QA, confidence rule, type mask, local solar time, footprint | F01, F02, F07 |
| 03 Grid | rounded 0.1° cell index, cell area, local day, region membership | F03, F04 |
| 04 Cell-days | one "fire cell-day" per cell × local day × platform × day/night | F05, F06 |
| 05 Exposure | valid days from daily FireMask {3,5,7,8,9} | F09 |
| 06 Calibrate | negative-binomial model with exposure offset; pool log k across regions | F10–F19 (F14, F18) |
| 07 Uncertainty | block bootstrap over years, Monte Carlo on log k, exact Poisson for small n | F24, F25, F26 |
| 08 Validate | leave-one-year-out, seams, placebo seams, Bland–Altman | F23, F33–F36 |
| 09 Publish | calendar_value + meta + hash | — |

Module boundaries: ingest/ (adapters, auth from .env, retries, raw checksum) · normalize/ (F01, F02, F07 → fire_detection) · grid/ (F03, F04 → grid_cell, region_cell) · coverage/ (F09, F45 → cell_month) · calibrate/ (F10–F19 → calibration) · uncertainty/ (F16, F24–F26 → calendar_value lo/hi) · validate/ (F23, F33–F37 → validation_run) · classify/ (F08, F21, F39–F44 → source tables) · blindspot/ (F45, F46) · summarize/ (F27–F32 → calendar_value, RunReport.json).

Data layers: raw (as downloaded + sha256) → normalised (Parquet, immutable per version) → curated (cell_day, cell_month) → results (calibration, calendar_value with method_version + config_hash) → served (cached API payloads {data, meta}).

**Every published number carries:** UNIT (e.g. VIIRS-eq cell-days) · INTERVAL (lo, hi, level, type) · COVERAGE (valid days / possible) · STATUS (ok · not_observable · unavailable · pending · insufficient) · PROVENANCE (one of five labels) · VERSION (method_version + config_hash) · SOURCE (product + SP/NRT).

## Unified measurement model (PROPOSED / UNVALIDATED)
For platform s, grid cell g, time bin t: Y = observed fire cell-days, E = valid exposure, A = latent comparable fire activity, p = detection efficiency.
- Y(s,g,t) ~ NegBin(μ, θ_s), μ = E(s,g,t) · p(s,g,t) · A(g,t)
- log p(s,g,t) = γ_s + β_(s,δ) + β_sᵀ x(g,t) + η_s(year) — x holds view angle, land cover, local time; η captures orbit drift
- log A(g,t) = α_g + f_season(t) + u(g,t)
- **Harmonisation = ratio of efficiencies:** k_σ = p_V,σ / p_M,σ = exp(γ_V − γ_M + β_V,δ − β_M,δ)

**Identifiability warning:** from hotspots alone, A and p are identified only up to a constant (double every p, halve A → same data). We can estimate the *ratio* of efficiencies where both sensors see the same activity (overlap), so the product reports a **comparative index (VIIRS-equivalent)**, never "true fire activity".

Assumptions that make k usable: (1) both sensors see the same A in a stratum and period (paired overlap); (2) k is stable outside the overlap, or its drift is modelled (η); (3) exposure E is measured consistently for both; (4) static sources are removed before calibration.

Stable MVP inside the model: fix A by stratum, drop covariates → exposure-offset Poisson/NB with a sensor term = stratified ratio of exposure rates (baseline B3). More complex variants are used only if they win on held-out data.

## How the formulas combine (the order the backend runs)
```
for each region r and platform s:
  D  = normalise(FIRMS_SP rows)                 # F01 local time, F02 footprint, F07 rule
  D  = D[type not in {1,3}]; mask static sites  # F08 persistence, F41 sites
  cd = cell_days(D, grid=0.1, by=[cell, local_day, s, dn])   # F03, F05
  E  = exposure(FireMask_s, cells, month)       # F09 (null if E = 0)
  Y  = monthly(cd); rate = Y / E                # F06, F09
overlap = pairs(Aqua, S-NPP, same cells, days, dn)          # F10
model   = NB_offset(Y ~ sensor + dn + month, offset=log E)  # F14, F15
k[σ]    = exp(γ_V − γ_M) per stratum; pool log k            # F18 (R ≥ 3)
band    = block_bootstrap(years, alpha=0.05)                # F24; F25 log-k propagate
H[t]    = k[σ(t)] · M[t] (t < 2012) else V[t]               # F12, F13
valid   = LOYO, seams, placebo, Bland–Altman                # F23, F33–F36
z[t]    = robust_z_loo(log((F+.5)/(E+1)))                   # F27, F28
trend   = MK_ties + Hamed–Rao + Sen; BH over cells          # F30–F32, F37
season  = 10/50/90% dates in declared window                # F29
L2      = features(F08, F21, F42–F44) → abstaining classifier (F39)
L3      = overpass union (F45, scenario); B flag (F46, pending/null)
publish calendar_value{value, lo, hi, coverage, status, provenance, version, hash}
```
Dependency rules: every downstream formula receives the status of its inputs (null propagates) · uncertainty is computed once at calibration and propagated, never re-estimated in the UI · Layer 4 uses the same rate scale as Layer 1, never raw counts · Layers 2 and 3 never modify Layer 1 values, they annotate them.

## Baseline ladder (select the simplest method that wins on held-out data)
| rung | method | adds | risk |
|---|---|---|---|
| B0 | raw counts concatenated | nothing (reference for "how bad") | 2012 seam |
| B1 | median of monthly cell-day ratios | sensor scale | sparse-count bias, clouds |
| B2 | ratio of exposure rates (pooled) | cloud/coverage correction | day/night mix |
| B3 | B2 stratified by day/night (and month) | night-burning shifts | sparse night strata |
| B4 | B3 + drift term on log k after 2016 | orbit drift | overfitting with few years |
| B5 | NB model with view geometry + drift (R1, R4) | physics covariates | identifiability |
| B6 | fusion / detection models (R3, F38) | multi-sensor | complexity |

### Simulation result (RUN / TESTED LOCALLY on 60 simulated worlds with known truth; overlap 2012–2025, MODIS drift 2.5%/yr after 2016, NB noise θ = 8, leave-one-year-out)
| rung | MAE per month | deviance | median season relative error |
|---|---|---|---|
| B0 | 17.13 | 557 | 69.1% |
| B1 | 10.79 | 295 | 26.9% |
| B2 | 10.72 | 283 | 24.5% |
| B3 | 10.58 | 281 | 23.4% |
| B4 | 10.54 | 280 | 23.4% |
B3 95% predictive band coverage: **94.5%** vs nominal 95%. Read honestly: exposure normalisation gives most of the gain; the ~23% season error comes from NB noise in small MODIS counts that no k can remove. It is a property of the **simulated** world, not a forecast for Punjab. Real-data ranking may differ.

## Validation gates (thresholds declared 27 Oct 2026, before any real run)
| gate | test | pass rule | formula |
|---|---|---|---|
| G1 | held-out years: LOYO over 2012–2025, Oct–Nov totals | median relative error ≤ 15% and better than B1 | F36 |
| G2 | held-out geography: train Punjab, test Haryana, and reverse | error ≤ 1.5 × in-region error | F36 |
| G3 | seam: 3-yr windows, log scale, bootstrap CI | seam-ratio upper CI ≤ 0.25 | F35 |
| G4 | placebo seams: Pettitt/PELT at 20 random non-sensor years | false-positive rate ≤ 10% | F33, F34 |
| G5 | platform seams 2018 and 2023 | no break after harmonisation at α = 0.05 | F34 |
| G6 | coverage of 95% predictive bands on held-out years | achieved 88–99% | F24, F25 |
| G7 | Bland–Altman, log scale, held-out | abs(bias) ≤ 0.1 (≈10%) | F23 |
| G8 | zero / empty: empty months, K = 0, one region | no crash; status not 0 | all |
| G9 | negatives: water and urban cells | harmonised activity ≈ 0 with status | F07, F08 |
| G10 | persistent heat | known flare/kiln list excluded from calibration | F08 |
| G11 | classifier on held-out sites (GroupKFold by site and region) | macro-F1 with abstain rate; else feature stays PROPOSED | F39 |
| G12 | API provenance | every response has meta.data_source, status, version | contract |
Leakage controls: block by year (seasons are correlated), by region for G2, by site for G11. Thresholds may only change with a dated note in the conflict log — never after seeing results.

## Science error budget (PROPOSED — sizes to be measured)
| source | mechanism | handled by | expected size | measured? |
|---|---|---|---|---|
| counting noise | NB variation of cell-days | F15, F25 | large at small counts | simulated |
| calibration | uncertainty of k in overlap | F24, F18 | ±10–20% of k | pending |
| non-stationarity | drift, processing changes | R1, R5, R8 | unknown | pending |
| exposure mismatch | 1 km composite vs 375 m points | R2 | unknown | pending |
| filter choice | confidence rule pair | F07 grid | ±15% of k (sim example) | simulated |
| static sources | kilns/flares in calibration | F08 mask | region-dependent | pending |
| timing | burning outside overpasses | L3 flag only | can dominate (Punjab) | not correctable from hotspots |
| attribution | source class errors | abstain, F39 | unknown without labels | pending |
The calendar band does **not** include timing bias or attribution error; those are shown as separate flags (Layers 3 and 2).

## The four layers in detail
**Village Fire Card** (example, SIMULATED values, cell 1209_2558 near Ludhiana, November): L1 "14 VIIRS fire cell-days out of 22 valid days (rate 0.64); harmonised November normal 0.41 [0.33, 0.52]" · L2 "crop residue (p = 0.81); for: cropland 92%, seasonal, low persistence 0.03; against: one kiln 2.1 km away" · L3 "detections cluster 13:00–14:00 LMST; burning after 15:00 largely unseen; B flag 2.4 (check), scenario only" · L4 "z = +2.3 vs 12 reference Novembers → unusual; 10-year trend not significant (p = 0.21)". Numbers come from the API JSON; each answer has a fixed slot for "unknown"; the life-safety caveat is always present.

**Layer 2 — what is burning?** Rule flow v1: MODIS type 1 volcano / 3 offshore → exclude; persistence p ≥ 0.20 and night share ν ≥ 0.20 → static (hypothesis); context L > 0.5 → industrial; cropland in crop window → crop; forest/shrub → forest/wildland; else UNKNOWN. v2 classifier (gradient boosting + calibrated probabilities + conformal sets) replaces it only after it beats the rules on held-out labelled sites. Not yet validated: no labelled set of Indian kilns/flares exists.

**Layer 3 — what might the satellite miss?** Three honest outputs: (1) observation opportunity — valid passes and local times per cell; (2) scenario share (F45) — if burning followed curve g, what share falls in the windows, labelled scenario; (3) disagreement flag (F46) — burned area per detection vs its own past, PENDING while burned area is lagged. Never "B × detections = true burning".

**Layer 4 — unusual or trending?** Anomalies on the exposure-rate log scale (F27), never raw counts; report n reference years, < 8 → "indicative"; trends = tie-corrected Mann–Kendall + Hamed–Rao, Sen slope as effect size, BH across cells; p > 0.05 = "not shown with this data", never "no change"; season dates are dates of detected activity.

## New research approaches R1–R10 (each PROPOSED / UNVALIDATED, with a way to fail)
| id | idea | test | falsified if |
|---|---|---|---|
| R1 | orbit-drift-aware normaliser: k varies with effective overpass time | LOYO on 2017–2025, B3 vs B3+drift | no improvement or unstable sign; adopt if ≥ 5% deviance gain |
| R2 | opportunity-based denominator (pass-level exposure) | seam ratio at 2018/2023 with each denominator | no difference within CI (postponed, high compute) |
| R3 | paired-overlap detection model (MODIS detection prob. given VIIRS FRP, angle, land cover) | predict stratum k on held-out years | curve-implied k outside observed CI |
| R4 | spatio-temporal hierarchical NB (partial pooling of log k) | leave-one-region-out | no gain vs empirical Bayes |
| R5 | change-point placebo battery | 20 placebo years + 2012/2018/2023 | sensor-year break rate > placebo rate (adopted as G4) |
| R6 | latency-aware burned-area disagreement | back-test flags with simulated lag | flags on normal years > 10% |
| R7 | ground-truth triangulation (Sentinel-2/Landsat labels, official records) | 200 stratified fields | reviewer agreement κ < 0.6 |
| R8 | distribution-shift monitor (CUSUM on residuals) | inject synthetic shifts | > 1 false alarm per year |
| R9 | uncertainty decomposition (sampling, calibration, structural, attribution) | user test with 5 officials | no change in decisions |
| R10 | active learning for source classes | precision/recall industry vs crop | no gain vs random labelling |

## Milestones
M0 preservation & inventory · M1 science audit & data contracts (46 YAML + estimand) · M2 real small-area extraction (1 district × 1 overlap year from FIRMS SP + GEE exposure) · M3 model comparison (B0–B4 held-out table, gates G1–G6) · M4 UX decision (palette + boards approved) · M5 core website on real API · M6 optional layers (L2 abstain, L3 pending states) · M7 RAG & reports · M8 master docs · M9 release checks.


---

# 04 · The 46 formulas (F01–F46)

Source: `docs/spec/formula_registry/F01–F46.yaml` (also the Supabase table `formula`). V2 audit run 27 Oct 2026.

## How to read this file
- **Status V2** = the five provenance labels. **Audit verdict**: OK (kept), OK + EXTEND / RULE / LIMIT / VALIDATED (kept with an addition), REVISE (definition changed), FIX (a defect was found and fixed in the V2 reference code).
- Totals: **46 formulas — 17 FIX, 19 REVISE, 10 OK** (the OK group includes OK + EXTEND / RULE / LIMIT / VALIDATED).
- Equations are LaTeX. Ask Claude to "explain F14 in simple words" or "show the worked example of F01".
- Tested Python versions of the core formulas: `docs/spec/python_reference/v2/chronos_core.py` (tests in `test_chronos_core.py`).

## The seven families
| family | formulas | feeds |
|---|---|---|
| Time, space and counting | F01–F09 | Layer 1 inputs |
| Calibration between sensors | F10–F23 | Layer 1 harmonisation |
| Uncertainty | F24–F26 | bands everywhere |
| Anomalies and seasons | F27–F29 | Layer 4 |
| Trends and seam tests | F30–F37 | Layer 4 + validation |
| Fusion and AI | F38–F41 | experimental + Layer 2 sites |
| Source attribution and blind spot | F42–F46 | Layers 2 and 3 |

## Highest-risk defects that the audit fixed
- calendar_matrix filled missing months with 0 → now null + status
- VIIRS l/n/h mapped to fake probabilities 0.25/0.6/0.9 → sensor-native categories
- bootstrap labelled 95% but computed 90% → explicit α, level in every legend
- Mann–Kendall without tie correction → tie-corrected + Hamed–Rao
- grid index floor error at 36–41% of cell edges; antimeridian column 3600 → rounded floor + clamp

## Old names you may hear (aliases — never use an ID alone)
| alias | context | real formula | note |
|---|---|---|---|
| "F09 calibration" | early chat walkthrough | F10 | calibration ratio concepts are now F10–F14 |
| "F16 bootstrap" | early chat walkthrough | F24 | bootstrap is F24; F16 is the delta-method interval |
| clear-sky normalisation | Book 5 | F09 | renamed "exposure rate" |
| k_shrunk | Strategy doc | F17 | teaching rule; production uses F18 |
| seam test | Strategy / Book 3 | F35 | plus F33/F34 placebo |
| FIS = 0.45T+0.30I+0.15WCS+0.10C | SIH deck | REJECTED | hand-weighted score not used |
| L_context | CLAUDE.md | F43 | sign: + = industry |
| diurnal fraction | Blind Spot spec | F45 | scenario only |

## The five formulas to know for a speech
- **F01 local solar time:** t_LMST = (t_UTC + longitude/15) mod 24 — every place on one clock.
- **F05 fire cell-day:** 1 if any detection in a 0.1° cell on a local day — removes most of the pixel-size effect.
- **F09 exposure rate:** fire cell-days ÷ valid clear observation days — removes clouds.
- **F14 negative-binomial model with exposure offset → k:** how many VIIRS cell-days one MODIS cell-day is worth, per stratum, with an interval.
- **F27 robust anomaly z:** log((F + 0.5)/(E + 1)) compared with the same month in other years, target year left out — "is this November unusual?"

---
## All 46 entries

### Time, space and counting


#### F01 · Local solar time of an overpass
- Layer: L1 / L3 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK + EXTEND
- Purpose: Converts the FIRMS UTC acquisition time into the Sun's time at the pixel, so that overpass times, day/night strata and burning-hour comparisons are expressed on one clock everywhere on Earth.
- Equation (V2, LaTeX): `t_{\mathrm{LMST}} = \left(t_{\mathrm{UTC}} + \frac{\lambda}{15}\right) \bmod 24,\qquad t_{\mathrm{LAST}} = t_{\mathrm{LMST}} + \frac{E(d)}{60}`
- Equation (V1, old): `t_{\mathrm{LST}} = t_{\mathrm{UTC}} + \frac{\lambda}{15^{\circ}\,\mathrm{h}^{-1}}`
- Inputs: t_UTC = acquisition time from acq_time (HHMM) (hours); λ = pixel longitude, east positive (degrees); E(d) = equation of time for day-of-year d (minutes, about −14 to +16)
- Assumptions: Local mean solar time is enough for binning; apparent solar time differs by up to ~16 min. | acq_time is the granule/scan time, not the moment the fire started.
- Audit finding: Equation correct. Added modulo-24 and the equation-of-time note. Local solar time is not IST: Ludhiana (75.85°E) solar noon is ~12:06 LMST while IST is fixed to 82.5°E.
- Worked example: 08:06 UTC at 75.85°E → 8.10 + 75.85/15 = 8.10 + 5.057 = 13.157 h = 13:09 LMST (run here: 13:09).
- Code:
```python
def lmst(utc_h, lon):
    return (utc_h + lon / 15.0) % 24.0
```
- Where it shows on the site: Explorer overpass card, Blind Spot clock, Sensor Lab day/night split.

#### F02 · Pixel growth with scan angle
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Explains why one detection near the swath edge represents a much larger footprint than one at nadir, and gives the per-detection footprint area used for sensitivity checks (equal-effective-swath experiments).
- Equation (V2, LaTeX): `A_{\mathrm{pix}} = \mathrm{scan}\times\mathrm{track}\ \ (\text{use FIRMS columns, km}^2),\qquad \text{flat-Earth } 1/\cos^2\theta \text{ is a teaching approximation only}`
- Equation (V1, old): `\frac{s(\theta)}{s_0} \approx \frac{1}{\cos^2\theta},\qquad \frac{t(\theta)}{t_0} \approx \frac{1}{\cos\theta}`
- Inputs: θ = view (scan) angle (rad); s, t = along-scan and along-track pixel size (km); scan, track = FIRMS columns giving actual pixel dimensions (km)
- Assumptions: Earth curvature makes real edge growth larger than the flat formula (MODIS ~2×4.8 km at 55°). | VIIRS aggregation/bow-tie deletion keeps its growth much smaller than MODIS.
- Audit finding: The 1/cos² law is a flat-Earth approximation and underestimates MODIS edge growth. FIRMS already supplies scan and track, so use them. A bigger pixel does not mean a bigger fire.
- Worked example: MODIS nadir 1.0×1.0 km; FIRMS edge rows show scan≈4.8, track≈2.0 → footprint ≈9.6 km². VIIRS 375 m edge ≈0.8×0.8 km.
- Code:
```python
df['pix_km2'] = df.scan * df.track
sensitivity = df[df.scan <= scan_max]
```
- Where it shows on the site: Sensor Lab: 'why the dots differ' panel; Learn lesson 2.

#### F03 · Grid cell index
- Layer: L1 · Status V2: RUN / TESTED LOCALLY · Audit verdict: FIX
- Purpose: Assigns every detection to a fixed, team-chosen comparison grid (0.1°). The grid is an analysis decision, not a NASA-provided boundary.
- Equation (V2, LaTeX): `i = \min\!\left(\left\lfloor \mathrm{round}_9\!\frac{\varphi+90}{\Delta}\right\rfloor, \tfrac{180}{\Delta}-1\right),\quad j = \min\!\left(\left\lfloor \mathrm{round}_9\!\frac{\mathrm{wrap}(\lambda)+180}{\Delta}\right\rfloor, \tfrac{360}{\Delta}-1\right)`
- Equation (V1, old): `i = \left\lfloor \frac{\varphi + 90}{\Delta} \right\rfloor,\quad j = \left\lfloor \frac{\lambda + 180}{\Delta} \right\rfloor`
- Inputs: φ, λ = latitude, longitude (degrees); Δ = cell size (degrees (0.1)); round₉ = round to 9 decimals before floor (-)
- Assumptions: Same grid for every sensor and year. | Longitude wrapped into [−180, 180).
- Audit finding: RUN here: plain floor misassigns 643 of 1,800 latitude edges and 1,287 of 3,600 longitude edges at 0.1° because of binary floating point (e.g. 28.1°N → row 1180 instead of 1181). Also λ = 180 produces column 3600, outside 0–3599.
- Worked example: (30.91, 75.85) → i = ⌊1209.1⌋ = 1209, j = ⌊2558.5⌋ = 2558 → cell 1209_2558 (matches v1).
- Code:
```python
row = floor(round((lat + 90) / d, 9))
col = floor(round((wrap(lon) + 180) / d, 9))
clamp row, col
```
- Where it shows on the site: Explorer cell id chip; Studio grid slider.

#### F04 · Area of a grid cell on the sphere
- Layer: L1 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK + VALIDATED
- Purpose: True cell area for densities, area-weighted roll-ups and fair comparison between latitudes. Region area uses the fraction f_g of each cell inside the polygon.
- Equation (V2, LaTeX): `A = R^2\,\Delta\lambda\,(\sin\varphi_2 - \sin\varphi_1),\ \ R = 6371.0088\ \mathrm{km};\quad A_{\mathrm{region}} = \sum_g f_g A_g`
- Equation (V1, old): `A = R^2\,\Delta\lambda\,(\sin\varphi_2 - \sin\varphi_1)`
- Inputs: R = mean Earth radius (km); Δλ = cell width (rad); φ₁, φ₂ = south/north edges (rad); f_g = share of cell inside region (0–1)
- Assumptions: Sphere; WGS84 ellipsoid differs by <0.5% at these sizes.
- Audit finding: RUN here on real Natural Earth polygons: gridded areas Punjab 50,444 km², Haryana 43,997 km², Delhi 1,481 km², Mato Grosso 906,656 km², NSW 802,467 km² — close to published state areas (Punjab ≈50,362, Haryana ≈44,212 km²).
- Worked example: 0.1° cell at 30.9–31.0°N: 106.0 km²; at the equator 123.6 km²; at 60°N 61.7 km²; at 89.9°N 0.108 km².
- Code:
```python
A = R*R*radians(d)*(sin(radians(lat+d)) - sin(radians(lat)))
```
- Where it shows on the site: Explorer inspector 'area', density colour mode.

#### F05 · Fire cell-day indicator
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Turns many pixels into one presence flag per cell per day so that a sensor that draws many small pixels and a sensor that draws a few big pixels are compared on the same question: was any fire detected here today?
- Equation (V2, LaTeX): `c_{s,g,d,\delta} = \mathbb{1}[\,n_{s,g,d,\delta} \ge 1\,]\ \text{ (per platform } s\text{, local day } d\text{, day/night } \delta)`
- Equation (V1, old): `c_{g,d} = \mathbb{1}[\,n_{g,d} \ge 1\,]`
- Inputs: n = number of filtered detections (count); s = platform (Terra, Aqua, S-NPP, N20, N21) (-); δ = D or N (-)
- Assumptions: A cell-day is not a fire event and not burned area. | Several revisits in one day are deduplicated on purpose.
- Audit finding: v1 deduplicates by (cell, date, sensor) and loses platform and day/night. Keep platform and δ so day/night calibration (F13) and coverage (F09) are possible.
- Worked example: 3 VIIRS pixels in one cell on 1 Nov → c = 1; MODIS 1 pixel → c = 1.
- Code:
```python
cell_days = det.groupby([cell, local_date, platform, dn]).size() >= 1
```
- Where it shows on the site: Calendar metric 'cell-days'; Explorer counts.

#### F06 · Monthly cell-day count
- Layer: L1 · Status V2: FIX · Audit verdict: FIX (structural)
- Purpose: Region-month total of fire cell-days per platform, the basic count shown in the raw calendar.
- Equation (V2, LaTeX): `C_{s,r,m} = \sum_{g \in r} \sum_{d \in m} c_{s,g,d},\ \ \text{value} = \text{NULL if } E_{s,r,m}\ \text{unknown}`
- Equation (V1, old): `C_{g,m} = \sum_{d \in m} c_{g,d}`
- Inputs: r = region (set of cells) (-); E = exposure (F09) (valid cell-days)
- Assumptions: Region membership uses region_cell with fractions; for counts use cell centre or fraction ≥0.5 consistently.
- Audit finding: v1 monthly_counts groups by sensor×year×month only, with no region/cell key; the calendar builder then fills absent months with 0. Absent = unknown, not zero.
- Worked example: Punjab Nov: S-NPP 14 cell-days in cell 1209_2558; region total = sum over 512 cells.
- Code:
```python
monthly = cell_days.merge(region_cell).groupby([region, platform, month]).sum()
```
- Where it shows on the site: Calendar raw mode; Explorer time strip.

#### F07 · Equal-confidence filter
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Applies a documented, sensor-native quality rule before counting, and tests how much the harmonised answer depends on it.
- Equation (V2, LaTeX): `\mathrm{keep}_i = \mathbb{1}[\,\mathrm{class}_i \in \mathcal{Q}_s\,],\ \ \mathcal{Q}\ \text{chosen from a sensitivity grid}\ \{\text{MODIS}\ge 0,30,50,80\}\times\{\text{l,n,h};\ \text{n,h};\ \text{h}\}`
- Equation (V1, old): `\mathrm{keep}_i = \mathbb{1}[q_i \ge \tau_s],\quad \tau_{\mathrm{MODIS}} = 30,\ \tau_{\mathrm{VIIRS}} = \text{nominal}`
- Inputs: q = MODIS confidence 0–100 (experimental per FIRMS) (%); class = VIIRS l / n / h (category)
- Assumptions: MODIS 30 and VIIRS 'nominal' are not proven to be the same strictness.
- Audit finding: v1 maps VIIRS l/n/h to 0.25/0.6/0.9 and UI says 'same confidence 0.6 both sensors'. These numbers are labels, not calibrated probabilities. Keep categories; report results for several filter pairs and pick by held-out agreement.
- Worked example: Grid of 4 MODIS × 3 VIIRS rules → 12 k estimates; show the spread as filter uncertainty.
- Code:
```python
for mt in [0,30,50,80]:
  for vq in [{'l','n','h'},{'n','h'},{'h'}]:
    k[mt,vq] = fit(filter(df, mt, vq))
```
- Where it shows on the site: Explorer confidence control becomes a named rule picker.

#### F08 · Persistence (static-source mask)
- Layer: L2 · Status V2: FIX · Audit verdict: FIX
- Purpose: Share of observed days a site was hot over several years; high values point to kilns, flares, industry or volcanoes, which should not drive the agricultural calendar or calibration.
- Equation (V2, LaTeX): `p_g = \frac{\sum_d c_{g,d}}{\sum_d \mathbb{1}[\text{valid}_{g,d}]},\quad p_g = \text{NULL if denominator}=0`
- Equation (V1, old): `p_g = \frac{\text{active days}_g}{\text{total days}}`
- Inputs: valid = day with usable observation (-)
- Assumptions: Threshold 0.20 is a hypothesis to fit on labelled sites.
- Audit finding: RUN here: v1 persistence(0, 0) returns 0.0 (no activity) instead of unknown. Denominator should be observed days, not calendar days.
- Worked example: Kiln: 300 hot of 365 observed → 0.82; paddy cell: 7 of 365 → 0.02.
- Code:
```python
p = active / observed if observed > 0 else None
```
- Where it shows on the site: Source page evidence card.

#### F09 · Clear-sky (exposure) fire rate
- Layer: L1 / L4 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Fire cell-days per valid observation day. Removes the cloud effect so a cloudy November is not mistaken for a quiet November.
- Equation (V2, LaTeX): `r_{s,g,m} = \frac{F_{s,g,m}}{E_{s,g,m}},\ \ E = \#\{\text{days with FireMask}\in\{3,5,7,8,9\}\},\ \ r = \text{NULL if } E=0`
- Equation (V1, old): `r_{g,m} = \frac{F_{g,m}}{K_{g,m}}`
- Inputs: F = fire cell-days (count); E = valid observable cell-days for the same platform (count); K = old name for E (-)
- Assumptions: Exposure from the 1 km daily composite (MOD14A1/VNP14A1) approximates opportunity for FIRMS point detections; record the mismatch. | One valid composite day may contain several passes: it is one opportunity, not several.
- Audit finding: Correct at K=0 → None (v1 test). v2 makes E platform-specific, defines which FireMask classes count (6 'unknown' is not clear), and stores E alongside every rate.
- Worked example: 30 fire days / 600 valid cell-days = 0.05 (v1 test, RUN here).
- Code:
```python
E = count(FireMask in {3,5,7,8,9}); r = F/E if E > 0 else None
```
- Where it shows on the site: Calendar 'exposure rate' metric; Explorer 'valid days 22/30'.

### Calibration between sensors


#### F10 · Monthly overlap ratio
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Exploratory per-stratum ratios of VIIRS to MODIS cell-days during real overlap; inputs to diagnostics, not the final estimator.
- Equation (V2, LaTeX): `k_{r,\sigma,y} = \frac{V_{r,\sigma,y}}{M_{r,\sigma,y}}\ \ \text{only for strata }\sigma=(\text{month},\delta,\text{platform pair})\text{ with both sensors observing}`
- Equation (V1, old): `k_m = \frac{V_m}{M_m}\quad (m \in \text{overlap 2012–2025})`
- Inputs: V, M = VIIRS and MODIS cell-days on the same cells/days (count); σ = stratum (-)
- Assumptions: Same cells, same days, same exposure for both sensors.
- Audit finding: v1 silently drops months with M=0 (a VIIRS=9 month vanished in the test) and treats all post-2012 years as one pool. Pair real overlapping periods and platforms (Aqua↔S-NPP afternoon; Terra has no VIIRS partner).
- Worked example: v1 test: M=[10,20,0,40], V=[25,52,9,100] → ratios 2.5, 2.6, 2.5 → 2.5; the zero month is lost.
- Code:
```python
pairs = join(modis, viirs, on=[cell, date, dn]); ratio per stratum
```
- Where it shows on the site: Sensor Lab bar chart of k by month with n shown.

#### F11 · Median of ratios
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Robust exchange rate between sensors that resists one strange month.
- Equation (V2, LaTeX): `\hat k_{\mathrm{robust}} = \operatorname{median}\{k_m : M_m \ge 5\}\ \text{ kept as baseline B3a; primary estimator is ratio of totals / GLM (F14)}`
- Equation (V1, old): `\hat k = \operatorname{median}\{k_m\}\quad(\text{v1.1: only } M_m \ge 5)`
- Inputs: k_m = monthly ratios (-)
- Assumptions: Ratios exchangeable across years; no drift.
- Audit finding: RUN here (simulated, true k=2.6, MODIS 0–3 per month): median of monthly ratios averaged 2.22 (biased); ratio of totals 2.72. Median is a useful robustness check, not the default estimator for sparse counts. The ≥5 rule from the visual guide helps but discards data.
- Worked example: Ratios {2.45, 2.5, 2.5, 2.6} → median 2.5.
- Code:
```python
k_med = median([v/m for v,m in pairs if m >= 5])
```
- Where it shows on the site: Sensor Lab model panel row 'median'.

#### F12 · Harmonised MODIS value
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Expresses MODIS-era months in VIIRS-equivalent cell-days so the 25-year calendar uses one ruler.
- Equation (V2, LaTeX): `\hat V^{\mathrm{eq}}_{r,\sigma,t} = \hat k_{r,\sigma}\, M_{r,\sigma,t}\ \ \text{(estimate, with interval)};\ \ t\ge 2012:\ V_{r,t}\ \text{observed}`
- Equation (V1, old): `H_{g,m} = \hat k \cdot M_{g,m}\quad \text{for } m < 2012`
- Inputs: V^eq = VIIRS-equivalent cell-days (estimate) (cell-days)
- Assumptions: k learned in overlap applies before 2012 (stationarity) — the biggest assumption in the project. | Terra morning passes have no VIIRS analogue; Terra-era scaling is an extrapolation.
- Audit finding: Fine as arithmetic. Visual guide example '200 → 521 with k=2.6' should be 520. Label output as an estimate with an interval and the k version used.
- Worked example: Nov 2005 MODIS 200 cell-days × k 2.6 = 520 VIIRS-eq cell-days (interval from F24/F25).
- Code:
```python
H = k * M ; H_lo, H_hi from propagated interval
```
- Where it shows on the site: Calendar harmonised mode.

#### F13 · Separate day and night factors
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Day and night detection behaviour differs; mixing them hides shifts in night burning.
- Equation (V2, LaTeX): `\hat k_{\delta} \text{ per stratum } \delta\in\{D,N\}\ \text{using matched overpass windows (actual acq_time, not fixed 10:30/13:30)}`
- Equation (V1, old): `\hat k_{\mathrm{day}} = \operatorname{median}\frac{V^D_m}{M^D_m},\qquad \hat k_{\mathrm{night}} = \operatorname{median}\frac{V^N_m}{M^N_m}`
- Inputs: δ = day or night (-)
- Assumptions: Aqua and S-NPP afternoon passes are close in time; Terra's drift (10:30 → ~10:15 by 2022) changes what 'morning' means.
- Audit finding: Use observed acquisition times per year; generic Terra 10:30 / Aqua 13:30 is wrong for late years (NASA: Terra crossing ~10:15 by fall 2022).
- Worked example: k_day 2.1, k_night 4.0 (teaching example, SIMULATED).
- Code:
```python
for dn in ['D','N']: k[dn] = fit(pairs[pairs.dn == dn])
```
- Where it shows on the site: Sensor Lab day/night switch.

#### F14 · Poisson GLM with exposure offset
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Model-based exchange rate with honest uncertainty, using real exposure (valid observations) as the offset instead of MODIS counts.
- Equation (V2, LaTeX): `\log\mu_{s,r,t} = \log E_{s,r,t} + \alpha_r + \gamma_s + x^{\top}\beta,\ \ Y\sim\mathrm{NegBin}(\mu,\theta);\ \ \hat k=e^{\hat\gamma_V-\hat\gamma_M}`
- Equation (V1, old): `\log \mathbb{E}[V_m] = \log M_m + \beta,\qquad \hat k = e^{\hat\beta}`
- Inputs: E = exposure for that sensor (valid cell-days); γ_s = sensor effect (log scale); θ = NB dispersion (-)
- Assumptions: Both sensors see the same latent activity in a stratum (paired design). | Covariates x (day/night, season, view geometry) explain sensitivity differences.
- Audit finding: RUN here: intercept-only Poisson GLM with offset log M gives exactly ΣV/ΣM (2.6000 = 2.6000). It is the ratio of totals, not a different 'confirmation' of F11. Using MODIS counts as exposure is errors-in-variables and breaks at M=0. v2 uses exposure offsets and a sensor term.
- Worked example: V=[25,52,9,100,61], M=[10,20,3,40,22] → k = 247/95 = 2.600.
- Code:
```python
glm(Y ~ C(sensor) + C(region) + C(dn), offset=log(E), family=NB)
```
- Where it shows on the site: Sensor Lab model panel.

#### F15 · Negative-binomial variance
- Layer: L1 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK + RULE
- Purpose: Fire counts arrive in bursts (spatial clustering, weather), so intervals from a Poisson model are too narrow.
- Equation (V2, LaTeX): `\operatorname{Var}(Y) = \mu + \frac{\mu^2}{\theta},\ \ \hat\phi_{\mathrm{Pearson}} = \frac{1}{n-p}\sum\frac{(y-\hat\mu)^2}{\hat\mu}\ \text{decides Poisson vs NB}`
- Equation (V1, old): `\operatorname{Var}(V) = \mu + \frac{\mu^2}{\theta}`
- Inputs: θ = dispersion (smaller = more bursty) (-); φ = Pearson dispersion (-)
- Assumptions: Overdispersion is constant within a stratum.
- Audit finding: Correct. Add the decision rule: compute φ̂; NB if φ̂ > 1.5. RUN here on the small example: φ̂ = 0.16 (under-dispersed toy data — real data must decide).
- Worked example: μ=100, θ=10 → Var = 100 + 1000 = 1100, SD 33 (Poisson SD 10).
- Code:
```python
phi = sum((y-mu)**2/mu)/(n-p)
```
- Where it shows on the site: Validation page 'dispersion' tile.

#### F16 · Delta-method interval for a ratio
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Quick interval for k; v2 shows that paired sensors are positively correlated, so the independent formula is not exact.
- Equation (V2, LaTeX): `\operatorname{Var}(\log\hat k) \approx \frac{1}{V}+\frac{1}{M}-\frac{2\operatorname{Cov}(V,M)}{VM};\ \ \text{default: paired block bootstrap (F24)}`
- Equation (V1, old): `\operatorname{Var}\!\left(\log \tfrac{V}{M}\right) \approx \frac{1}{V} + \frac{1}{M}`
- Inputs: V, M = totals (count)
- Assumptions: Independent Poisson counts — false for the same fires seen by two sensors.
- Audit finding: RUN here: totals 247/95 → k 2.60, 95% [2.05, 3.29] under independence. Correlation narrows the true interval, overdispersion widens it; bootstrap over years captures both. Undefined for V or M = 0.
- Worked example: k = 2.60, se(log k) = √(1/247 + 1/95) = 0.121 → [2.05, 3.29].
- Code:
```python
se = sqrt(1/V + 1/M) if V>0 and M>0 else None
```
- Where it shows on the site: Sensor Lab k ± band (labelled 'approx.').

#### F17 · Shrink local factor toward global
- Layer: L1 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Stops a small region with two noisy months from getting an extreme k.
- Equation (V2, LaTeX): `\text{kept only as a teaching / fallback rule; production uses F18 on }\log k`
- Equation (V1, old): `\tilde k = \frac{n\,k_{\mathrm{loc}} + n_0\,k_{\mathrm{glob}}}{n + n_0}`
- Inputs: n₀ = prior strength (years)
- Assumptions: n₀ hand-picked (6 in docs, 4 in tests).
- Audit finding: Arithmetic is right (3,4,2,4 → 2.5, RUN). Shrinking on the ratio scale is not the same as partial pooling on log k (F18); do not present both as one method.
- Worked example: k_loc 3.0 (4 yrs), k_glob 2.0, n₀ 4 → 2.5.
- Code:
```python
(n*k + n0*kg)/(n + n0)
```
- Where it shows on the site: Sensor Lab 'small area' note.

#### F18 · Empirical Bayes partial pooling of log k
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Lets the data decide how much each region borrows from the group, with weights from real precision.
- Equation (V2, LaTeX): `y_r=\log\hat k_r,\ \ s_r^2=\widehat{\operatorname{Var}}(y_r);\ \ \hat\tau^2_{\mathrm{DL}}=\max\!\left(0,\frac{Q-(R-1)}{c}\right);\ \ w_r=\frac{\hat\tau^2}{\hat\tau^2+s_r^2};\ \ R\ge 3`
- Equation (V1, old): `\widehat{\log k}_r = w_r\,\overline{\log k}_r + (1-w_r)\,\mu,\qquad w_r = \frac{\tau^2}{\tau^2 + s_r^2/n_r}`
- Inputs: τ² = between-region variance (log²); Q = Cochran heterogeneity statistic (-); R = number of regions (-)
- Assumptions: Regions exchangeable; s_r² estimated well.
- Audit finding: v1 divides by (R−1): undefined for one region; empty groups not guarded. v2 uses DerSimonian–Laird τ² with R ≥ 3 guard and returns None otherwise (RUN here).
- Worked example: Regions with 2 months get the lowest weight (v1 must-pass test).
- Code:
```python
if R < 3: return None
tau2 = max(0,(Q-(R-1))/c)
```
- Where it shows on the site: Validation 'pooling weight' column.

#### F19 · Power law vs ratio (model choice)
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Tests whether the relation is proportional or curved (e.g. MODIS saturating in big fire months).
- Equation (V2, LaTeX): `\text{compare } \log\mu = \log E + \beta_0 + b\log(M+0.5)\ \text{vs}\ b=1\ \text{by held-out Poisson/NB deviance (blocked CV by year)}`
- Equation (V1, old): `V = aM^{b}\ \text{vs}\ V = kM,\qquad \mathrm{AIC} = n\ln\frac{\mathrm{RSS}}{n} + 2p`
- Inputs: b = elasticity (-)
- Assumptions: Same likelihood family for both models.
- Audit finding: log(M) is −∞ at zero months; Gaussian RSS on logs is not the count likelihood; in-sample AIC is not predictive accuracy.
- Worked example: If held-out deviance improves < 2%, keep the simpler ratio.
- Code:
```python
for fold in year_blocks: fit both; score deviance on fold
```
- Where it shows on the site: Sensor Lab 'model shape' chip.

#### F20 · Detection-probability curve (FRP50)
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Explains why k > 1: MODIS misses small fires that VIIRS sees. Uses near-simultaneous matched pairs (Aqua vs S-NPP within ~15 min).
- Equation (V2, LaTeX): `\operatorname{logit}P(D_M=1\mid F_V)=\beta_0+\beta_1\ln F_V+\beta_2\,\theta+\dots,\ \ \mathrm{FRP}_{50}=e^{-\beta_0/\beta_1}\ (\text{at }\theta=0)`
- Equation (V1, old): `P(\text{MODIS detects}\mid \mathrm{FRP}) = \frac{1}{1 + e^{-(\mathrm{FRP}-\mathrm{FRP}_{50})/s}}`
- Inputs: F_V = VIIRS FRP of the matched fire (MW); θ = view angle (deg)
- Assumptions: VIIRS detection used as the reference label (it also misses fires: ascertainment bias).
- Audit finding: Printed equation is logistic in FRP; uploaded code fits log(FRP). Pick one (log form, because FRP is skewed) and publish FRP50 = exp(−β₀/β₁).
- Worked example: β₀ = −4.4, β₁ = 2.0 → FRP50 = e^{2.2} = 9.0 MW (teaching, SIMULATED).
- Code:
```python
LogisticRegression on [log(frp_v), view_angle]
```
- Where it shows on the site: Sensor Lab detection curve.

#### F21 · Log transform of FRP
- Layer: L2 · Status V2: OK · Audit verdict: OK
- Purpose: Tames the long right tail of fire radiative power before z-scores and quantile maps.
- Equation (V2, LaTeX): `y = \ln(1+\mathrm{FRP}/1\,\mathrm{MW})`
- Equation (V1, old): `y = \ln(1 + \mathrm{FRP})`
- Inputs: FRP = fire radiative power (MW)
- Assumptions: FRP is comparable only within a sensor; MODIS and VIIRS FRP differ by pixel size and saturation.
- Audit finding: Correct; units made explicit.
- Worked example: 1000 MW → 6.909.
- Code:
```python
np.log1p(frp)
```
- Where it shows on the site: Source page FRP distribution (ECDF).

#### F22 · Quantile mapping
- Layer: L1 (FRP only) · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Maps MODIS FRP distribution onto VIIRS's for distribution-level comparisons.
- Equation (V2, LaTeX): `x' = F_V^{-1}(F_M(x))\ \text{ fitted per stratum on matched overlap; extrapolation beyond training range flagged}`
- Equation (V1, old): `x' = F_V^{-1}\!\left(F_M(x)\right)`
- Inputs: F = empirical CDF (-)
- Assumptions: Distributions stable over time.
- Audit finding: Quantile mapping forces the old era's distribution to look like the new one and can erase real extremes or trends in the tails; never apply to cell-day counts, and flag values outside the training range.
- Worked example: MODIS median 25 MW → VIIRS median 9 MW.
- Code:
```python
np.interp(F_M(x), qV_probs, qV_values)
```
- Where it shows on the site: Sensor Lab advanced tab.

#### F23 · Bland–Altman agreement
- Layer: Validation · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Shows bias and agreement limits between harmonised MODIS and observed VIIRS in held-out overlap years.
- Equation (V2, LaTeX): `d_t = \log(a_t+0.5)-\log(b_t+0.5),\ \ a=\text{harmonised MODIS},\ b=\text{observed VIIRS};\ \bar d \pm 1.96\,\mathrm{SD}(d)\ \text{on held-out years}`
- Equation (V1, old): `\bar d = \overline{a-b},\qquad \mathrm{LoA} = \bar d \pm 1.96\,\mathrm{SD}(a-b)`
- Inputs: a, b = two measurements of the same stratum (same units)
- Assumptions: Differences roughly constant across magnitude; otherwise use log scale.
- Audit finding: Fix the sign convention in code, docs and axis label (a − b). Counts are heteroscedastic, so use log scale. Must be done on held-out data, not the fit years.
- Worked example: a=[10,12,15], b=[8,13,12] → bias +1.33 (RUN).
- Code:
```python
d = log(a+.5)-log(b+.5); bias=d.mean()
```
- Where it shows on the site: Validation Bland–Altman plot.

### Uncertainty


#### F24 · Block bootstrap over years
- Layer: L1 / L4 · Status V2: FIX · Audit verdict: FIX
- Purpose: Interval for k and for any summary, respecting that months inside a year are correlated.
- Equation (V2, LaTeX): `\mathrm{CI}_{1-\alpha} = \left[q_{\alpha/2}(\hat\theta^{*}),\ q_{1-\alpha/2}(\hat\theta^{*})\right],\ \alpha\ \text{explicit},\ \text{resample whole years (or seasons)}`
- Equation (V1, old): `\hat\theta^{*(b)} = T(\text{years resampled}),\ \ \mathrm{CI} = [q_{2.5}, q_{97.5}]\ \ (\text{code: } q_5,q_{95})`
- Inputs: α = 1 − coverage (-); B = bootstrap draws (≥2000) (-)
- Assumptions: Years are exchangeable blocks; ≥8 blocks for a usable interval.
- Audit finding: Docs say 95% (2.5–97.5) but Book 3 and the code use 5–95 = 90%. RUN here with {2.45, 2.5, 2.5, 2.6}: 90% [2.450, 2.550] vs 95% [2.450, 2.600]. With 4 years the bootstrap distribution has only a handful of values: report 'too few years'.
- Worked example: ratios {2.45,2.5,2.5,2.6}, B=2000, seed 42 → 95% [2.45, 2.60].
- Code:
```python
def boot(v, m, alpha=0.05): ... quantile(alpha/2), quantile(1-alpha/2)
```
- Where it shows on the site: Every band shows its level (90% or 95%) in the legend.

#### F25 · Monte Carlo error propagation
- Layer: L1 · Status V2: FIX · Audit verdict: FIX
- Purpose: Band on each calendar cell combining calibration uncertainty and count noise.
- Equation (V2, LaTeX): `\log k^{(s)}\sim\mathcal{N}(\log\hat k,\ \mathrm{se}^2_{\log k}),\ \ H^{(s)}=k^{(s)}\,M^{(s)},\ \ M^{(s)}\sim\mathrm{NB}(M,\hat\theta)\ \text{(predictive)}`
- Equation (V1, old): `H^{(s)} = k^{(s)} M^{(s)},\quad k^{(s)}\sim \mathcal{N}(\hat k,\sigma_k^2),\ M^{(s)}\sim\mathrm{Poisson}(M)`
- Inputs: se = standard error of log k (-)
- Assumptions: Calibration and count noise independent; do not add the same noise twice (k's bootstrap already contains count noise in overlap years).
- Audit finding: RUN here: with k=2.6, σ=1.5 the normal draws are negative 4.2% of the time. Use log scale. Say whether the band is a confidence interval (for the expected value) or a predictive interval (for a new count).
- Worked example: M=200, k=2.6 (se log 0.08) → 95% ≈ [430, 620] predictive.
- Code:
```python
k_s = exp(normal(log k, se, S)); M_s = poisson(M, S); H_s = k_s*M_s
```
- Where it shows on the site: Calendar inspector band.

#### F26 · Exact Poisson interval (Garwood)
- Layer: L1 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK
- Purpose: Correct interval for tiny counts (0–10) where normal approximations fail.
- Equation (V2, LaTeX): `\left[\tfrac12\chi^2_{2n,\,\alpha/2},\ \tfrac12\chi^2_{2(n+1),\,1-\alpha/2}\right],\ \ \text{lower}=0\ \text{when } n=0`
- Equation (V1, old): `\left[\tfrac12\chi^2_{2n,\,\alpha/2},\ \tfrac12\chi^2_{2(n+1),\,1-\alpha/2}\right]`
- Inputs: n = observed count (-)
- Assumptions: Count is Poisson (no overdispersion).
- Audit finding: RUN here: n=3 → [0.62, 8.77] (doc 0.6–8.8). Add n=0 rule.
- Worked example: n=0 → [0, 3.69]; n=3 → [0.62, 8.77].
- Code:
```python
lo = chi2.ppf(a/2, 2n)/2 if n>0 else 0; hi = chi2.ppf(1-a/2, 2n+2)/2
```
- Where it shows on the site: Explorer inspector for small cells.

### Anomalies and seasons


#### F27 · Robust anomaly z-score
- Layer: L4 · Status V2: FIX · Audit verdict: FIX
- Purpose: How unusual is this month compared with the same month in other years, on the exposure-normalised scale, with the target year left out of its own baseline.
- Equation (V2, LaTeX): `y_{t}=\log\frac{F_t+0.5}{E_t+1},\ \ z_t=\frac{y_t-\operatorname{med}(y_{\mathcal{B}\setminus t})}{\max(1.4826\,\mathrm{MAD}(y_{\mathcal{B}\setminus t}),\ 0.15)},\ \ |\mathcal{B}|\ge 8`
- Equation (V1, old): `z = \frac{\ln(1+x) - \operatorname{med}}{\max(1.4826\,\mathrm{MAD},\ \sigma_{\min})}\quad(\text{v1.1: }\ln r)`
- Inputs: F, E = fire cell-days and exposure (count); 𝓑 = reference years for that calendar month (-)
- Assumptions: Reference years are on the same harmonised scale; their own uncertainty is ignored by z (show it separately).
- Audit finding: Three versions exist: code uses raw counts with the target year inside the baseline; Atlas uses ln(1+x); visual guide uses ln(rate), which is undefined when rate = 0 (RUN: math domain error). v2 uses the Anscombe-style log((F+0.5)/(E+1)), leave-target-out, ≥8 reference years.
- Worked example: Nov history 300, 280, 320, 310; target 410 → in-sample z 6.74 vs leave-out z 7.08 (RUN; teaching numbers).
- Code:
```python
ref = [y for yr,y in hist if yr != target]
if len(ref) < 8: return insufficient
```
- Where it shows on the site: Calendar 'anomaly z' metric with sample-size badge.

#### F28 · Month baseline and spread
- Layer: L4 · Status V2: FIX · Audit verdict: FIX
- Purpose: The 'normal' November to compare against.
- Equation (V2, LaTeX): `\mathrm{base}_{m,-t}=\operatorname{med}_{y\in\mathcal{B}\setminus t}\,y_{y,m},\ \ \mathrm{spread}_{m,-t}=\max(1.4826\,\mathrm{MAD},0.15)\ \text{on the F27 scale}`
- Equation (V1, old): `\mathrm{base}_m = \operatorname{median}_y H_{y,m},\quad \mathrm{spread}_m = 1.4826\,\mathrm{MAD}_y H_{y,m}`
- Inputs: y = log exposure rate (F27) (-)
- Assumptions: Same scale as F27.
- Audit finding: calendar_build.month_baseline uses raw counts with floor 1.0 and includes the target year. Must use the same scale, floor and leave-out rule as F27.
- Worked example: Nov normal 480 ± 90 (teaching).
- Code:
```python
see F27
```
- Where it shows on the site: Calendar inspector 'normal for November'.

#### F29 · Season start, peak and end (10/90%)
- Layer: L4 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Critical-period dates for the problem statement: when does the burning season open, peak and close?
- Equation (V2, LaTeX): `\text{same, on a declared season window } [t_a,t_b]\ \text{(e.g. 15 Sep–31 Dec), weekly bins; NULL if any bin unobserved}`
- Equation (V1, old): `t_{\mathrm{start}} = \min\{t : S(t) \ge 0.10\,S_{\mathrm{tot}}\},\quad t_{\mathrm{end}} = \min\{t : S(t)\ge 0.90\,S_{\mathrm{tot}}\}`
- Inputs: S(t) = cumulative detected activity (cell-days)
- Assumptions: Detected activity timing ≈ burning timing (false when burning shifts after overpasses).
- Audit finding: Dates depend on the window and on detection timing; they are dates of detected activity, not ignition dates. Declare the window; null when gaps.
- Worked example: weekly [0,1,2,10,30,40,10,5,2,0] → start 3, peak 5, end 6 (RUN).
- Code:
```python
c = cumsum(w); start = argmax(c >= .1*total)
```
- Where it shows on the site: Calendar season band.

### Trends and seam tests


#### F30 · Mann–Kendall trend test
- Layer: L4 · Status V2: FIX · Audit verdict: FIX
- Purpose: Is the seasonal total rising or falling across years, without assuming a straight line or normal errors?
- Equation (V2, LaTeX): `\operatorname{Var}(S)=\frac{n(n-1)(2n+5)-\sum_{p} t_p(t_p-1)(2t_p+5)}{18}\ \ (\text{tie groups } t_p)`
- Equation (V1, old): `S = \sum_{i<j} \operatorname{sgn}(x_j - x_i),\quad \operatorname{Var}(S)=\frac{n(n-1)(2n+5)}{18}`
- Inputs: t_p = size of each tie group (-)
- Assumptions: Independent years (see F31).
- Audit finding: RUN here: tie correction missing in v1. Series [5,3,6,2,5,4,5,3]: v1 var 65.33 vs corrected 60.67 (pymannkendall agrees, p = 0.700). Counts often tie (zeros), so this matters.
- Worked example: Book 3 series (b) 9 years: S = −16, Z = −1.56, p = 0.12 → not significant (RUN, matches).
- Code:
```python
var = (n(n-1)(2n+5) - sum(t(t-1)(2t+5)))/18
```
- Where it shows on the site: Calendar trend line with p and effect size.

#### F31 · Hamed–Rao autocorrelation correction
- Layer: L4 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK + LIMIT
- Purpose: Neighbouring years are similar, so the effective sample is smaller; this widens the test.
- Equation (V2, LaTeX): `\text{same, with }\rho_k\text{ of detrended ranks, only significant lags; seasonal Kendall for monthly series}`
- Equation (V1, old): `\operatorname{Var}^*(S) = \operatorname{Var}(S)\cdot\frac{n}{n^*_s},\quad \frac{n}{n^*_s} = 1 + \frac{2}{n(n-1)(n-2)}\sum_{k}(n-k)(n-k-1)(n-k-2)\rho_k`
- Inputs: ρ_k = rank autocorrelation at lag k (-)
- Assumptions: Enough years to estimate ρ_k (≥15).
- Audit finding: RUN here on 9 years: z = −1.56, p = 0.118 (no correction applied — lags not significant). With 25 years ρ_k is noisy; report both raw and corrected p.
- Worked example: Book 3 series (b): unchanged p = 0.118.
- Code:
```python
pymannkendall.hamed_rao_modification_test(x)
```
- Where it shows on the site: Trend tooltip 'autocorrelation-adjusted'.

#### F32 · Sen's slope
- Layer: L4 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK
- Purpose: How fast the series changes per year, robust to outliers.
- Equation (V2, LaTeX): `\beta=\operatorname{median}_{i<j}\frac{x_j-x_i}{t_j-t_i}\ \ (\text{use real year gaps; report \% of baseline and CI})`
- Equation (V1, old): `\beta = \operatorname{median}_{i<j}\frac{x_j - x_i}{j - i}`
- Inputs: t = year (yr)
- Assumptions: Monotonic trend.
- Audit finding: RUN here: series (b) → −26.4 per year (matches). Use t gaps when years are missing.
- Worked example: [1,3,5,7] → 2.0.
- Code:
```python
median of pairwise slopes
```
- Where it shows on the site: Calendar trend label 'β per year'.

#### F33 · Pettitt change-point test
- Layer: Validation · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Finds the single most likely jump year; used to show the 2012 seam before harmonisation and its absence after.
- Equation (V2, LaTeX): `\text{same, plus placebo distribution: }K\text{ at random non-sensor years and at 2018/2023 platform additions}`
- Equation (V1, old): `U_t = \sum_{i\le t}\sum_{j>t}\operatorname{sgn}(x_j - x_i),\quad K = \max_t |U_t|,\quad p \approx 2e^{-6K^2/(n^3+n^2)}`
- Inputs: K = max absolute U (-)
- Assumptions: One change point; p approximate.
- Audit finding: A non-significant Pettitt after harmonisation does not prove the seam is gone (low power with 25 points). Combine with placebo years and the seam ratio interval.
- Worked example: Synthetic break at year 10 found before, not after (v1 must-pass test).
- Code:
```python
for t: U_t = ...; K = max |U|
```
- Where it shows on the site: Validation seam tile.

#### F34 · PELT multiple change points
- Layer: Validation · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Find all jump points (2012 S-NPP, 2018 NOAA-20, 2023 NOAA-21, processing changes).
- Equation (V2, LaTeX): `\text{Poisson/NB segment cost on monthly exposure rates; penalty } \beta = \text{BIC} \cdot \log n\ \text{declared before running}`
- Equation (V1, old): `\min_{\tau}\ \sum_{i} \mathcal{C}\!\left(x_{(\tau_{i-1}+1):\tau_i}\right) + \beta\,|\tau|`
- Inputs: β = penalty (-)
- Assumptions: Penalty fixed in advance.
- Audit finding: Choose cost for counts (not rbf by default); fix penalty before seeing results to avoid tuning to a story.
- Worked example: Expect breaks near platform additions in raw counts, none after harmonisation.
- Code:
```python
ruptures.Pelt(model='l2').fit(y).predict(pen=pen)
```
- Where it shows on the site: Validation event study.

#### F35 · Seam ratio
- Layer: Validation · Status V2: REVISE · Audit verdict: REVISE
- Purpose: How much of the instrument step remains after harmonisation.
- Equation (V2, LaTeX): `R_{\mathrm{seam}}=\frac{|\overline{\log H}_{2012\text{–}14}-\overline{\log H}_{2009\text{–}11}|}{|\overline{\log V}_{2012\text{–}14}-\overline{\log M}_{2009\text{–}11}|}\ \text{with bootstrap CI and placebo seams}`
- Equation (V1, old): `R_{\mathrm{seam}} = \frac{|H_{\mathrm{after}} - H_{\mathrm{before}}|}{|V_{\mathrm{after,raw}} - M_{\mathrm{before}}|}`
- Inputs: H, V, M = harmonised, VIIRS raw, MODIS raw (cell-days)
- Assumptions: No real change exactly at the seam.
- Audit finding: One-year-to-one-year comparison mixes real interannual change with the instrument step. Use 3-year windows, log scale, interval, and compare against placebo seams.
- Worked example: seam_ratio(100, 260, 104.68) = 0.029 (RUN).
- Code:
```python
see v2
```
- Where it shows on the site: Home stat + Validation tile.

#### F36 · Held-out error (LOYO and blocked CV)
- Layer: Validation · Status V2: FIX · Audit verdict: FIX
- Purpose: Honest out-of-sample error: hide a year (or region), fit on the rest, predict the hidden one.
- Equation (V2, LaTeX): `\mathrm{MAE}_y=|\hat k_{-y}M_y-V_y|,\ \ D_y=2\!\left[V_y\ln\frac{V_y}{\hat\mu_y}-(V_y-\hat\mu_y)\right],\ \ \mathrm{sMAPE}\ \text{with } V_y+\hat\mu_y>0`
- Equation (V1, old): `\mathrm{MAPE}_{\mathrm{LOYO}} = \frac{1}{Y}\sum_{y}\frac{|\hat k_{-y}M_y - V_y|}{V_y}`
- Inputs: D = Poisson deviance (-)
- Assumptions: Hidden years independent of training years (block by season).
- Audit finding: MAPE is infinite when V = 0 and favours under-prediction. Use MAE + Poisson deviance + guarded sMAPE; also hold out regions.
- Worked example: Book 3 LOYO: hidden errors 0, 0, 3.85, 2.04% → median 1.0% (teaching).
- Code:
```python
for y in years: k = fit(exclude y); score(y)
```
- Where it shows on the site: Validation LOYO chart.

#### F37 · Benjamini–Hochberg false discovery rate
- Layer: L4 · Status V2: OK · Audit verdict: OK
- Purpose: When thousands of cells are tested for trends, keeps the share of false 'significant' cells near α.
- Equation (V2, LaTeX): `\text{same; } m = \text{number of cells actually tested (with enough data)}; \text{BY variant if spatially dependent}`
- Equation (V1, old): `\text{reject } H_{(i)}\ \text{for } i \le \max\{ i : p_{(i)} \le \tfrac{i}{m}\alpha \}`
- Inputs: m = tests (-)
- Assumptions: Independent or positively dependent tests.
- Audit finding: Correct. Define m honestly (cells with data).
- Worked example: 94 nominal → 53 after BH (v1 synthetic test).
- Code:
```python
see chronos_core.benjamini_hochberg
```
- Where it shows on the site: Explorer trend map 'FDR 5%'.

### Fusion and AI


#### F38 · Kalman fusion (local-level model)
- Layer: Experimental · Status V2: FIX · Audit verdict: FIX
- Purpose: One smoothed activity series from several sensors, each weighted by its noise.
- Equation (V2, LaTeX): `x_t=x_{t-1}+w_t,\ z_{s,t}=x_t+v_{s,t};\ \ P^-_t=P_{t-1}+Q\Delta t,\ K=\frac{P^-}{P^-+R_s};\ \text{skip update when } z\ \text{missing; init on first valid } z`
- Equation (V1, old): `\hat x = \hat x^- + K(z - \hat x^-),\qquad K = \frac{P^-}{P^- + R}`
- Inputs: Q = process noise (-); R_s = measurement noise per sensor (-)
- Assumptions: Constant Q, R; Gaussian; one state.
- Audit finding: v1 can start with level None when the first values are missing. RUN here with [None, None, 10, 12, None, 11] → [None, None, 10, 11.11, 11.11, 11.05]. Output is a model estimate, never 'observed'.
- Worked example: see audit run
- Code:
```python
if x is None: init on first valid z
```
- Where it shows on the site: Sensor Lab experimental tab (PROPOSED).

#### F39 · Split conformal prediction sets
- Layer: L2 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Source class sets with a marginal coverage guarantee: {crop} or {crop, kiln}.
- Equation (V2, LaTeX): `\text{same; calibration set = held-out sites (GroupKFold by site/region); report coverage by region; abstain if } |C(x)|>1`
- Equation (V1, old): `\hat q = \mathrm{Quantile}_{\lceil (n+1)(1-\alpha)\rceil/n}\{1 - \hat p_{y_i}(x_i)\},\quad C(x) = \{y : 1-\hat p_y(x) \le \hat q\}`
- Inputs: α = miscoverage (-)
- Assumptions: Exchangeability between calibration and new sites.
- Audit finding: Guarantee is marginal, not per district. Needs real labelled sites; none exist yet → feature remains PROPOSED.
- Worked example: n=100 calibration, α=0.1 → q̂ is the 91st smallest score.
- Code:
```python
q = quantile(scores, ceil((n+1)(1-a))/n, 'higher')
```
- Where it shows on the site: Source page set chips.

#### F40 · Haversine distance
- Layer: L2 · Status V2: RUN / TESTED LOCALLY · Audit verdict: OK
- Purpose: Distances for clustering and industrial/agricultural context.
- Equation (V2, LaTeX): `\text{same, } R=6371.0088\ \mathrm{km};\ \text{for} <1\ \mathrm{km\ precision\ use\ geodesic\ (Karney)}`
- Equation (V1, old): `d = 2R\arcsin\sqrt{\sin^2\tfrac{\Delta\varphi}{2} + \cos\varphi_1\cos\varphi_2\sin^2\tfrac{\Delta\lambda}{2}}`
- Inputs: R = Earth radius (km)
- Assumptions: Sphere (0.3% error).
- Audit finding: RUN here: Ludhiana–Amritsar ≈ 124 km (doc 125).
- Worked example: (30.901,75.857) → (31.634,74.872): 124 km.
- Code:
```python
chronos_core.haversine_km
```
- Where it shows on the site: Source evidence 'nearest kiln 0.8 km'.

#### F41 · DBSCAN fire clustering
- Layer: L2 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Groups detections into events/sites; feeds persistence and night fraction per site.
- Equation (V2, LaTeX): `\text{ST-DBSCAN on (space, time) with } \varepsilon_s,\varepsilon_t \text{ per sensor resolution; sites from multi-year persistent clusters}`
- Equation (V1, old): `\mathrm{core}(p) \iff |N_\varepsilon(p)| \ge \mathrm{minPts},\quad N_\varepsilon(p) = \{q : d(p,q)\le\varepsilon\}`
- Inputs: ε = radius (km); minPts = min neighbours (-)
- Assumptions: ε larger than geolocation error (MODIS ~1 km, VIIRS ~375 m).
- Audit finding: Spatial-only clustering merges unrelated fires on different days; add time. Clusters are not fires 'counted'.
- Worked example: ε=1.5 km, minPts=3 on a year of VIIRS → kiln sites.
- Code:
```python
DBSCAN(eps=eps/R, metric='haversine')
```
- Where it shows on the site: Source map site outlines.

### Source attribution and blind spot


#### F42 · Distance-decay exposure (IE / AE)
- Layer: L2 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: How much industrial vs agricultural context surrounds a detection.
- Equation (V2, LaTeX): `\mathrm{IE}_g=\sum_f S_f\,e^{-d_{g,f}/L},\ \ L\ \text{fitted on labelled sites};\ \ \text{NULL if OSM coverage unknown}`
- Equation (V1, old): `\mathrm{IE}_g = \sum_{f\in\text{industry}} e^{-d_{g,f}/L},\qquad \mathrm{AE}_g = \sum_{c\in\text{crop}} e^{-d_{g,c}/L}`
- Inputs: L = decay length (km); S_f = feature weight (-)
- Assumptions: OSM completeness; in India kilns are under-mapped.
- Audit finding: Two versions exist (smooth exp vs SIH steps 1/0.5/0.2). Pick one; L and weights are hypotheses. Missing OSM must be NULL, not 0.
- Worked example: Refinery S=5 at 300 m, factory S=3 at 1 km (L=1 km) → IE = 5e^{-0.3}+3e^{-1} = 4.81.
- Code:
```python
sum(S*exp(-d/L))
```
- Where it shows on the site: Source evidence card.

#### F43 · Context log-ratio L
- Layer: L2 · Status V2: OK · Audit verdict: OK
- Purpose: One signed context number for the classifier.
- Equation (V2, LaTeX): `L_g=\ln\frac{\mathrm{IE}_g+1}{\mathrm{AE}_g+1}\ (+=\text{industry});\ \ \text{a feature, not a label}`
- Equation (V1, old): `L_g = \ln\frac{\mathrm{IE}_g + 1}{\mathrm{AE}_g + 1}`
- Inputs: L = log ratio (-)
- Assumptions: +1 pseudo-count choice changes small values.
- Audit finding: Sign convention fixed (old deck had it inverted and a wrong 1.46 example; correct ln(6/4) = 0.405, RUN).
- Worked example: IE 6.5, AE 2.5 → ln(7.5/3.5) = 0.762.
- Code:
```python
log((ie+1)/(ae+1))
```
- Where it shows on the site: Source evidence 'L'.

#### F44 · Night fraction
- Layer: L2 · Status V2: REVISE · Audit verdict: REVISE
- Purpose: Industrial sources burn at night; crop fires mostly in the afternoon.
- Equation (V2, LaTeX): `\nu_g=\frac{N^{N}_g/E^{N}_g}{N^{D}_g/E^{D}_g+N^{N}_g/E^{N}_g}\ \ (\text{exposure-adjusted; night passes are fewer for MODIS})`
- Equation (V1, old): `\nu_g = \frac{N^{\mathrm{night}}_g}{N^{\mathrm{day}}_g + N^{\mathrm{night}}_g}`
- Inputs: E^D, E^N = day and night opportunities (-)
- Assumptions: Night detection sensitivity differs (cooler background, different thresholds).
- Audit finding: Raw share is biased by unequal day/night opportunities. Threshold 20% is a hypothesis.
- Worked example: Kiln 0.45, paddy 0.05 (teaching).
- Code:
```python
exposure-adjusted share
```
- Where it shows on the site: Source evidence 'night share'.

#### F45 · Diurnal fraction seen by overpasses
- Layer: L3 · Status V2: FIX · Audit verdict: FIX
- Purpose: Scenario tool: if burning follows a diurnal curve g, what share happens inside the times the polar satellites look?
- Equation (V2, LaTeX): `f_{\mathrm{seen}} = \int_{\bigcup_o [t_o-w,\,t_o+w]} g(t)\,dt,\ \ g\ \text{from geostationary/hourly evidence; otherwise labelled SCENARIO}`
- Equation (V1, old): `f_{\mathrm{seen}} = \sum_{o} \int_{t_o - w}^{t_o + w} \frac{1}{\sigma\sqrt{2\pi}}e^{-(t-\mu)^2/2\sigma^2}\,dt`
- Inputs: t_o = observed overpass times (per year) (h LMST); w = half-window (h); g = diurnal burning density (1/h)
- Assumptions: g is an assumption unless fitted to hourly data (e.g. GEO-KOMPSAT-2A / Meteosat IODC; access unverified).
- Audit finding: RUN here: Aqua and NOAA-20 windows overlap near 13:30; summing integrals gives 54.7% instead of the union 36.6% (μ=13, σ=1.5 h). Result is a scenario, not a measured share of fires.
- Worked example: Peak 13:00 vs peak 16:18 scenarios (v1 must-pass 31.6% vs 3.3%) — teaching.
- Code:
```python
merge windows; integrate once
```
- Where it shows on the site: Blind Spot clock — dashed 'scenario' style.

#### F46 · Burned-area to detection ratio B
- Layer: L3 · Status V2: FIX · Audit verdict: FIX
- Purpose: Warning flag: burn scars stay high while detections fall → detections may be missing burning.
- Equation (V2, LaTeX): `B_{r,y}=\frac{\mathrm{BA}_{r,y}/C_{r,y}}{\operatorname{med}_{y'\in\mathcal{R}}(\mathrm{BA}_{r,y'}/C_{r,y'})},\ \ |\mathcal{R}|\ge3;\ \ \text{PENDING if BA lagged; NULL if } C=0`
- Equation (V1, old): `B_{g,y} = \frac{\mathrm{BA}_{g,y}/C_{g,y}}{\operatorname{median}_{y'<2021}\left(\mathrm{BA}_{g,y'}/C_{g,y'}\right)}`
- Inputs: BA = MCD64A1 burned area (km²); C = detected cell-days (count)
- Assumptions: MCD64A1 itself uses MODIS active fire → not independent. | BA omission of small agricultural burns.
- Audit finding: B is a disagreement flag, never a multiplier ('real burning is 2.4× the dots' is unsupported). Guard zeros, lag (PENDING) and reference-year choice.
- Worked example: Reference median 1.2 km²/cell-day; 2024: 2.9 → B = 2.4 → 'check' flag (teaching).
- Code:
```python
chronos_core.blindspot_ratio
```
- Where it shows on the site: Blind Spot B timeline; Brief flag.

---

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


---

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


---

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


---

# 08 · Changelog — how the project got here

## History of the documents (atlas Ch. 3)
| date | artifact | added | later found wrong (fixed in V2) |
|---|---|---|---|
| 14–15 Oct 2026 | Strategy + Books 1–4 | challenge pick, sensors, code, beginner maths | fixed overpass times; 5–95 bootstrap called 95%; ln(1+x) z |
| 15 Oct | Accuracy Upgrade (Book 5) | clear-sky rate, day/night k, GLM, empirical Bayes | rate treated as defined at K = 0 only in tests |
| 20 Oct | 164-page A4 Atlas | full design + 46 formula pages | mixed status tags; figures from synthetic data |
| 21 Oct | 62-page Build Spec | stack, API, DB, milestones | 60 fps claim; "0.6 confidence" copy |
| 26 Oct | 4 Layers + visual guide | layers, changed formulas | ln(rate) at zero; "B = many missed" |
| 27 Oct | Final Spec + prompt pack | locked Home/Explorer/Studio, fixtures | palette decision left open |
| 27 Oct | **V2 Research Atlas (188 pages)** | verified facts, runnable audit, registry, 5 provenance labels | real-data run still pending |
Precedence: scientific facts → official guides and validated runs beat any project document; Home identity → Concept A v2 + Crossing Orbits logo; nothing is deleted, rejected ideas are archived with a reason.

## V1 → V2 science changes
| topic | V1 | V2 |
|---|---|---|
| unit of comparison | fire cell-days, MODIS count as denominator | exposure rate F/E + VIIRS-eq cell-days with 95% band |
| missing data | filled with 0 | null + status (not_observable, unavailable, pending) |
| k | one median ratio, 2.6 in examples | per stratum, NB offset model, pooled log k, with interval |
| confidence | VIIRS l/n/h → 0.25/0.6/0.9 | sensor-native classes + sensitivity grid |
| anomaly | 3 inconsistent versions | log((F+.5)/(E+1)), target year left out, n ≥ 8 |
| trend | Mann–Kendall without ties | tie-corrected MK + Hamed–Rao + Sen + BH |
| intervals | "95%" computed as 90% | explicit α; level and type in every legend |
| blind spot | B = "real burning ~2×" | B = disagreement flag; scenario clock |
| validation | in-sample, MAPE | leave-one-year-out + region hold-out, placebo seams, predeclared gates |
| grid | plain floor; India assumptions | rounded floor, antimeridian, real geodesic areas, global |
| palette | two inverted sensor palettes | one validated palette: MODIS amber, VIIRS cyan |
| truth labels | E / T / P tags | five provenance labels on every number |
| RAG | LLM + docs | documents for words, SQL for numbers, citation guard |
| fire data in DB | synthetic seed corpus | real static CSVs now; fire rows only from the FIRMS fetch |
Audit totals: 46 formulas re-audited (17 FIX, 19 REVISE, 10 OK), 36 audit checks executed, 15 conflicts logged (12 resolved, 3 open: C-02 colours → now decided amber/cyan, C-09 confidence copy → now a rule picker, C-13 performance claim → measure first).

## Website build — Spacecode 3 (27–28 Oct 2026)
1. **Organised the project folder:** byte-identical duplicates (code/ ≡ docs/spec, supabase/ ≡ data/supabase, second atlas PDF, second concept image) moved to an archive; empty folders removed.
2. **Shared design system:** new tokens and stylesheet in the prototype's language (Sora / Inter / JetBrains Mono, surface #0A0E14, framed panels), one amber/cyan sensor palette.
3. **Home rebuilt from the approved prototype (Concept A v2):** hero, How it works (4 clips + 6 answers), End-to-end, Satellites dossiers, Calendar teaser, Control tiles, side progress nav, scroll reveals.
4. **Explorer rebuilt to the locked globe design:** layers with switches, search with bounding box and country highlight, navy "atlas" globe, cell inspector, sensors over this cell, time strip MODIS era → VIIRS era.
5. **Globe fixes:** clicks on merged point meshes and on country shapes now select the nearest detection; Explorer layout height fixed.
6. **3D Home background:** the Spacecode realistic Earth (day/night shader, city lights, clouds, atmosphere) as one fixed background that changes continuously with scroll — no "next page" feeling; Earth stays on the right.
7. **Real satellites:** the procedural satellite replaced by **official NASA 3D models** — Aqua (MODIS) and Suomi NPP (VIIRS) — each on its own orbit (amber dashed / cyan solid); Draco decoder from three.js.
8. **Satellite docking flow:** the Satellites section is pinned; Aqua rises from the Earth and docks → MODIS details pop in → Suomi NPP docks → VIIRS details; snap points at each docked state so fast scrolling cannot skip it; details compacted to fit one screen; text on the left, Earth and satellite on the right.
9. **De-"AI" status design:** glowing pills replaced — hero record strip (27 year ticks, amber → cyan), squared Source switch (Demo / Archive / Live), "Jump to… ⌘K" search field, squared status tags everywhere.
10. **New How-it-works videos** recorded from the current site with headless Chrome + ffmpeg (`tools/record_clips.mjs`), replacing the old prototype clips.
11. **Navigation reorganised** into two tiers with groups Explore · Trust · Your data · Learn and a sub-nav per group.
12. **Explorer analysis upgrade:** page header, 5 key figures, spaced workspace, H3 density on by default, **click-anywhere location card pinned to the globe**, location inspector (cell, 50 km, hex, pending values), camera no longer jumps, Esc clears, and an analysis section (hour-of-day with overpass lines and blind window, day/night, source mix, daily by sensor, FRP bands, countries).
13. **Pushed to GitHub** (`Dhruvsharma-DSAS/SpaceCode-`, branch main) with only relevant files (186 files, ~28 MB); later changes (items 11–12 and this pack) are local until pushed.


---

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


---

# 10 · Glossary and quick facts

## Terms
| term | meaning |
|---|---|
| Hotspot / hot pixel / detection | one satellite pixel flagged as containing heat at the overpass moment — not a fire, not its size |
| Fire cell-day | 1 if any detection fell in a 0.1° cell on a local solar day (F05); the counting unit |
| 0.1° cell | grid square of 0.1° × 0.1°; ~123.6 km² at the equator, ~106 km² in Punjab (F04) |
| Exposure E | valid observation days of a cell in a month: FireMask 3, 5, 7, 8 or 9 (F09) |
| Exposure rate | fire cell-days ÷ exposure days (F09); null when E = 0 |
| Exchange rate k | VIIRS / MODIS efficiency ratio learned in the overlap years, per stratum, with interval (F10–F18) |
| Stratum | a group the k is learned for: month × day/night × platform pair |
| VIIRS-equivalent (VIIRS-eq) | MODIS-era value converted to VIIRS units: k × MODIS (F12) |
| Harmonised | the calendar on one ruler: VIIRS-eq before 2012, VIIRS observed after |
| Seam | an artificial step where a sensor joins (2012 S-NPP, 2018 NOAA-20, 2023 NOAA-21) |
| Overlap | years both MODIS and VIIRS fly (2012 → MODIS end) — the only time k can be learned |
| LMST | local mean solar time = UTC + longitude/15 (F01); not a national clock |
| NRT / SP | near-real-time (~3 h) vs standard processing (replaces NRT after ~5 months) |
| FRP | fire radiative power in megawatts; raw FRP is not comparable across sensors |
| FireMask | daily per-pixel class in MOD14A1/MYD14A1/VNP14A1 (0–9) |
| MCD64A1 | MODIS monthly 500 m burned-area product; lagged; uses active fire as input |
| B ratio / B flag | burned area per detection vs its own past — a disagreement flag, never a multiplier (F46) |
| Robust z | how unusual a month is vs the same month in other years, on the log rate scale, target year left out (F27) |
| LOYO | leave-one-year-out validation (F36) |
| Placebo seam | testing for a break at random non-sensor years to check the test doesn't invent breaks (F33/F34) |
| Bland–Altman | agreement plot: difference vs mean on log scale (F23) |
| Abstain / UNKNOWN | the source classifier says "not sure" instead of forcing a label |
| Provenance label | one of OFFICIAL DOCUMENTED, SOURCE-DERIVED, RUN / TESTED LOCALLY, SIMULATED DEMO, PROPOSED / UNVALIDATED |
| H3 hex | hexagonal grid cell (resolution 3) used for density columns on the Explorer globe |
| TLE | two-line element set: orbital parameters from CelesTrak used to place satellites |

## Numbers you can quote (with their labels)
| fact | value | label |
|---|---|---|
| FIRMS MODIS record start | 1 Nov 2000 | OFFICIAL DOCUMENTED |
| FIRMS VIIRS S-NPP record start | 20 Jan 2012 | OFFICIAL DOCUMENTED |
| NOAA-20 / NOAA-21 FIRMS start | 1 Apr 2018 / 1 Mar 2023 | OFFICIAL DOCUMENTED |
| S-NPP new-data delivery ends | 2 Nov 2026 | OFFICIAL DOCUMENTED (plan) |
| Terra / Aqua end of science | Feb 2027 / Sep 2027 | OFFICIAL DOCUMENTED (plan) |
| Terra crossing by fall 2022 | ~10:15 (drifted from 10:30) | OFFICIAL DOCUMENTED |
| Pixel at nadir | MODIS ~1 km, VIIRS 375 m | OFFICIAL DOCUMENTED |
| Swath | MODIS 2,330 km, VIIRS ~3,040 km | OFFICIAL DOCUMENTED |
| Punjab gridded area | 50,444 km² | SOURCE-DERIVED |
| Punjab + Haryana + Chandigarh | 94,561 km² | SOURCE-DERIVED |
| Formula audit | 46 formulas: 17 FIX, 19 REVISE, 10 OK | RUN / TESTED LOCALLY |
| Simulation, season error | raw 69.1% → exposure-normalised ~23–24%; band coverage 94.5% | RUN / TESTED LOCALLY (simulated worlds) |
| Late burning in Punjab | >90% of large farm fires after 3 pm in 2024–25 (3% in 2021) | SECONDARY REPORT (iFOREST via Tribune) |
| k | — | PENDING (archive run) |

## FAQ
**Why 0.1°?** Coarse enough to make MODIS and VIIRS comparable (presence per cell-day), fine enough for districts; sensitivity runs at 0.05° and 0.25° are planned.
**Why local days, not UTC days?** A night fire near midnight UTC can belong to the previous or next local day; binning by local day keeps one burning event in one day.
**Why keep platforms separate?** So the 2018 and 2023 platform additions can be tested as seams and the merge rule decided explicitly.
**Why negative binomial, not Poisson?** Fire counts are over-dispersed (more variable than Poisson); NB gives honest intervals.
**Why leave the target year out of the anomaly baseline?** Otherwise an extreme year makes itself look less extreme.
**What does "pending" mean on the site?** The number needs the real FIRMS archive + Earth Engine run; we refuse to show a placeholder number.


---

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


---

