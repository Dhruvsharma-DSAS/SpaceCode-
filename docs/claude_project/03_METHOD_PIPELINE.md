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
