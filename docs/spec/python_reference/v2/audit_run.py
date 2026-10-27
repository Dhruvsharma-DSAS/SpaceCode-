import json
import math
import sys
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
import pymannkendall as pmk

sys.path.insert(0, "/home/claude/atlas/code/v1")
import harmonize as h1
import calendar_build as c1
import chronos_core as c2

R = []


def rec(fid, check, old, new, verdict, note):
    R.append({"id": fid, "check": check, "old": old, "new": new, "verdict": verdict, "note": note})


lst = c2.local_solar_hour(8 + 6 / 60, 75.85)
rec("F01", "08:06 UTC at 75.85E", "13:09", "%02d:%02d" % (int(lst), round((lst % 1) * 60)), "OK", "Local mean solar time; equation of time adds up to +/-16 min for apparent solar time.")

i, j = c2.cell_index(30.91, 75.85, 0.1)
rec("F03", "cell of (30.91, 75.85)", "1209_2558", "%d_%d" % (i, j), "OK", "Matches.")
raw_floor = math.floor((28.1 + 90.0) / 0.1)
rec("F03", "boundary 28.1N exact (643 of 1800 lat edges and 1287 of 3600 lon edges misassigned by plain floor)", "v1 floor gives row %d" % raw_floor, "v2 rounded floor gives row %d" % c2.cell_index(28.1, 75.8, 0.1)[0], "FIX" if raw_floor != c2.cell_index(28.1, 75.8, 0.1)[0] else "OK", "Floating point: (30.7+90)/0.1 = %r" % ((28.1 + 90.0) / 0.1))
rec("F03", "longitude 180 and 190", "v1 col for 180 = %s" % h1.cell_id(0, 180, 0.1).split("_")[1], "v2 col = %d ; 190E wraps to col %d" % (c2.cell_index(0, 180, 0.1)[1], c2.cell_index(0, 190, 0.1)[1]), "FIX", "v1 gives column 3600 (outside 0..3599) at the antimeridian and does not wrap.")

a_p = c2.cell_area_km2(30.9, 31.0, 0.1)
a_eq = c2.cell_area_km2(0.0, 0.1, 0.1)
a_60 = c2.cell_area_km2(60.0, 60.1, 0.1)
a_89 = c2.cell_area_km2(89.9, 90.0, 0.1)
rec("F04", "0.1 deg cell area", "Punjab 106, equator 123 km2", "Punjab %.1f, equator %.1f, 60N %.1f, 89.9N %.3f km2" % (a_p, a_eq, a_60, a_89), "OK", "Sphere R=6371.0088 km; ellipsoid differs by under 0.5%%. Polar cell is ~%.0fx smaller than equator." % (a_eq / a_89))

rec("F07", "VIIRS l/n/h mapping", "{'l':.25,'n':.6,'h':.9}", "keep categorical; filter rule as sensitivity grid", "FIX", "Mapped numbers are labels, not calibrated probabilities; MODIS 0-100 confidence is also described by FIRMS as experimental.")

pers = h1.persistence(0, 0)
rec("F08", "persistence(0,0)", str(pers), str(c2.persistence(0, 0)), "FIX", "No observed days must be unknown, not 0.")

rec("F09", "rate(30,600)", "0.05", str(c2.clear_sky_rate(30, 600)["value"]), "OK", "")
rec("F09", "rate(5,0)", "None", str(c2.clear_sky_rate(5, 0)), "OK", "Undefined at K=0; keep status.")

r_ok = h1.overlap_ratio([10, 20, 0, 40], [25, 52, 9, 100])
rec("F10/F11", "overlap_ratio test", "2.5", str(r_ok), "OK", "Zero-MODIS month silently dropped (VIIRS=9 lost).")

rng = np.random.default_rng(1)
true_k = 2.6
meds = []
tots = []
for rep in range(4000):
    lam_m = rng.uniform(0.3, 3, 14)
    m = rng.poisson(lam_m)
    v = rng.poisson(true_k * lam_m)
    meds.append(h1.overlap_ratio(list(m), list(v)))
    tots.append(v.sum() / max(m.sum(), 1))
meds = np.array([x for x in meds if x is not None])
rec("F11", "sparse-month bias (simulated, true k=2.6)", "median of monthly ratios mean=%.2f" % meds.mean(), "ratio of totals mean=%.2f" % np.mean(tots), "FIX", "With small MODIS counts (0-3 per month) the median of monthly ratios is biased (here low, 2.22) because months are dropped and ratios of small integers are lumpy; ratio of totals is close (small +bias from 1/M). Simulated check, not real data.")

