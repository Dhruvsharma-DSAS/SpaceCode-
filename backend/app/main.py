"""FIREWORK CHRONOS API. Every response is {data, meta}. Missing data is never returned as zero."""
import json
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.firms import VALID_SOURCES, get_detections
from app.orbits import NORAD, fetch_tle

app = FastAPI(title="FIREWORK CHRONOS API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=config.ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])


def read_static(name: str) -> dict:
    """Load a static JSON file shipped with the frontend (real reference data or demo fixtures)."""
    path = config.STATIC_DIR / name
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/api/health")
def health() -> dict:
    """Which sources are configured. Reachability is checked lazily by the data routes."""
    sources = read_static("health.json")["data"]["sources"]
    for source in sources:
        if source["auth"] == "FIRMS_MAP_KEY":
            if config.FIRMS_MAP_KEY:
                source["status"] = "CONFIGURED"
            else:
                source["status"] = "MISSING_KEY"
        elif source["auth"] in ["none", ""]:
            source["status"] = "NO_KEY_NEEDED"
        else:
            source["status"] = "NOT_CHECKED"
    return {"data": {"sources": sources}, "meta": {"data_source": "backend config", "firms_live": bool(config.FIRMS_MAP_KEY), "generated_at_utc": now_utc(), "demo": False}}


@app.get("/api/detections")
def detections(source: str = Query("VIIRS_NOAA20_NRT,VIIRS_SNPP_NRT,MODIS_NRT"), area: str = Query("world"), days: int = Query(1, ge=1, le=10)) -> dict:
    """Global or bbox FIRMS detections. Without FIRMS_MAP_KEY returns 503 so the frontend shows its labelled demo fixture."""
    sources = [s.strip() for s in source.split(",") if s.strip() in VALID_SOURCES]
    if not sources:
        raise HTTPException(status_code=422, detail={"field": "source", "allowed": VALID_SOURCES})
    if area != "world":
        parts = area.split(",")
        if len(parts) != 4:
            raise HTTPException(status_code=422, detail={"field": "area", "expected": "world or west,south,east,north"})
    if not config.FIRMS_MAP_KEY:
        raise HTTPException(status_code=503, detail={"status": "UNAVAILABLE", "reason": "FIRMS_MAP_KEY not set"})
    try:
        return get_detections(config.FIRMS_MAP_KEY, sources, area, days, config.MAX_POINTS, config.CACHE_SECONDS)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail={"status": "UNAVAILABLE", "reason": str(error)})


@app.get("/api/satellites")
def satellites() -> dict:
    """Static satellite facts plus real TLEs from CelesTrak when reachable."""
    result = read_static("satellites.json")
    fetched = 0
    for sat in result["data"]:
        try:
            sat["tle"] = fetch_tle(NORAD[sat["id"]])
            fetched = fetched + 1
        except Exception:
            sat["tle"] = None
    result["meta"]["tle_source"] = "CelesTrak GP"
    result["meta"]["tle_fetched"] = fetched
    result["meta"]["generated_at_utc"] = now_utc()
    return result


@app.get("/api/regions")
def regions() -> dict:
    return read_static("regions.json")


@app.get("/api/formulas")
def formulas() -> dict:
    return read_static("formulas.json")


@app.get("/api/calendar/{region}")
def calendar(region: str) -> dict:
    """Serves data/processed/calendar_{region}.json written by the pipeline. 404 until a real run exists."""
    path = config.PROCESSED_DIR / ("calendar_" + region + ".json")
    if not path.exists():
        raise HTTPException(status_code=404, detail={"status": "UNAVAILABLE", "reason": "no processed calendar yet for " + region})
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)
