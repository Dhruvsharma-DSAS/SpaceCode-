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
