import os
import sys

import ee
import pandas as pd

PROJECT = os.environ.get("EE_PROJECT", "")
REGION_BBOX = [float(x) for x in os.environ.get("BBOX", "73.8,27.6,77.6,32.6").split(",")]
YEAR_FROM = int(os.environ.get("YEAR_FROM", "2003"))
YEAR_TO = int(os.environ.get("YEAR_TO", "2025"))
OUT = "csv_real/cell_month_exposure.csv"

PRODUCTS = {
    "terra": "MODIS/061/MOD14A1",
    "aqua": "MODIS/061/MYD14A1",
    "snpp_1km": "NASA/VIIRS/002/VNP14A1",
}


def grid_features(bbox, size):
    west, south, east, north = bbox
    feats = []
    lat = south
    while lat < north - 1e-9:
        lon = west
        while lon < east - 1e-9:
            row = int(round((lat + 90.0) / size))
            col = int(round((lon + 180.0) / size))
            geom = ee.Geometry.Rectangle([lon, lat, lon + size, lat + size])
            feats.append(ee.Feature(geom, {"cell_id": str(row) + "_" + str(col)}))
            lon = lon + size
        lat = lat + size
    return ee.FeatureCollection(feats)


def month_counts(collection_id, year, month, cells):
    start = ee.Date.fromYMD(year, month, 1)
    end = start.advance(1, "month")
    col = ee.ImageCollection(collection_id).filterDate(start, end).select("FireMask")
    valid = col.map(lambda img: img.gte(5).And(img.neq(6)).rename("valid"))
    cloud = col.map(lambda img: img.eq(4).rename("cloud"))
    fire = col.map(lambda img: img.gte(7).rename("fire"))
    stack = valid.sum().addBands(cloud.sum()).addBands(fire.sum())
    reduced = stack.reduceRegions(collection=cells, reducer=ee.Reducer.mean(), scale=1000)
    return reduced


def main():
    if PROJECT == "":
        print("Set EE_PROJECT and run 'earthengine authenticate' first.")
        sys.exit(1)
    ee.Initialize(project=PROJECT)
    cells = grid_features(REGION_BBOX, 0.1)
    rows = []
    for name, cid in PRODUCTS.items():
        for year in range(YEAR_FROM, YEAR_TO + 1):
            if name == "snpp_1km" and year < 2012:
                continue
            for month in range(1, 13):
                fc = month_counts(cid, year, month, cells).getInfo()
                for f in fc["features"]:
                    p = f["properties"]
                    rows.append({
                        "cell_id": p["cell_id"],
                        "month": "%d-%02d-01" % (year, month),
                        "platform_id": name,
                        "valid_obs_days_mean_over_1km_pixels": p.get("valid"),
                        "cloud_days_mean": p.get("cloud"),
                        "fire_days_mean": p.get("fire"),
                        "exposure_product": cid,
                    })
                print(name, year, month)
    os.makedirs("csv_real", exist_ok=True)
    pd.DataFrame(rows).to_csv(OUT, index=False)
    print("written", OUT, len(rows))


if __name__ == "__main__":
    main()
