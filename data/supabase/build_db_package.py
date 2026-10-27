import csv
import json
import math
import sys
import hashlib
import numpy as np
from matplotlib.path import Path

sys.path.insert(0, "/home/claude/atlas/code/v2")
import chronos_core as core

RAW = "/home/claude/atlas/data/raw/ne_admin1.geojson"
OUT = "/home/claude/atlas/db/csv/"
ACCESSED = "2026-10-27"
NE_URL = "https://github.com/nvkelso/natural-earth-vector (ne_10m_admin_1_states_provinces.geojson, master branch)"
WANT = {"IN-PB": "punjab", "IN-HR": "haryana", "IN-CH": "chandigarh", "IN-DL": "delhi", "US-CA": "california", "BR-MT": "mato_grosso", "AU-NSW": "new_south_wales"}
ROLE = {"punjab": "flagship", "haryana": "flagship", "chandigarh": "flagship", "delhi": "air_quality_context", "california": "global_test", "mato_grosso": "global_test", "new_south_wales": "global_test"}
G = 0.1


def rings_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    return geom["coordinates"]


def write(name, header, rows):
    with open(OUT + name, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for r in rows:
            w.writerow(r)
    print(name, len(rows))


def wkt_polygon(polys):
    parts = []
    for poly in polys:
        rs = []
        for ring in poly:
            rs.append("(" + ",".join("%.5f %.5f" % (x, y) for x, y in ring) + ")")
        parts.append("(" + ",".join(rs) + ")")
    return "SRID=4326;MULTIPOLYGON(" + ",".join(parts) + ")"


d = json.load(open(RAW))
regions = []
cells = {}
region_cells = []
for f in d["features"]:
    p = f["properties"]
    code = p.get("iso_3166_2")
    if code not in WANT:
        continue
    if p.get("name") == "Lord Howe Island":
        continue
    rid = WANT[code]
    polys = rings_of(f["geometry"])
    xs = [pt[0] for poly in polys for pt in poly[0]]
    ys = [pt[1] for poly in polys for pt in poly[0]]
    w, s, e, n = min(xs), min(ys), max(xs), max(ys)
    paths = [Path(np.asarray(poly[0])) for poly in polys]
    holes = [Path(np.asarray(r)) for poly in polys for r in poly[1:]]
    r0 = math.floor(round((s + 90) / G, 9))
    r1 = math.floor(round((n + 90) / G, 9))
    c0 = math.floor(round((w + 180) / G, 9))
    c1 = math.floor(round((e + 180) / G, 9))
    sub = (np.arange(10) + 0.5) / 10.0
    area_region = 0.0
    for row in range(r0, r1 + 1):
        lat_s = -90 + row * G
        cell_area = core.cell_area_km2(lat_s, lat_s + G, G)
        for col in range(c0, c1 + 1):
            lon_w = -180 + col * G
            gx, gy = np.meshgrid(lon_w + sub * G, lat_s + sub * G)
            pts = np.column_stack([gx.ravel(), gy.ravel()])
            inside = np.zeros(len(pts), dtype=bool)
            for pa in paths:
                inside |= pa.contains_points(pts)
            for ho in holes:
                inside &= ~ho.contains_points(pts)
            frac = inside.mean()
            if frac <= 0:
                continue
            cid = "%d_%d" % (row, col)
            if cid not in cells:
                cells[cid] = [cid, row, col, round(lat_s + G / 2, 4), round(lon_w + G / 2, 4), round(cell_area, 3), G,
                              "SRID=4326;POLYGON((%.4f %.4f,%.4f %.4f,%.4f %.4f,%.4f %.4f,%.4f %.4f))" % (lon_w, lat_s, lon_w + G, lat_s, lon_w + G, lat_s + G, lon_w, lat_s + G, lon_w, lat_s)]
            region_cells.append([rid, cid, round(float(frac), 2), round(float(frac) * cell_area, 3)])
            area_region += frac * cell_area
    regions.append([rid, p["name"], p["admin"], code, ROLE[rid], round(w, 4), round(s, 4), round(e, 4), round(n, 4),
                    round(area_region, 1), "Natural Earth 10m admin-1 (de facto boundaries; not an official survey boundary)", NE_URL, ACCESSED, wkt_polygon(polys)])

import os
os.makedirs(OUT, exist_ok=True)
union = {}
for rid, cid, frac, a in region_cells:
    if rid in ("punjab", "haryana", "chandigarh"):
        if cid not in union:
            union[cid] = [0.0, 0.0]
        union[cid][0] += frac
        union[cid][1] += a
ua = 0.0
for cid in union:
    fr = min(1.0, union[cid][0])
    region_cells.append(["punjab_haryana", cid, round(fr, 2), round(union[cid][1], 3)])
    ua += union[cid][1]
regions.append(["punjab_haryana", "Punjab + Haryana + Chandigarh (flagship)", "India", "IN-PB+IN-HR+IN-CH", "flagship", 73.8423, 27.6704, 77.588, 32.5167, round(ua, 1), "union of the three Natural Earth admin-1 polygons", NE_URL, ACCESSED, ""])
write("region.csv", ["region_id", "name", "country", "iso_3166_2", "role", "bbox_west", "bbox_south", "bbox_east", "bbox_north", "area_km2_gridded", "boundary_source", "source_url", "accessed_on", "geom_wkt"], regions)
write("grid_cell.csv", ["cell_id", "row_idx", "col_idx", "center_lat", "center_lon", "area_km2", "size_deg", "geom_wkt"], list(cells.values()))
write("region_cell.csv", ["region_id", "cell_id", "coverage_fraction", "area_in_region_km2"], region_cells)

sat = [
    ["terra", "Terra", "MODIS", 25994, "1999-12-18", "2000-11-01", "~10:30 descending (drifted earlier; ~10:15 by fall 2022)", "Feb 2027 end of science (NASA, 29 Dec 2025); Jan 2027 end of data collection (CAMS, 25 Feb 2026)", "MODIS_SP / MODIS_NRT (Terra+Aqua combined as MODIS C6.1)", "https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/ ; https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system", "OFFICIAL DOCUMENTED"],
    ["aqua", "Aqua", "MODIS", 27424, "2002-05-04", "2002-07-04", "~13:30 ascending (drifting)", "Sep 2027 end of science (NASA); ~Sep 2027 (CAMS)", "MODIS_SP / MODIS_NRT", "https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/", "OFFICIAL DOCUMENTED"],
    ["snpp", "Suomi NPP", "VIIRS", 37849, "2011-10-28", "2012-01-20", "~13:30 ascending", "Delivery of new data ceases 2 Nov 2026 (NASA Earthdata) - future event as of 27 Oct 2026", "VIIRS_SNPP_SP / VIIRS_SNPP_NRT", "https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs ; https://firms.modaps.eosdis.nasa.gov/download/", "OFFICIAL DOCUMENTED"],
    ["noaa20", "NOAA-20 (JPSS-1)", "VIIRS", 43013, "2017-11-18", "2018-04-01", "~13:30 ascending (about half an orbit from S-NPP)", "operational", "VIIRS_NOAA20_SP / VIIRS_NOAA20_NRT", "https://firms.modaps.eosdis.nasa.gov/download/", "OFFICIAL DOCUMENTED"],
    ["noaa21", "NOAA-21 (JPSS-2)", "VIIRS", 54234, "2022-11-10", "2023-03-01", "~13:30 ascending", "operational", "VIIRS_NOAA21_NRT (no SP source listed in Area API on 27 Oct 2026)", "https://firms.modaps.eosdis.nasa.gov/download/ ; https://firms.modaps.eosdis.nasa.gov/api/area/csv", "OFFICIAL DOCUMENTED"],
]
write("satellite.csv", ["platform_id", "name", "instrument", "norad_id", "launch_date", "firms_archive_start", "nominal_equator_crossing_lst", "planned_end_as_of_2026_10_27", "firms_sources", "source_urls", "provenance"], sat)

prod = [
    ["firms_modis_c61", "FIRMS MODIS C6.1 active fire (MCD14ML-derived)", "point (1 km nominal pixel centre)", "2000-11-01", "NRT ~3 h; SP replaces NRT after ~5 months", "latitude, longitude, brightness, bright_t31, scan, track, acq_date, acq_time, satellite, confidence 0-100 (experimental), version, frp, daynight, type (archive)", "https://firms.modaps.eosdis.nasa.gov/download/"],
    ["firms_viirs_375", "FIRMS VIIRS 375 m active fire (VNP14IMG / VJ114IMG / VJ214IMG)", "point (375 m I-band pixel centre)", "2012-01-20", "NRT; SP for S-NPP and NOAA-20", "latitude, longitude, bright_ti4, bright_ti5, scan, track, acq_date, acq_time, satellite, confidence l/n/h, version, frp, daynight", "https://firms.modaps.eosdis.nasa.gov/download/"],
    ["mod14a1_myd14a1", "MODIS MOD14A1/MYD14A1 v061 daily thermal anomaly", "raster 1 km daily", "2000-02-24", "GEE catalogue end date inconsistent on page (2025-10 vs 2026-10)", "FireMask (0-9), MaxFRP, QA (bits 0-1 land/water, bit 2 day/night), sample", "https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD14A1"],
    ["vnp14a1", "VIIRS VNP14A1 v002 daily thermal anomaly", "raster 1 km daily (NOT the 375 m FIRMS points)", "2012-01-19", "GEE catalogue end date inconsistent on page", "FireMask (0-9), MaxFRP, QA, sample", "https://developers.google.com/earth-engine/datasets/catalog/NASA_VIIRS_002_VNP14A1"],
    ["mcd64a1", "MODIS MCD64A1 v061 burned area", "raster 500 m monthly", "2000-11-01", "monthly, lagged; catalogue end date inconsistent", "BurnDate (0 unburned, 1-366 DOY), Uncertainty, QA, FirstDay, LastDay. Inputs include 1 km MODIS active fire -> not independent of hotspots", "https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD64A1"],
]
write("product.csv", ["product_id", "name", "geometry", "record_start", "latency_notes", "key_fields", "source_url"], prod)

fm = [
    ["MOD14A1", 0, "not defined on catalogue page", "exclude", "unknown"], ["MOD14A1", 1, "not processed (obsolete)", "exclude", "unknown"],
    ["MOD14A1", 2, "not processed (other reason)", "exclude", "unknown"], ["MOD14A1", 3, "non-fire water", "exclude_water", "observed_no_fire"],
    ["MOD14A1", 4, "cloud (land or water)", "not_observable", "not_observable"], ["MOD14A1", 5, "non-fire land", "valid", "observed_no_fire"],
    ["MOD14A1", 6, "unknown (land or water)", "exclude", "unknown"], ["MOD14A1", 7, "fire, low confidence", "valid", "fire_low"],
    ["MOD14A1", 8, "fire, nominal confidence", "valid", "fire_nominal"], ["MOD14A1", 9, "fire, high confidence", "valid", "fire_high"],
    ["VNP14A1", 0, "not processed (no/poor data)", "exclude", "unknown"], ["VNP14A1", 1, "not processed (bowtie deletion)", "exclude", "unknown"],
    ["VNP14A1", 2, "unused", "exclude", "unknown"], ["VNP14A1", 3, "water", "exclude_water", "observed_no_fire"],
    ["VNP14A1", 4, "cloud", "not_observable", "not_observable"], ["VNP14A1", 5, "land", "valid", "observed_no_fire"],
    ["VNP14A1", 6, "unclassified", "exclude", "unknown"], ["VNP14A1", 7, "low-confidence fire", "valid", "fire_low"],
    ["VNP14A1", 8, "nominal-confidence fire", "valid", "fire_nominal"], ["VNP14A1", 9, "high-confidence fire", "valid", "fire_high"],
]
write("firemask_class.csv", ["product", "value", "meaning_catalogue_2026_10_27", "exposure_rule_v2", "state"], fm)

labels = [["OFFICIAL_DOCUMENTED", "Matches a first-party NASA/NOAA/ESA/GEE page or peer-reviewed paper; URL + access date stored"],
          ["SOURCE_DERIVED", "Computed deterministically from an official dataset (e.g. cell areas from Natural Earth polygons)"],
          ["RUN_TESTED_LOCALLY", "Code executed here on stated inputs; synthetic unless the input is real"],
          ["SIMULATED_DEMO", "Synthetic numbers for layout or method tests; never a result"],
          ["PROPOSED_UNVALIDATED", "Idea or method not yet validated on held-out real data"]]
write("provenance_label.csv", ["label", "meaning"], labels)

status = [["LIVE_NRT", "FIRMS near-real-time feed fetched in the last 24 h"], ["ARCHIVE_STANDARD", "FIRMS standard processing (SP) archive"], ["CACHED", "last good copy served because the source failed; shows its observation date"], ["SIMULATED", "demo fixture"], ["UNAVAILABLE", "source failed and no cache; value stays null"], ["USER", "user-uploaded data"]]
write("data_status.csv", ["status", "meaning"], status)
