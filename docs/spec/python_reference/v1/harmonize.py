import math
import pandas as pd

VIIRS_CONFIDENCE = {"l": 0.25, "n": 0.6, "h": 0.9}


def normalise_firms(df, sensor):
    out = pd.DataFrame()
    out["latitude"] = df["latitude"]
    out["longitude"] = df["longitude"]
    out["acq_date"] = pd.to_datetime(df["acq_date"]).dt.date
    out["frp"] = df["frp"]
    if sensor == "MODIS":
        out["brightness_hi"] = df["brightness"]
        out["brightness_lo"] = df["bright_t31"]
        out["confidence"] = df["confidence"].astype(float) / 100.0
    else:
        out["brightness_hi"] = df["bright_ti4"]
        out["brightness_lo"] = df["bright_ti5"]
        conf = []
        for value in df["confidence"]:
            key = str(value).strip().lower()
            if key in VIIRS_CONFIDENCE:
                conf.append(VIIRS_CONFIDENCE[key])
            else:
                conf.append(None)
        out["confidence"] = conf
    out["sensor"] = sensor
    return out


def cell_id(lat, lon, size):
    row = math.floor((lat + 90.0) / size)
    col = math.floor((lon + 180.0) / size)
    return str(row) + "_" + str(col)


def to_cell_days(df, size):
    cells = []
    for lat, lon in zip(df["latitude"], df["longitude"]):
        cells.append(cell_id(lat, lon, size))
    temp = df.copy()
    temp["cell"] = cells
    unique = temp[["cell", "acq_date", "sensor"]].drop_duplicates()
    return unique


def monthly_counts(cell_days):
    temp = cell_days.copy()
    dates = pd.to_datetime(temp["acq_date"])
    temp["year"] = dates.dt.year
    temp["month"] = dates.dt.month
    grouped = temp.groupby(["sensor", "year", "month"]).size().reset_index(name="cell_days")
    return grouped


def overlap_ratio(modis_counts, viirs_counts):
    ratios = []
    for m, v in zip(modis_counts, viirs_counts):
        if m > 0:
            ratios.append(v / m)
    if len(ratios) == 0:
        return None
    ratios.sort()
    n = len(ratios)
    if n % 2 == 1:
        return ratios[n // 2]
    return (ratios[n // 2 - 1] + ratios[n // 2]) / 2.0


def shrink_ratio(k_local, n_local, k_global, n0):
    if k_local is None:
        return k_global
    return (n_local * k_local + n0 * k_global) / (n_local + n0)


def harmonise_modis(modis_value, k):
    return modis_value * k


def seam_ratio(before, after_raw, after_harmonised):
    raw_jump = abs(after_raw - before)
    new_jump = abs(after_harmonised - before)
    if raw_jump == 0:
        return 0.0
    return new_jump / raw_jump


def robust_z(history, current, sigma_floor=0.15, min_samples=10):
    if len(history) < min_samples:
        return None
    logs = []
    for h in history:
        logs.append(math.log1p(h))
    logs.sort()
    n = len(logs)
    if n % 2 == 1:
        med = logs[n // 2]
    else:
        med = (logs[n // 2 - 1] + logs[n // 2]) / 2.0
    deviations = []
    for value in logs:
        deviations.append(abs(value - med))
    deviations.sort()
    if n % 2 == 1:
        mad = deviations[n // 2]
    else:
        mad = (deviations[n // 2 - 1] + deviations[n // 2]) / 2.0
    sigma = 1.4826 * mad
    if sigma < sigma_floor:
        sigma = sigma_floor
    return (math.log1p(current) - med) / sigma


def mann_kendall(values):
    n = len(values)
    s = 0
    for i in range(n - 1):
        for j in range(i + 1, n):
            diff = values[j] - values[i]
            if diff > 0:
                s = s + 1
            elif diff < 0:
                s = s - 1
    var_s = n * (n - 1) * (2 * n + 5) / 18.0
    if s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0
    p = 2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2))))
    return s, z, p


def sen_slope(values):
    slopes = []
    n = len(values)
    for i in range(n - 1):
        for j in range(i + 1, n):
            slopes.append((values[j] - values[i]) / (j - i))
    slopes.sort()
    m = len(slopes)
    if m % 2 == 1:
        return slopes[m // 2]
    return (slopes[m // 2 - 1] + slopes[m // 2]) / 2.0


def persistence(active_days, total_days):
    if total_days == 0:
        return 0.0
    return active_days / total_days


def l_context(ie, ae):
    return math.log((ie + 1.0) / (ae + 1.0))
