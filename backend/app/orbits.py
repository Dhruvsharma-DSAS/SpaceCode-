"""CelesTrak GP client for real orbital elements (no key needed)."""
import time

import httpx

_cache: dict = {}
CACHE_SECONDS = 6 * 3600

NORAD = {"terra": 25994, "aqua": 27424, "snpp": 37849, "noaa20": 43013, "noaa21": 54234}


def fetch_tle(norad_id: int) -> dict:
    """Return {line1, line2, epoch} from CelesTrak in TLE format."""
    now = time.time()
    if norad_id in _cache and now - _cache[norad_id]["t"] < CACHE_SECONDS:
        return _cache[norad_id]["value"]
    url = "https://celestrak.org/NORAD/elements/gp.php?CATNR=" + str(norad_id) + "&FORMAT=tle"
    response = httpx.get(url, timeout=8)
    response.raise_for_status()
    lines = [line.strip() for line in response.text.strip().splitlines() if line.strip()]
    if len(lines) < 3:
        raise ValueError("unexpected TLE response")
    value = {"name": lines[0], "line1": lines[1], "line2": lines[2]}
    _cache[norad_id] = {"t": now, "value": value}
    return value
