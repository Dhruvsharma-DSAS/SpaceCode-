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
