# FIREWORK CHRONOS — Earth fire record (website source)

NASA Space Apps 2026 · Harmonization of MODIS and VIIRS Hot Spots.
A 3D globe of the whole Earth where every satellite fire detection is a visible dot, with satellite tracks, density hexes, a month × year calendar and 13 pages.

## Run it
```bash
# frontend (http://localhost:5173)
cd frontend
npm install
npm run dev

# backend (http://localhost:8000) — optional; without it the site uses demo data
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add keys later, see docs/API_KEYS.md
uvicorn app.main:app --reload --port 8000
pytest
```

## Folder map
```
CLAUDE.md                 rules for Claude Code (read first)
docs/CLAUDE_CODE_PROMPT.md  prompt to paste + milestones
docs/DESIGN.md            design system, globe spec, all pages
docs/DATA.md              static vs dynamic data, schemas
docs/API_KEYS.md          which key unlocks what
docs/spec/                atlas PDF, 46 formula YAMLs, Python reference, research ledgers
design/reference/         approved concept, logo, satellites art
frontend/                 React 19 + Vite 7 + globe.gl (three.js) + satellite.js
frontend/public/img, vid  Home art (Earth crops) and the 4 "How it works" clips, recorded from this site
frontend/public/satellites official NASA 3D models: aqua.glb (MODIS), suomi_npp.glb (VIIRS), terra.glb + credits
frontend/public/draco/    Draco decoder (from three.js) used to open the compressed models
frontend/src/lib/earth3d.js  Home background: 3D Earth (day/night, city lights, clouds) + the two satellites, driven by scroll
frontend/src/styles/      tokens.css (shared tokens) · app.css (data pages) · home.css (Home only)
backend/                  FastAPI: /api/detections, /api/satellites, /api/calendar, /api/health ...
data/supabase/            schema + 19 real static CSVs + fetch scripts
data/research/            simulation ladder + formula audit results
tools/make_fixtures.py    rebuilds frontend/public/data from the CSVs
tools/record_clips.mjs    re-records the 4 Home clips from the running site (headless Chrome + ffmpeg)
                          node tools/record_clips.mjs http://localhost:5173 frontend/public/vid /tmp/clips
```

## Honest labels
Globe dots and calendar values in `frontend/public/data/*_demo.json` are **SIMULATED** and always show the SIMULATED DEMO chip. Add `FIRMS_MAP_KEY` to `backend/.env` and the globe switches to real NASA FIRMS detections (LIVE NRT).
Research decision support — not a life-safety alert system.

Credits: Earth textures NASA Blue Marble / Black Marble (via three-globe examples, MIT), borders Natural Earth, fire data NASA FIRMS.
