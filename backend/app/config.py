import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = ROOT / "frontend" / "public" / "data"
PROCESSED_DIR = ROOT / "data" / "processed"

FIRMS_MAP_KEY = os.environ.get("FIRMS_MAP_KEY", "")
FIRMS_DAY_RANGE = int(os.environ.get("FIRMS_DAY_RANGE", "1"))
MAX_POINTS = int(os.environ.get("MAX_POINTS", "20000"))
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
CACHE_SECONDS = 600
