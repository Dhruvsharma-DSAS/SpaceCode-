import math
import numpy as np
from scipy import stats

EARTH_RADIUS_KM = 6371.0088
STATUS_OK = "ok"
STATUS_UNAVAILABLE = "unavailable"
STATUS_INSUFFICIENT = "insufficient_data"


def result(value, status, note=""):
    return {"value": value, "status": status, "note": note}


def local_solar_hour(utc_hour, lon_deg):
    return (utc_hour + lon_deg / 15.0) % 24.0


def cell_index(lat, lon, size):
    if lat < -90 or lat > 90:
        return None
    lon_wrapped = ((lon + 180.0) % 360.0) - 180.0
    if lon == 180.0:
        lon_wrapped = 180.0 - 1e-9
    row = math.floor(round((lat + 90.0) / size, 9))
    col = math.floor(round((lon_wrapped + 180.0) / size, 9))
    max_row = int(round(180.0 / size)) - 1
    max_col = int(round(360.0 / size)) - 1
    if row > max_row:
        row = max_row
    if col > max_col:
        col = max_col
    return row, col


def cell_area_km2(lat_south, lat_north, dlon_deg):
    p1 = math.radians(lat_south)
    p2 = math.radians(lat_north)
    return EARTH_RADIUS_KM ** 2 * math.radians(dlon_deg) * (math.sin(p2) - math.sin(p1))


def cell_area_from_index(row, size):
    lat_s = -90.0 + row * size
    return cell_area_km2(lat_s, lat_s + size, size)


def clear_sky_rate(fire_days, valid_days):
    if valid_days is None:
        return result(None, STATUS_UNAVAILABLE, "no coverage information")
    if valid_days <= 0:
        return result(None, STATUS_UNAVAILABLE, "zero valid observations")
    if fire_days > valid_days:
        return result(None, "invalid", "fire days exceed valid days")
    return result(fire_days / valid_days, STATUS_OK)


def log_rate(fire_days, valid_days):
    if valid_days is None or valid_days <= 0:
        return None
    return math.log((fire_days + 0.5) / (valid_days + 1.0))


def persistence(active_days, observed_days):
    if observed_days is None or observed_days <= 0:
        return result(None, STATUS_UNAVAILABLE, "no observed days")
    return result(active_days / observed_days, STATUS_OK)


def ratio_of_totals(viirs, modis, min_modis_total=5):
    v = float(np.nansum(viirs))
    m = float(np.nansum(modis))
    if m < min_modis_total:
        return result(None, STATUS_INSUFFICIENT, "MODIS total below minimum")
    return result(v / m, STATUS_OK)


def log_ratio_se(v_total, m_total):
    if v_total <= 0 or m_total <= 0:
        return None
    return math.sqrt(1.0 / v_total + 1.0 / m_total)


def ratio_ci_delta(v_total, m_total, alpha=0.05):
    se = log_ratio_se(v_total, m_total)
    if se is None:
        return None
    zq = stats.norm.ppf(1 - alpha / 2)
    k = v_total / m_total
    return k * math.exp(-zq * se), k, k * math.exp(zq * se)


def poisson_offset_k(viirs, modis_exposure):
    v = np.asarray(viirs, dtype=float)
    e = np.asarray(modis_exposure, dtype=float)
    keep = e > 0
    if keep.sum() == 0:
        return None
    return float(v[keep].sum() / e[keep].sum())


def pearson_dispersion(viirs, modis_exposure, k):
    v = np.asarray(viirs, dtype=float)
    e = np.asarray(modis_exposure, dtype=float)
    keep = e > 0
    mu = k * e[keep]
    n = int(keep.sum())
    if n < 2:
        return None
    return float(np.sum((v[keep] - mu) ** 2 / mu) / (n - 1))


