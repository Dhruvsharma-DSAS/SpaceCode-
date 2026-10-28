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
