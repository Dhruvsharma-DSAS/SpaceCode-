"""NASA FIRMS Area API client.

URL: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}
AREA is 'world' or 'west,south,east,north'. Verified 27 Oct 2026: DAY_RANGE 1-10.
"""
import csv
import io
import random
import time
from datetime import datetime, timezone

import httpx

BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
VALID_SOURCES = ["MODIS_NRT", "MODIS_SP", "VIIRS_SNPP_NRT", "VIIRS_SNPP_SP", "VIIRS_NOAA20_NRT", "VIIRS_NOAA20_SP", "VIIRS_NOAA21_NRT"]
SOURCE_PLATFORM = {"VIIRS_SNPP_NRT": "snpp", "VIIRS_SNPP_SP": "snpp", "VIIRS_NOAA20_NRT": "noaa20", "VIIRS_NOAA20_SP": "noaa20", "VIIRS_NOAA21_NRT": "noaa21"}

_cache: dict = {}


def local_solar_hour(utc_hhmm: str, lon: float) -> float:
    """F01: t_LMST = (t_UTC + lon / 15) mod 24."""
    text = str(utc_hhmm).zfill(4)
    utc = int(text[:2]) + int(text[2:]) / 60.0
    return (utc + lon / 15.0) % 24.0


def platform_of(source: str, satellite: str) -> str:
    """Map FIRMS source + satellite column to our platform id."""
    if source in SOURCE_PLATFORM:
        return SOURCE_PLATFORM[source]
    value = str(satellite).strip().lower()
    if value in ["t", "terra"]:
        return "terra"
    if value in ["a", "aqua"]:
        return "aqua"
    return "terra"


def parse_rows(text: str, source: str, start_id: int) -> list:
    """Turn FIRMS CSV text into the point schema the frontend uses. Keeps sensor-native confidence."""
    points = []
    reader = csv.DictReader(io.StringIO(text))
    sensor = "VIIRS"
    if source.startswith("MODIS"):
        sensor = "MODIS"
    for i, row in enumerate(reader):
        try:
            lat = float(row["latitude"])
            lon = float(row["longitude"])
        except (KeyError, ValueError):
            continue
        frp = row.get("frp", "")
        try:
            frp_value = float(frp)
        except ValueError:
            frp_value = 0.0
        utc = str(row.get("acq_time", "0000")).zfill(4)
        points.append({
            "id": start_id + i,
            "lat": lat,
            "lon": lon,
            "date": row.get("acq_date", ""),
            "utc": utc,
            "lmst": round(local_solar_hour(utc, lon), 2),
            "dn": row.get("daynight", ""),
            "platform": platform_of(source, row.get("satellite", "")),
            "sensor": sensor,
            "frp": frp_value,
            "conf": str(row.get("confidence", "")),
            "cls": "UNKNOWN",
            "country": None,
            "firms_source": source,
            "version": row.get("version", ""),
        })
    return points


def fetch_source(map_key: str, source: str, area: str, days: int) -> str:
    """One FIRMS request with 3 retries and exponential backoff."""
    url = BASE + "/" + map_key + "/" + source + "/" + area + "/" + str(days)
    last_error = None
    for attempt in range(3):
        try:
            response = httpx.get(url, timeout=60)
            response.raise_for_status()
            text = response.text
            if text.startswith("Invalid") or text.startswith("<"):
                raise ValueError(text[:120])
            return text
        except (httpx.HTTPError, ValueError) as error:
            last_error = error
            time.sleep(2 ** attempt)
    raise RuntimeError("FIRMS failed for " + source + ": " + str(last_error))


def get_detections(map_key: str, sources: list, area: str, days: int, max_points: int, cache_seconds: int) -> dict:
    """Fetch several sources, cache for cache_seconds, sample down to max_points. Returns {data, meta}."""
    key = (tuple(sources), area, days)
    now = time.time()
    if key in _cache and now - _cache[key]["t"] < cache_seconds:
        cached = _cache[key]["value"]
        cached["meta"]["status"] = "CACHED"
        return cached
    points = []
    tried = []
    for source in sources:
        text = fetch_source(map_key, source, area, days)
        rows = parse_rows(text, source, len(points) + 1)
        points.extend(rows)
        tried.append({"source": source, "rows": len(rows)})
    total = len(points)
    sampled = False
    if total > max_points:
        rng = random.Random(0)
        points = rng.sample(points, max_points)
        sampled = True
    status = "LIVE_NRT"
    if all(s.endswith("_SP") for s in sources):
        status = "ARCHIVE_STANDARD"
    value = {
        "data": points,
        "meta": {
            "data_source": "NASA FIRMS Area API",
            "provider": "NASA FIRMS",
            "sources": tried,
            "area": area,
            "day_range": days,
            "status": status,
            "provenance": "OFFICIAL_DOCUMENTED",
            "demo": False,
            "fallback_used": False,
            "rows_total": total,
            "sampled": sampled,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "unit": "detections (pixels), not fires",
            "warnings": ["FIRMS detections have limited accuracy; not for protection of life or property."],
            "citation_urls": ["https://firms.modaps.eosdis.nasa.gov/api/area/"],
        },
    }
    _cache[key] = {"t": now, "value": value}
    return value
