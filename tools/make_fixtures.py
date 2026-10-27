import csv
import json
import math
import random
import sys
from datetime import date, timedelta

import numpy as np
from matplotlib.path import Path

OUT = sys.argv[1] if len(sys.argv) > 1 else "frontend/public/data"
DB = sys.argv[2] if len(sys.argv) > 2 else "data/supabase/csv"
COUNTRIES = json.load(open(OUT + "/countries.json"))["data"]["features"]
RNG = random.Random(26)
END = date(2026, 10, 26)
DAYS = [END - timedelta(days=i) for i in range(6, -1, -1)]

HOTSPOTS = [
    ("Central African savanna", -9, 24, 6, 9, 1800, "WILDLAND"),
    ("Angola and Zambia", -13, 19, 4, 7, 900, "WILDLAND"),
    ("Brazil Cerrado", -12, -48, 5, 6, 700, "WILDLAND"),
    ("Amazon arc of deforestation", -9, -60, 3, 6, 600, "WILDLAND"),
    ("Bolivia and Paraguay Chaco", -18, -61, 3, 3, 300, "WILDLAND"),
    ("Northern Australia", -15, 132, 4, 9, 500, "WILDLAND"),
    ("Punjab and Haryana stubble", 30.5, 75.5, 1.0, 1.4, 650, "AGRICULTURAL"),
    ("Indo-Gangetic plain", 26.5, 82, 1.5, 4, 200, "AGRICULTURAL"),
    ("Mainland Southeast Asia", 18, 101, 3, 4, 150, "AGRICULTURAL"),
    ("Indonesia Kalimantan and Sumatra", -1.5, 108, 2, 5, 220, "WILDLAND"),
    ("California and Pacific Northwest", 40, -121, 3, 2.5, 120, "WILDLAND"),
    ("Mexico and Central America", 17, -92, 2, 4, 90, "AGRICULTURAL"),
    ("Siberian taiga", 60, 115, 5, 14, 160, "WILDLAND"),
    ("Canadian boreal", 56, -110, 4, 12, 90, "WILDLAND"),
    ("Eastern Europe croplands", 49, 33, 2.5, 6, 120, "AGRICULTURAL"),
    ("Sahel", 11, 5, 2.5, 12, 160, "AGRICULTURAL"),
    ("Madagascar", -18, 46, 3, 1.5, 140, "WILDLAND"),
]
FLARES = [
    ("Persian Gulf oil fields", 29.5, 48.0, 1.2, 1.5, 70),
    ("Niger Delta", 5.0, 6.3, 0.8, 0.9, 50),
    ("West Siberian oil fields", 61.5, 74, 1.5, 4, 60),
    ("Permian Basin", 31.8, -103.0, 0.8, 1.0, 45),
    ("Libya and Algeria fields", 29.0, 9.0, 2.0, 4, 35),
    ("North Dakota Bakken", 48.0, -103.3, 0.5, 0.8, 25),
    ("Jamnagar refinery belt", 22.35, 69.9, 0.15, 0.2, 12),
]
PLATFORMS = [("terra", "MODIS", 10.25, 22.25, 0.10), ("aqua", "MODIS", 13.6, 1.6, 0.13), ("snpp", "VIIRS", 13.4, 1.4, 0.26), ("noaa20", "VIIRS", 13.5, 1.5, 0.27), ("noaa21", "VIIRS", 13.45, 1.45, 0.24)]


def country_of(lat, lon):
    for f in COUNTRIES:
        geom = f["geometry"]
        polys = geom["coordinates"]
        if geom["type"] == "Polygon":
            polys = [polys]
        for poly in polys:
            if Path(np.asarray(poly[0])).contains_point((lon, lat)):
                return f["properties"]["name"], f["properties"]["iso3"]
    return None, None


def pick_platform():
    r = RNG.random()
    acc = 0.0
    for p in PLATFORMS:
        acc += p[4]
        if r <= acc:
            return p
    return PLATFORMS[-1]


