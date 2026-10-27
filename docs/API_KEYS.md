# API keys — what to add later

Copy `backend/.env.example` to `backend/.env` and fill in only what you have. The site works with **no keys** (demo mode).
Keys go **only** in `backend/.env`. Never in the frontend, a screenshot, a PDF, a commit or a chat log. `.env` is git-ignored.

| variable | unlocks | where to get it | needed for |
|---|---|---|---|
| `FIRMS_MAP_KEY` | live + archive fire detections for the whole Earth | https://firms.modaps.eosdis.nasa.gov/api/map_key/ (free, email) | **M1 — most important** |
| `FIRMS_DAY_RANGE` | default days per request (1–10) | — | M1 |
| `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` | MODIS/VIIRS granules (MOD14A1, VNP14A1, MCD64A1) | https://urs.earthdata.nasa.gov | M3/M5 |
| `EE_PROJECT` | Google Earth Engine exposure (valid observations) | https://code.earthengine.google.com (non-commercial project) | M3/M5 |
| `OPENAQ_API_KEY` | air-quality context | https://explore.openaq.org/register | optional |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `DATABASE_URL` | database | Supabase project → Settings → API | M4 |
| `GROQ_API_KEY` or `GEMINI_API_KEY` | words for the Brief/RAG (never numbers) | console.groq.com / aistudio.google.com | M7, optional |
| `ALLOWED_ORIGINS` | CORS | your frontend URL | deploy |
| `MAX_POINTS` | max dots sent to the globe (default 20000) | — | performance |

No key needed: CelesTrak TLEs, Open-Meteo, NASA POWER, Natural Earth.

Check: `curl http://localhost:8000/api/health` shows each data source and its status.
