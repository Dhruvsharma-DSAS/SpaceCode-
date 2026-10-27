import csv
import math
import os
import sys
import time
from datetime import date, timedelta
from io import StringIO

import httpx
import pandas as pd

FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
DAY_RANGE = int(os.environ.get("FIRMS_DAY_RANGE", "5"))
GRID = 0.1
OUT = "csv_real"

SOURCE_TO_PLATFORM = {
    "MODIS_SP": None,
    "MODIS_NRT": None,
    "VIIRS_SNPP_SP": "snpp",
    "VIIRS_SNPP_NRT": "snpp",
    "VIIRS_NOAA20_SP": "noaa20",
    "VIIRS_NOAA20_NRT": "noaa20",
    "VIIRS_NOAA21_NRT": "noaa21",
}


def cell_id(lat, lon):
    lon = ((lon + 180.0) % 360.0) - 180.0
    row = math.floor(round((lat + 90.0) / GRID, 9))
    col = math.floor(round((lon + 180.0) / GRID, 9))
    if row > 1799:
        row = 1799
    if col > 3599:
        col = 3599
    return str(row) + "_" + str(col)


def fetch_chunk(map_key, source, bbox, start_day, days):
    url = FIRMS_BASE + "/" + map_key + "/" + source + "/" + bbox + "/" + str(days) + "/" + start_day.isoformat()
    for attempt in range(4):
        try:
            response = httpx.get(url, timeout=60)
            if response.status_code == 429:
                time.sleep(30)
                continue
            response.raise_for_status()
            text = response.text
            if text.strip() == "" or text.startswith("Invalid"):
                print("  empty or invalid:", text[:80])
                return pd.DataFrame()
            return pd.read_csv(StringIO(text))
        except httpx.HTTPError as error:
            print("  retry", attempt, error)
            time.sleep(2 ** attempt)
    raise RuntimeError("FIRMS failed for " + source + " " + start_day.isoformat())


def fetch_range(map_key, source, bbox, first_day, last_day):
    frames = []
    current = first_day
    while current <= last_day:
        remaining = (last_day - current).days + 1
        days = DAY_RANGE
        if remaining < days:
            days = remaining
        frame = fetch_chunk(map_key, source, bbox, current, days)
        if len(frame) > 0:
            frame["firms_source"] = source
            frames.append(frame)
        current = current + timedelta(days=days)
        time.sleep(1.0)
    if len(frames) == 0:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def to_detection_rows(df):
    rows = []
    for _, r in df.iterrows():
        source = r["firms_source"]
        processing = "SP"
        if source.endswith("_NRT"):
            processing = "NRT"
        platform = SOURCE_TO_PLATFORM.get(source)
        if platform is None:
            sat = str(r.get("satellite", "")).strip().lower()
            if sat in ["t", "terra"]:
                platform = "terra"
            elif sat in ["a", "aqua"]:
                platform = "aqua"
            else:
                platform = "unknown_modis"
        if "bright_ti4" in df.columns:
            hi = r.get("bright_ti4")
            lo = r.get("bright_ti5")
        else:
            hi = r.get("brightness")
            lo = r.get("bright_t31")
        firms_type = ""
        if "type" in df.columns:
            firms_type = r.get("type")
        rows.append({
            "platform_id": platform,
            "firms_source": source,
            "processing": processing,
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "acq_date": r["acq_date"],
            "acq_time_utc": str(r["acq_time"]).zfill(4),
            "daynight": r.get("daynight", ""),
            "confidence_raw": r.get("confidence", ""),
            "frp": r.get("frp", ""),
            "scan": r.get("scan", ""),
            "track": r.get("track", ""),
            "bright_hi": hi,
            "bright_lo": lo,
            "firms_type": firms_type,
            "version": r.get("version", ""),
            "cell_id": cell_id(float(r["latitude"]), float(r["longitude"])),
        })
    return pd.DataFrame(rows)


def is_nominal_or_high(platform, conf):
    text = str(conf).strip().lower()
    if platform in ["terra", "aqua", "unknown_modis"]:
        try:
            return float(text) >= 30
        except ValueError:
            return False
    return text in ["n", "h", "nominal", "high"]


def to_cell_days(det):
    det = det.copy()
    det["nh"] = [is_nominal_or_high(p, c) for p, c in zip(det["platform_id"], det["confidence_raw"])]
    det["frp_num"] = pd.to_numeric(det["frp"], errors="coerce")
    grouped = det.groupby(["cell_id", "acq_date", "platform_id", "daynight"]).agg(
        n_detections=("latitude", "size"),
        n_nominal_or_high=("nh", "sum"),
        max_frp=("frp_num", "max"),
    ).reset_index()
    return grouped


def main():
    map_key = os.environ.get("FIRMS_MAP_KEY", "")
    if map_key == "":
        print("Set FIRMS_MAP_KEY first (free: https://firms.modaps.eosdis.nasa.gov/api/map_key/)")
        sys.exit(1)
    bbox = os.environ.get("BBOX", "73.8,27.6,77.6,32.6")
    years = os.environ.get("YEARS", "2012-2025")
    months = os.environ.get("MONTHS", "10-11")
    sources = os.environ.get("SOURCES", "MODIS_SP,VIIRS_SNPP_SP,VIIRS_NOAA20_SP").split(",")
    y0, y1 = [int(x) for x in years.split("-")]
    m0, m1 = [int(x) for x in months.split("-")]
    os.makedirs(OUT, exist_ok=True)
    all_frames = []
    for year in range(y0, y1 + 1):
        first = date(year, m0, 1)
        if m1 == 12:
            last = date(year, 12, 31)
        else:
            last = date(year, m1 + 1, 1) - timedelta(days=1)
        for source in sources:
            if source == "VIIRS_SNPP_SP" and last < date(2012, 1, 20):
                continue
            if source == "VIIRS_NOAA20_SP" and last < date(2018, 4, 1):
                continue
            print(year, source)
            df = fetch_range(map_key, source, bbox, first, last)
            if len(df) > 0:
                all_frames.append(df)
    if len(all_frames) == 0:
        print("No detections returned. Nothing written (an empty result is not a zero-fire result).")
        return
    raw = pd.concat(all_frames, ignore_index=True)
    raw.to_csv(OUT + "/firms_raw_unmodified.csv", index=False)
    det = to_detection_rows(raw)
    det.to_csv(OUT + "/fire_detection.csv", index=False)
    cd = to_cell_days(det)
    cd.to_csv(OUT + "/cell_day.csv", index=False)
    print("fire_detection rows:", len(det), "cell_day rows:", len(cd))
    print("Columns actually returned by FIRMS:", list(raw.columns))


if __name__ == "__main__":
    main()