def make_point(lat, lon, cls, day, pid):
    plat, sensor, day_lmst, night_lmst, _ = pick_platform()
    night = RNG.random() < 0.18
    if cls == "INDUSTRIAL":
        night = RNG.random() < 0.5
    lmst = day_lmst + RNG.gauss(0, 0.35)
    dn = "D"
    if night:
        lmst = night_lmst + RNG.gauss(0, 0.35)
        dn = "N"
    lmst = lmst % 24
    utc = (lmst - lon / 15.0) % 24
    frp = round(math.exp(RNG.gauss(2.4, 1.1)), 1)
    if cls == "INDUSTRIAL":
        frp = round(math.exp(RNG.gauss(3.2, 0.7)), 1)
    if sensor == "MODIS":
        frp = round(frp * 1.8, 1)
        conf = str(int(min(100, max(0, RNG.gauss(70, 18)))))
    else:
        conf = RNG.choices(["l", "n", "h"], [0.15, 0.7, 0.15])[0]
    name, iso3 = country_of(lat, lon)
    return {"id": pid, "lat": round(lat, 4), "lon": round(lon, 4), "date": day.isoformat(), "utc": "%02d%02d" % (int(utc), int((utc % 1) * 60)),
            "lmst": round(lmst, 2), "dn": dn, "platform": plat, "sensor": sensor, "frp": frp, "conf": conf, "cls": cls, "country": name, "iso3": iso3}


