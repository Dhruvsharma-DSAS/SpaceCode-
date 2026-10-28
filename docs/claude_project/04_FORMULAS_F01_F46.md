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