# FIREWORK CHRONOS — Claude Project knowledge pack

NASA Space Apps 2026 · Challenge: **Harmonization of MODIS and VIIRS Hot Spots**
Team: Dhruv Sharma and team · Pack written 28 Oct 2026 from the Spacecode 3 code, data and the V2 Research Atlas (27 Oct 2026).
Code: https://github.com/Dhruvsharma-DSAS/SpaceCode-

## What this pack is
Everything about the project in plain Markdown so a Claude Project can answer questions, write speeches and explain formulas, the backend and the data **without inventing anything**. Upload every file in this folder (or just `ALL_IN_ONE.md`).

| file | what is inside |
|---|---|
| 01_PROJECT_OVERVIEW.md | the problem, our answer, four layers, users, why now, what is real vs simulated |
| 02_SCIENCE_AND_SATELLITES.md | how satellites see fire, MODIS vs VIIRS, seams, orbits and time, products, masks, myths |
| 03_METHOD_PIPELINE.md | 9-step pipeline, unified model, combined algorithm, baseline ladder, validation gates, error budget, four layers, R1–R10 |
| 04_FORMULAS_F01_F46.md | all 46 formulas: purpose, equation, inputs, audit verdict, worked example, code, where it appears |
| 05_DATA_SOURCES_AND_DATABASE.md | every data source, the 19 static CSVs, database tables, satellites, regions, claims and conflicts |
| 06_BACKEND_AND_API.md | the FastAPI backend as built, planned API contract, keys, RAG design, automatic briefs |
| 07_WEBSITE_PAGES_AND_DESIGN.md | navigation, every page and its sections, Home 3D flow, Explorer analysis, design system |
| 08_CHANGELOG.md | what was built and changed, in order |
| 09_SPEECH_AND_DEMO.md | 2-minute and 5-minute speech, demo click path, judge Q&A with honest answers |
| 10_GLOSSARY_AND_FAQ.md | terms, quotable numbers with labels, FAQ |
| 11_WHAT_WE_NEED.md | every key, `.env` line, data request and decision still needed — and what each unlocks |
| ALL_IN_ONE.md | all of the above in one file (upload this alone if you prefer one file) |

## Suggested Project instructions (paste into the Claude Project "instructions" box)
> You are the FIREWORK CHRONOS assistant. Answer only from the project files. Every number you say must come from a file and keep its label (OFFICIAL DOCUMENTED, SOURCE-DERIVED, RUN / TESTED LOCALLY, SIMULATED DEMO, PROPOSED / UNVALIDATED). Never present a SIMULATED number as a result. A hotspot is a pixel, not a fire. Missing data is "null / not observed", never zero. The exchange rate k, held-out errors and the B ratio are PENDING until the real archive run. If something is not in the files, say "not in the project files". Explain in simple English; give Hinglish when asked.

## The seven truth rules (from the atlas — never break them)
1. A hotspot is a pixel, not a fire; a cell-day is not burned area; harmonised cell-days are not hectares or biomass.
2. Missing coverage, failed sources and unprocessed months are **null**, never 0.
3. Official documentation and validated runs outrank project PDFs, whatever their date.
4. Formulas are identified by name + equation + version, never by number alone (old chat numbering differs — see aliases in file 04).
5. Every interval states its level (90% or 95%) and whether it is a confidence or predictive band.
6. AI writes words around computed numbers; it never creates or edits a measurement.
7. FIRMS products have limited accuracy; this is research decision support, **not a life-safety alert system**.

## The five provenance labels
| label | meaning |
|---|---|
| OFFICIAL DOCUMENTED | matches a first-party NASA/NOAA/ESA/Earth Engine page or a peer-reviewed paper (URL + access date stored) |
| SOURCE-DERIVED | computed deterministically from an official dataset by project code (e.g. Punjab gridded area 50,444 km²) |
| RUN / TESTED LOCALLY | code executed while making the atlas; if inputs were synthetic it is a property test, not field accuracy |
| SIMULATED DEMO | synthetic numbers for layout, teaching or method tests — never a result about real fires |
| PROPOSED / UNVALIDATED | an idea or method not yet validated on held-out real data |

## Status in one line (28 Oct 2026)
The website, the backend, the static reference database (19 real CSVs), the 46-formula audit and the method design are done. **No real fire numbers exist yet**: the globe dots and calendar on the site are SIMULATED until `FIRMS_MAP_KEY` is added (live dots) and the FIRMS archive + Earth Engine exposure run is done (calendar, k, validation).