def detections():
    pts = []
    pid = 1
    for name, la, lo, sla, slo, n, cls in HOTSPOTS:
        centres = [(RNG.gauss(la, sla * 0.6), RNG.gauss(lo, slo * 0.6)) for _ in range(max(4, n // 40))]
        for i in range(n):
            c = RNG.choice(centres)
            lat = max(-89, min(89, RNG.gauss(c[0], sla * 0.25)))
            lon = ((RNG.gauss(c[1], slo * 0.25) + 180) % 360) - 180
            pts.append(make_point(lat, lon, cls, RNG.choice(DAYS), pid))
            pid += 1
    for name, la, lo, sla, slo, n in FLARES:
        sites = [(RNG.gauss(la, sla * 0.5), RNG.gauss(lo, slo * 0.5)) for _ in range(max(3, n // 6))]
        for day in DAYS:
            for s in sites:
                if RNG.random() < 0.75:
                    pts.append(make_point(s[0] + RNG.gauss(0, 0.004), s[1] + RNG.gauss(0, 0.004), "INDUSTRIAL", day, pid))
                    pid += 1
    for i in range(500):
        lat = RNG.uniform(-35, 55)
        lon = RNG.uniform(-120, 140)
        name, iso3 = country_of(lat, lon)
        if name:
            pts.append(make_point(lat, lon, RNG.choice(["AGRICULTURAL", "WILDLAND", "UNKNOWN"]), RNG.choice(DAYS), pid))
            pid += 1
    return pts


def main():
    pts = detections()
    meta = {"data_source": "SIMULATED fixture (tools/make_fixtures.py, seed 26)", "provenance": "SIMULATED_DEMO", "demo": True, "status": "SIMULATED",
            "unit": "detections (pixels), not fires", "observation_period": [DAYS[0].isoformat(), DAYS[-1].isoformat()],
            "note": "Shape and fields mimic FIRMS NRT; locations are plausible fire regions but every value is synthetic. Replace with /api/detections (FIRMS_MAP_KEY).",
            "fields": {"lat": "deg", "lon": "deg", "date": "UTC date", "utc": "HHMM UTC", "lmst": "local mean solar hour (F01)", "dn": "D/N", "platform": "terra|aqua|snpp|noaa20|noaa21", "sensor": "MODIS|VIIRS", "frp": "MW", "conf": "MODIS 0-100 or VIIRS l/n/h (sensor-native)", "cls": "AGRICULTURAL|WILDLAND|INDUSTRIAL|UNKNOWN (demo label)", "country": "Natural Earth name"}}
    json.dump({"data": pts, "meta": meta}, open(OUT + "/detections_demo.json", "w"), separators=(",", ":"))
    print("detections", len(pts))

    regions = []
    for r in csv.DictReader(open(DB + "/region.csv")):
        regions.append({"id": r["region_id"], "name": r["name"], "country": r["country"], "role": r["role"], "bbox": [float(r["bbox_west"]), float(r["bbox_south"]), float(r["bbox_east"]), float(r["bbox_north"])], "area_km2": float(r["area_km2_gridded"])})
    json.dump({"data": regions, "meta": {"data_source": "Natural Earth 10m admin-1, gridded at 0.1 deg", "provenance": "SOURCE_DERIVED", "demo": False}}, open(OUT + "/regions.json", "w"), indent=1)

    sats = []
    orbit = {"terra": (98.2, 98.9, 705, "descending", 10.25), "aqua": (98.2, 98.8, 705, "ascending", 13.6), "snpp": (98.7, 101.4, 824, "ascending", 13.4), "noaa20": (98.7, 101.4, 824, "ascending", 13.5), "noaa21": (98.7, 101.4, 824, "ascending", 13.45)}
    for r in csv.DictReader(open(DB + "/satellite.csv")):
        inc, period, alt, node, lst = orbit[r["platform_id"]]
        sats.append({"id": r["platform_id"], "name": r["name"], "instrument": r["instrument"], "norad_id": int(r["norad_id"]), "launch": r["launch_date"], "firms_start": r["firms_archive_start"],
                     "crossing": r["nominal_equator_crossing_lst"], "end_plan": r["planned_end_as_of_2026_10_27"], "source_urls": r["source_urls"],
                     "illustrative_orbit": {"inclination_deg": inc, "period_min": period, "altitude_km": alt, "node": node, "equator_lmst_h": lst}})
    json.dump({"data": sats, "meta": {"data_source": "satellite.csv (official facts) + illustrative circular orbits", "provenance": "OFFICIAL_DOCUMENTED", "demo": False,
                                       "note": "Orbit drawing is illustrative (circular sun-synchronous). Use /api/satellites/tle (CelesTrak) + satellite.js for real positions."}}, open(OUT + "/satellites.json", "w"), indent=1)

    sim = json.load(open("data/research/sim_ladder.json"))
    cal = {"years": sim["years"], "modis": sim["example_calendar_M"], "viirs": sim["example_calendar_V"], "exposure_modis": sim["example_E_M"], "exposure_viirs": sim["example_E_V"], "k_demo": 2.45}
    json.dump({"data": cal, "meta": {"data_source": "sim_ladder.py simulated world", "provenance": "SIMULATED_DEMO", "demo": True, "unit": "cell-days per month", "note": "Replace with GET /api/calendar/{region}"}}, open(OUT + "/calendar_demo.json", "w"), separators=(",", ":"))

    health = {"sources": [{"id": d["source_id"], "input": d["input_x"], "role": d["role"], "provider": d["provider"], "endpoint": d["endpoint"], "auth": d["auth_env_var"], "verified_on": d["verified_on"], "status": "UNKNOWN"} for d in csv.DictReader(open(DB + "/data_source.csv"))]}
    json.dump({"data": health, "meta": {"data_source": "data_source.csv", "provenance": "OFFICIAL_DOCUMENTED", "demo": False, "note": "status is filled by GET /api/health"}}, open(OUT + "/health.json", "w"), indent=1)

    forms = []
    for r in csv.DictReader(open(DB + "/formula.csv")):
        forms.append(r)
    json.dump({"data": forms, "meta": {"data_source": "formula registry V2 (27 Oct 2026)", "provenance": "RUN_TESTED_LOCALLY", "demo": False}}, open(OUT + "/formulas.json", "w"), indent=1)


if __name__ == "__main__":
    main()