def empirical_bayes_log_k(log_k_means, se2_list):
    y = np.asarray(log_k_means, dtype=float)
    s2 = np.asarray(se2_list, dtype=float)
    good = np.isfinite(y) & np.isfinite(s2) & (s2 > 0)
    if good.sum() < 3:
        return None
    y = y[good]
    s2 = s2[good]
    w0 = 1.0 / s2
    mu0 = float(np.sum(w0 * y) / np.sum(w0))
    q = float(np.sum(w0 * (y - mu0) ** 2))
    c = float(np.sum(w0) - np.sum(w0 ** 2) / np.sum(w0))
    tau2 = max(0.0, (q - (len(y) - 1)) / c)
    w_re = 1.0 / (s2 + tau2)
    mu = float(np.sum(w_re * y) / np.sum(w_re))
    weights = tau2 / (tau2 + s2)
    post = weights * y + (1 - weights) * mu
    return {"mu": mu, "tau2": tau2, "weights": weights.tolist(), "posterior": post.tolist()}


def percentile_interval(samples, alpha=0.05):
    arr = np.asarray(samples, dtype=float)
    arr = arr[np.isfinite(arr)]
    if arr.size == 0:
        return None
    lo = float(np.quantile(arr, alpha / 2))
    hi = float(np.quantile(arr, 1 - alpha / 2))
    return lo, hi


def block_bootstrap_ratio(v_by_year, m_by_year, n_boot=2000, alpha=0.05, seed=0):
    v = np.asarray(v_by_year, dtype=float)
    m = np.asarray(m_by_year, dtype=float)
    n = len(v)
    if n < 3:
        return None
    rng = np.random.default_rng(seed)
    out = []
    for b in range(n_boot):
        idx = rng.integers(0, n, n)
        msum = m[idx].sum()
        if msum > 0:
            out.append(v[idx].sum() / msum)
    return percentile_interval(out, alpha)


def garwood_ci(n, alpha=0.05):
    if n < 0:
        return None
    if n == 0:
        lo = 0.0
    else:
        lo = stats.chi2.ppf(alpha / 2, 2 * n) / 2.0
    hi = stats.chi2.ppf(1 - alpha / 2, 2 * (n + 1)) / 2.0
    return float(lo), float(hi)


def robust_z_loo(history, current, sigma_floor=0.15, min_samples=8):
    vals = [h for h in history if h is not None and np.isfinite(h)]
    if len(vals) < min_samples or current is None:
        return result(None, STATUS_INSUFFICIENT, "fewer than " + str(min_samples) + " reference years")
    med = float(np.median(vals))
    mad = float(np.median(np.abs(np.asarray(vals) - med)))
    sigma = 1.4826 * mad
    floor_used = False
    if sigma < sigma_floor:
        sigma = sigma_floor
        floor_used = True
    z = (current - med) / sigma
    note = ""
    if floor_used:
        note = "spread floor used"
    return result(z, STATUS_OK, note)


def mann_kendall_ties(x):
    x = np.asarray(x, dtype=float)
    x = x[np.isfinite(x)]
    n = len(x)
    if n < 4:
        return None
    s = 0
    for i in range(n - 1):
        s += int(np.sum(np.sign(x[i + 1:] - x[i])))
    uniq, counts = np.unique(x, return_counts=True)
    tie_term = float(np.sum(counts * (counts - 1) * (2 * counts + 5)))
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0
    if var_s <= 0:
        return {"S": s, "var": var_s, "z": 0.0, "p": 1.0}
    if s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0
    p = 2 * (1 - stats.norm.cdf(abs(z)))
    return {"S": s, "var": var_s, "z": z, "p": p}


def sen_slope(x):
    x = np.asarray(x, dtype=float)
    n = len(x)
    slopes = []
    for i in range(n - 1):
        for j in range(i + 1, n):
            if np.isfinite(x[i]) and np.isfinite(x[j]):
                slopes.append((x[j] - x[i]) / (j - i))
    if len(slopes) == 0:
        return None
    return float(np.median(slopes))


def benjamini_hochberg(pvalues, alpha=0.05):
    p = np.asarray(pvalues, dtype=float)
    m = len(p)
    order = np.argsort(p)
    ranked = p[order]
    thresh = alpha * (np.arange(1, m + 1) / m)
    passed = np.where(ranked <= thresh)[0]
    reject = np.zeros(m, dtype=bool)
    if len(passed) > 0:
        kmax = passed.max()
        reject[order[:kmax + 1]] = True
    return reject