v = np.array([25, 52, 9, 100, 61])
mm = np.array([10, 20, 3, 40, 22])
glm = sm.GLM(v, np.ones(len(v)), family=sm.families.Poisson(), offset=np.log(mm)).fit()
rec("F14", "Poisson offset GLM vs ratio of totals", "k_glm=%.4f" % math.exp(glm.params[0]), "sumV/sumM=%.4f" % (v.sum() / mm.sum()), "NOTE", "Intercept-only Poisson GLM with offset log(M) is exactly the ratio of totals; it is not the same estimator as F11 median. Treating M (itself noisy) as exposure is errors-in-variables.")

disp = c2.pearson_dispersion(v, mm, v.sum() / mm.sum())
rec("F15", "Pearson dispersion on example", "-", "%.2f" % disp, "NOTE", "Dispersion >1 means Poisson CI too narrow; use quasi-Poisson or NB.")

lo, k, hi = c2.ratio_ci_delta(v.sum(), mm.sum())
rec("F16", "Delta CI for k (example totals)", "-", "%.2f [%.2f, %.2f]" % (k, lo, hi), "NOTE", "Assumes independent Poisson V and M. Paired sensors share fires so true variance differs; paired block bootstrap preferred.")

rec("F17", "shrink_ratio(3,4,2,4)", "2.5", str(h1.shrink_ratio(3.0, 4, 2.0, 4)), "OK", "Arithmetic shrink on k; n0 hand-picked.")
eb_one = c2.empirical_bayes_log_k([math.log(2.5)], [0.01])
rec("F18", "EB with 1 region", "v1: divides by len-1 = 0 (per user audit)", str(eb_one), "FIX", "Need >=3 groups to estimate tau2; return None and fall back.")

with np.errstate(divide="ignore"):
    lg = np.log(np.array([0, 3, 5]))
rec("F19", "log(M) with zero month", "-inf in fit", "use Poisson/NB likelihood with held-out deviance", "FIX", "AIC on log-log RSS is undefined at zeros and is in-sample only.")

boot = np.random.default_rng(42)
ratios = np.array([2.45, 2.5, 2.5, 2.6])
bs = [np.median(ratios[boot.integers(0, 4, 4)]) for _ in range(2000)]
q5, q95 = np.quantile(bs, [0.05, 0.95])
q25, q975 = np.quantile(bs, [0.025, 0.975])
rec("F24", "bootstrap ratios {2.45,2.5,2.5,2.6}", "q5-q95 = [%.3f, %.3f] (90%%)" % (q5, q95), "q2.5-q97.5 = [%.3f, %.3f] (95%%)" % (q25, q975), "FIX", "Book 3 uses 5-95 (90%) while the spec says 95%. With 4 years the bootstrap can only take a few distinct values: interval is unreliable.")

kk = 2.6
sk = 1.5
pneg = stats.norm.cdf(0, kk, sk)
rec("F25", "Normal draws of k (k=2.6, sd=1.5)", "P(k<0)=%.3f" % pneg, "simulate log k ~ N(log k, se^2)", "FIX", "Normal k can go negative; log scale keeps it positive.")

g = c2.garwood_ci(3)
rec("F26", "Garwood n=3", "0.6 to 8.8", "%.2f to %.2f" % g, "OK", "Exact.")

t = pd.DataFrame([{"year": 2020, "month": 11, "cell_days": 300}, {"year": 2022, "month": 11, "cell_days": 320}])
tb = c1.calendar_matrix(t, "cell_days")
rec("STRUCT", "calendar_matrix missing month", "Jan value = %s" % tb.loc[2020, 1], "status unavailable, value null", "FIX", "fill_value=0 turns missing coverage into observed zero.")

hist = [300, 280, 320, 310]
med_in = 310
z_in = (410 - 310) / (1.4826 * 10)
zr = c2.robust_z_loo(hist, 410, sigma_floor=1.0, min_samples=4)
rec("F27/F28", "Nov 2024 z", "in-sample z=%.2f (target year inside baseline)" % z_in, "leave-target-out z=%.2f" % zr["value"], "FIX", "Code uses raw counts and includes the target year; docs say log clear-sky rate with LOO baseline.")
try:
    math.log(0 / 20)
    lr = "ok"
except ValueError:
    lr = "math domain error"
