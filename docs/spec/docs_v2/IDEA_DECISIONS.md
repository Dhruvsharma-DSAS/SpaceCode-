# IDEA_DECISIONS (KEEP / REVISE / RESEARCH / REJECT)

| idea | origin | decision | note |
|---|---|---|---|
| Harmonised 25-year calendar (month × year) | Strategy L1, Build Spec C | KEEP | core NASA ask; now mask-aware |
| VIIRS-equivalent cell-days as common unit | Strategy, Book 3 | KEEP | plus exposure rate; never 'hectares' |
| Clear-sky / exposure normalisation | Book 5 | KEEP | platform-specific E, FireMask rules |
| Single k = 2.6 for everything | visual guide examples | REJECT | k per stratum with interval |
| Median of monthly ratios as main k | Book 3 | REVISE | kept as robustness baseline B3a |
| Poisson GLM 'confirms' the median | Build Spec F14 | REVISE | it is ratio of totals; use exposure offset |
| Day / night separate k | Book 5 | KEEP | with observed acq_time |
| Empirical Bayes pooling | Book 5 | KEEP | R ≥ 3 guard |
| VIIRS l/n/h = 0.25/0.6/0.9 | FIREWORK repo | REJECT | sensor-native categories |
| Same-confidence slider '0.6 both sensors' | Explorer mock-up | REVISE | rule picker |
| Block bootstrap bands | Book 3 | KEEP | explicit α |
| Robust z on ln(1+x) | Atlas F27 | REVISE | log((F+.5)/(E+1)), LOO |
| Mann–Kendall + Sen + BH | Strategy L4 | KEEP | tie-corrected |
| Pettitt seam test as proof | Validation page | REVISE | plus placebo seams |
| Source attribution crop/forest/industry/unknown | SIH, Strategy L2 | KEEP | abstain ≥ 'unknown' |
| FIS = 0.45T+0.30I+0.15WCS+0.10C | SIH deck | REJECT | uncalibrated hand weights |
| Weather as a class decision input | - | REJECT | context only (FIREWORK rule) |
| Diurnal fraction seen (F45) | Book 5 | REVISE | scenario, union of windows |
| B ratio as 'real burning × B' | 4 Layers PDF | REJECT | flag only |
| Geostationary hourly FRP for India | Strategy L3 | RESEARCH | access unverified (Meteosat IODC, GK-2A, INSAT) |
| Sentinel-3 SLSTR morning continuity | Strategy L5 | RESEARCH | post-Terra morning view |
| Kalman multi-sensor fusion | Book 5 | RESEARCH | experimental tab only |
| Conformal source sets | Book 5 | RESEARCH | needs labelled sites |
| LightGBM + SHAP classifier | Book 3 | RESEARCH | after labels exist |
| LSTM 14-day nowcast | Book 3 | RESEARCH | must beat seasonal naive |
| Realistic three.js Earth on Home only | Atlas Summary | KEEP | approved |
| Concept A v2 Home + Crossing Orbits logo | Final Spec | KEEP | locked |
| Two sensor palettes (Home vs data pages) | Build Spec | REVISE | one palette proposed (C-02) |
| User Data Studio (upload + compare) | Build Spec E | KEEP | USER label, never mixed |
| LLM writes words only | FIREWORK rule | KEEP | citation guard + numeric service |
| Raw FIRMS rows in a vector DB | - | REJECT | numbers come from SQL, not RAG |
| 60 fps at 100k cells claim | Build Spec | RESEARCH | measure before claiming |
| seed/evaluation_metrics.json F1 values | FIREWORK repo | REJECT | impossible F1 > both P and R |
| Punjab–Haryana flagship, global pipeline | user decision | KEEP | + California, Mato Grosso, NSW test regions |