def pettitt(x):
    x = np.asarray(x, dtype=float)
    n = len(x)
    u = []
    for t in range(n - 1):
        total = 0
        for i in range(t + 1):
            total += int(np.sum(np.sign(x[t + 1:] - x[i])))
        u.append(total)
    u = np.asarray(u)
    t_best = int(np.argmax(np.abs(u)))
    k = float(np.abs(u[t_best]))
    p = 2 * math.exp(-6 * k ** 2 / (n ** 3 + n ** 2))
    if p > 1:
        p = 1.0
    return {"t": t_best, "K": k, "p": p}


def haversine_km(lat1, lon1, lat2, lon2):
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def context_log_ratio(ie, ae):
    if ie is None or ae is None:
        return result(None, STATUS_UNAVAILABLE, "OSM context missing")
    return result(math.log((ie + 1.0) / (ae + 1.0)), STATUS_OK)


def diurnal_seen_union(windows, mu, sigma):
    merged = []
    for start, end in sorted(windows):
        if len(merged) > 0 and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    total = 0.0
    for start, end in merged:
        total += stats.norm.cdf(end, mu, sigma) - stats.norm.cdf(start, mu, sigma)
    return total


def diurnal_seen_naive_sum(windows, mu, sigma):
    total = 0.0
    for start, end in windows:
        total += stats.norm.cdf(end, mu, sigma) - stats.norm.cdf(start, mu, sigma)
    return total


def blindspot_ratio(ba_km2, cell_days, ref_ratios):
    if ba_km2 is None:
        return result(None, "pending", "burned area not yet available")
    if cell_days is None or cell_days <= 0:
        return result(None, STATUS_UNAVAILABLE, "no detections to compare")
    refs = [r for r in ref_ratios if r is not None and np.isfinite(r) and r > 0]
    if len(refs) < 3:
        return result(None, STATUS_INSUFFICIENT, "fewer than 3 reference years")
    return result((ba_km2 / cell_days) / float(np.median(refs)), STATUS_OK, "diagnostic flag, not a correction factor")


def kalman_local_level(z, r, q, x0=None, p0=1e6):
    x = x0
    p = p0
    out = []
    for value in z:
        if x is None:
            if value is None or not np.isfinite(value):
                out.append(None)
                continue
            x = value
            p = r
            out.append(x)
            continue
        p = p + q
        if value is not None and np.isfinite(value):
            gain = p / (p + r)
            x = x + gain * (value - x)
            p = (1 - gain) * p
        out.append(x)
    return out


def bland_altman(a, b):
    d = np.asarray(a, dtype=float) - np.asarray(b, dtype=float)
    mean_d = float(np.mean(d))
    sd = float(np.std(d, ddof=1))
    return {"bias_a_minus_b": mean_d, "loa_low": mean_d - 1.96 * sd, "loa_high": mean_d + 1.96 * sd}


def poisson_deviance(y, mu):
    y = np.asarray(y, dtype=float)
    mu = np.asarray(mu, dtype=float)
    term = np.where(y > 0, y * np.log(np.where(y > 0, y, 1) / mu), 0.0)
    return float(2 * np.sum(term - (y - mu)))


def season_dates(weekly, start_share=0.10, end_share=0.90):
    w = np.asarray(weekly, dtype=float)
    if np.any(~np.isfinite(w)):
        return None
    total = w.sum()
    if total <= 0:
        return None
    c = np.cumsum(w)
    start = int(np.argmax(c >= start_share * total))
    end = int(np.argmax(c >= end_share * total))
    peak = int(np.argmax(w))
    return start, peak, end


def split_conformal_threshold(true_class_probs, alpha=0.1):
    scores = 1 - np.asarray(true_class_probs, dtype=float)
    n = len(scores)
    level = math.ceil((n + 1) * (1 - alpha)) / n
    if level > 1:
        return None
    return float(np.quantile(scores, level, method="higher"))


def calendar_cell(fire_days, valid_days, method_version, source):
    if valid_days is None:
        return {"value": None, "coverage": None, "status": STATUS_UNAVAILABLE, "method": method_version, "source": source}
    if valid_days == 0:
        return {"value": None, "coverage": 0, "status": "not_observable", "method": method_version, "source": source}
    return {"value": fire_days, "coverage": valid_days, "status": STATUS_OK, "method": method_version, "source": source}