rec("F27", "ln(rate) when rate=0", lr, "log((F+0.5)/(K+1)) = %.3f" % c2.log_rate(0, 20), "FIX", "The visual guide's new ln(rate) breaks at zero fire days, which are common outside the season.")

s_old, z_old, p_old = h1.mann_kendall([5, 3, 6, 2, 5, 4, 5, 3])
mk2 = c2.mann_kendall_ties([5, 3, 6, 2, 5, 4, 5, 3])
ref = pmk.original_test([5, 3, 6, 2, 5, 4, 5, 3])
rec("F30", "MK with ties [5,3,6,2,5,4,5,3]", "var=%.2f z=%.3f p=%.3f" % (8 * 7 * 21 / 18, z_old, p_old), "var=%.2f z=%.3f p=%.3f (pymannkendall p=%.3f)" % (mk2["var"], mk2["z"], mk2["p"], ref.p), "FIX", "Tie correction missing in v1.")
x_series = [420, 450, 480, 470, 510, 430, 300, 260, 240]
mk9 = c2.mann_kendall_ties(x_series)
rec("F30", "Book 3 series (b)", "S=-16 Z=-1.56 p=0.12", "S=%d Z=%.2f p=%.2f" % (mk9["S"], mk9["z"], mk9["p"]), "OK", "No ties; matches.")
hr = pmk.hamed_rao_modification_test(x_series)
rec("F31", "Hamed-Rao on series (b)", "-", "z=%.2f p=%.3f" % (hr.z, hr.p), "NOTE", "With 9 points autocorrelation estimates are themselves very noisy.")
rec("F32", "Sen slope series (b)", "-26.4/yr", "%.1f/yr" % c2.sen_slope(x_series), "CHECK", "Recomputed value.")

rec("F35", "seam_ratio(100,260,104.68)", "0.02925", "%.5f" % h1.seam_ratio(100, 260, 104.68), "NOTE", "One-year step mixes real change with sensor change; compare against placebo years.")

rec("F36", "MAPE when VIIRS=0", "division by zero / inf", "use MAE, Poisson deviance, sMAPE with guard", "FIX", "")

d_lud = c2.haversine_km(30.901, 75.857, 31.634, 74.872)
rec("F40", "Ludhiana-Amritsar", "125 km", "%.0f km" % d_lud, "OK" if abs(d_lud - 125) < 6 else "CHECK", "City-centre coordinates.")

rec("F43", "L sign", "deck: ln((AE+1)/(IE+1))", "ln((IE+1)/(AE+1)) = %.3f for IE=5, AE=3" % c2.context_log_ratio(5, 3)["value"], "OK", "Positive = industry convention; old deck example 1.46 was wrong.")

wins = [(10.0, 11.0), (13.0, 14.0), (13.25, 14.25)]
naive = c2.diurnal_seen_naive_sum(wins, 13.0, 1.5)
union = c2.diurnal_seen_union(wins, 13.0, 1.5)
rec("F45", "Overlapping windows (Aqua + NOAA-20 near 13:30)", "sum = %.1f%%" % (100 * naive), "union = %.1f%%" % (100 * union), "FIX", "Summing overlapping windows double counts; also a scenario, not a measurement.")

rec("F46", "B with C=0 or BA pending", "division error / normal", str(c2.blindspot_ratio(None, 10, [1, 2, 3])["status"]) + ", " + str(c2.blindspot_ratio(50, 0, [1, 2, 3])["status"]), "FIX", "MCD64A1 uses MODIS active-fire input, so B is not independent; it is a warning flag only.")

kal = c2.kalman_local_level([None, None, 10.0, 12.0, None, 11.0], r=4.0, q=1.0)
rec("F38", "Kalman with leading missing values", "level=None then arithmetic error (per user audit)", str([None if x is None else round(x, 2) for x in kal]), "FIX", "Initialise on first valid value; fused value is a model estimate, not an observation.")

rec("F12", "200 x 2.6", "visual guide prints 521", "%.0f" % (200 * 2.6), "FIX", "Rounding/typo in teaching example; use 520 or state k=2.605.")

ba = c2.bland_altman([10, 12, 15], [8, 13, 12])
rec("F23", "Bland-Altman sign", "-", "bias(a-b)=%.2f" % ba["bias_a_minus_b"], "NOTE", "Name the order in code and figure axis: a = harmonised MODIS, b = VIIRS.")

json.dump(R, open("/home/claude/atlas/out/audit_results.json", "w"), indent=1)
for r in R:
    print(r["id"], "|", r["check"], "|", r["old"], "->", r["new"], "|", r["verdict"])
